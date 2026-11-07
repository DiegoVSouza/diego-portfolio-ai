#!/usr/bin/env python3
"""Rebuild a GLB keeping only the bytes something still uses, and drop UV sets the palette material never reads.

scripts/glb_bake_palette.py removes the texture from the JSON but leaves its bytes in the binary chunk (a 190-triangle bollard
came out at 8 MB). This pass keeps the bufferViews that accessors reference, packs them with 4-byte alignment, and removes
TEXCOORD_n attributes (the site draws with vertex colours, not textures).

Usage: compact_glb.py in.glb out.glb
"""
import json
import struct
import sys

MAGIC, JSON_CHUNK, BIN_CHUNK = 0x46546C67, 0x4E4F534A, 0x004E4942


def read(path):
    data = open(path, "rb").read()
    magic, version, length = struct.unpack_from("<III", data, 0)
    if magic != MAGIC or version != 2 or length != len(data):
        raise SystemExit(f"{path}: not a GLB 2.0 file")
    doc, blob, offset = None, b"", 12
    while offset < length:
        size, kind = struct.unpack_from("<II", data, offset)
        body = data[offset + 8 : offset + 8 + size]
        if kind == JSON_CHUNK:
            doc = json.loads(body)
        elif kind == BIN_CHUNK:
            blob = body
        offset += 8 + size
    return doc, blob


def main():
    source, target = sys.argv[1], sys.argv[2]
    doc, blob = read(source)
    for mesh in doc.get("meshes", []):
        for prim in mesh["primitives"]:
            for name in [a for a in prim["attributes"] if a.startswith("TEXCOORD_")]:
                del prim["attributes"][name]
    # Accessors nothing refers to any more are dropped too; everything is renumbered.
    used = set()
    for mesh in doc.get("meshes", []):
        for prim in mesh["primitives"]:
            used.update(prim["attributes"].values())
            if "indices" in prim:
                used.add(prim["indices"])
            for tgt in prim.get("targets", []):
                used.update(tgt.values())
    for skin in doc.get("skins", []):
        if "inverseBindMatrices" in skin:
            used.add(skin["inverseBindMatrices"])
    for anim in doc.get("animations", []):
        used.update(s["input"] for s in anim["samplers"])
        used.update(s["output"] for s in anim["samplers"])
    accessor_map = {old: new for new, old in enumerate(sorted(used))}
    accessors = [doc["accessors"][old] for old in sorted(used)]
    views, new_blob, view_map = [], bytearray(), {}
    for acc in accessors:
        if "bufferView" not in acc:
            continue
        old = acc["bufferView"]
        if old not in view_map:
            view = dict(doc["bufferViews"][old])
            start = view.get("byteOffset", 0)
            while len(new_blob) % 4:
                new_blob.append(0)
            view["byteOffset"] = len(new_blob)
            new_blob += blob[start : start + view["byteLength"]]
            view_map[old] = len(views)
            views.append(view)
        acc["bufferView"] = view_map[old]
    for mesh in doc.get("meshes", []):
        for prim in mesh["primitives"]:
            prim["attributes"] = {k: accessor_map[v] for k, v in prim["attributes"].items()}
            if "indices" in prim:
                prim["indices"] = accessor_map[prim["indices"]]
            if "targets" in prim:
                prim["targets"] = [{k: accessor_map[v] for k, v in t.items()} for t in prim["targets"]]
    for skin in doc.get("skins", []):
        if "inverseBindMatrices" in skin:
            skin["inverseBindMatrices"] = accessor_map[skin["inverseBindMatrices"]]
    for anim in doc.get("animations", []):
        for s in anim["samplers"]:
            s["input"], s["output"] = accessor_map[s["input"]], accessor_map[s["output"]]
    doc["accessors"], doc["bufferViews"] = accessors, views
    while len(new_blob) % 4:
        new_blob.append(0)
    doc["buffers"] = [{"byteLength": len(new_blob)}]
    pad = lambda b, fill: b + fill * (-len(b) % 4)
    out = [(JSON_CHUNK, pad(json.dumps(doc, separators=(",", ":")).encode(), b" ")), (BIN_CHUNK, bytes(new_blob))]
    total = 12 + sum(8 + len(b) for _, b in out)
    with open(target, "wb") as f:
        f.write(struct.pack("<III", MAGIC, 2, total))
        for kind, body in out:
            f.write(struct.pack("<II", len(body), kind) + body)
    print(f"{target}: {total} bytes (was {len(blob)} in the binary chunk, now {len(new_blob)})")


main()
