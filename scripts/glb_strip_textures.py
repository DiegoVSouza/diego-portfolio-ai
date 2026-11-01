#!/usr/bin/env python3
"""Remove textures and images from a GLB so it carries geometry and colour only.

The site's CSP has no `blob:` in `img-src`, and the scene colours every instance itself (flat, toon-shaded), so the
model textures are dead weight and a CSP risk. Usage: glb_strip_textures.py in.glb out.glb
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
    chunks, offset = [], 12
    while offset < length:
        size, kind = struct.unpack_from("<II", data, offset)
        chunks.append((kind, data[offset + 8 : offset + 8 + size]))
        offset += 8 + size
    return chunks


def strip(doc):
    doc.pop("images", None)
    doc.pop("textures", None)
    doc.pop("samplers", None)
    for material in doc.get("materials", []):
        pbr = material.get("pbrMetallicRoughness", {})
        for key in ("baseColorTexture", "metallicRoughnessTexture"):
            pbr.pop(key, None)
        for key in ("normalTexture", "occlusionTexture", "emissiveTexture"):
            material.pop(key, None)
        material.pop("extensions", None)
    used = [e for e in doc.get("extensionsUsed", []) if e != "KHR_texture_transform"]
    if used:
        doc["extensionsUsed"] = used
    else:
        doc.pop("extensionsUsed", None)
    return doc


def pad(blob, fill):
    return blob + fill * (-len(blob) % 4)


def main():
    source, target = sys.argv[1], sys.argv[2]
    chunks = read(source)
    out = []
    for kind, body in chunks:
        if kind == JSON_CHUNK:
            body = pad(json.dumps(strip(json.loads(body)), separators=(",", ":")).encode(), b" ")
        else:
            body = pad(body, b"\x00")
        out.append((kind, body))
    total = 12 + sum(8 + len(b) for _, b in out)
    with open(target, "wb") as f:
        f.write(struct.pack("<III", MAGIC, 2, total))
        for kind, body in out:
            f.write(struct.pack("<II", len(body), kind) + body)
    print(f"{target}: {total} bytes")


if __name__ == "__main__":
    main()
