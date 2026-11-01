#!/usr/bin/env python3
"""Turn a Kenney palette-textured GLB into a texture-free GLB with a baked palette role per vertex.

The site's CSP has no `blob:` in `img-src`, so a model cannot carry its texture, and a colour literal from a model would break the design-system rule
(every colour comes from a token). So each vertex samples the model's colormap once, here, and keeps two numbers instead of a colour:
  COLOR_0 = (lightness, accent, 0): lightness 0..1 of the swatch, accent 1 for red-dominant swatches (the stripe, the lights).
At runtime a material mixes the tokens with them (ink to paper by lightness, then to the accent colour). Textures and UVs are dropped.

Usage: glb_bake_palette.py in.glb out.glb
"""
import io
import json
import os
import struct
import sys

from PIL import Image

MAGIC, JSON_CHUNK, BIN_CHUNK = 0x46546C67, 0x4E4F534A, 0x004E4942
FLOAT = 5126


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


def pad(blob, fill):
    return blob + fill * (-len(blob) % 4)


def accessor_floats(doc, blob, index):
    acc = doc["accessors"][index]
    if acc["componentType"] != FLOAT:
        raise SystemExit("expected float accessors")
    view = doc["bufferViews"][acc["bufferView"]]
    width = {"SCALAR": 1, "VEC2": 2, "VEC3": 3}[acc["type"]]
    stride = view.get("byteStride") or width * 4
    base = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
    return [struct.unpack_from("<" + "f" * width, blob, base + i * stride) for i in range(acc["count"])]


def main():
    source, target = sys.argv[1], sys.argv[2]
    chunks = read(source)
    doc = json.loads(next(b for k, b in chunks if k == JSON_CHUNK))
    blob = bytearray(next(b for k, b in chunks if k == BIN_CHUNK))
    image = doc["images"][0]
    if "bufferView" in image:
        view = doc["bufferViews"][image["bufferView"]]
        swatches = Image.open(io.BytesIO(bytes(blob[view.get("byteOffset", 0) : view.get("byteOffset", 0) + view["byteLength"]]))).convert("RGB")
    else:
        # Kenney's GLB files point at Textures/colormap.png next to them.
        swatches = Image.open(os.path.join(os.path.dirname(source), image["uri"])).convert("RGB")
    w, h = swatches.size
    done = {}
    for mesh in doc["meshes"]:
        for prim in mesh["primitives"]:
            uv_index = prim["attributes"]["TEXCOORD_0"]
            if uv_index not in done:
                values = bytearray()
                for u, v in accessor_floats(doc, bytes(blob), uv_index):
                    r, g, b = swatches.getpixel((min(w - 1, max(0, int(u * w))), min(h - 1, max(0, int(v * h)))))
                    light = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
                    accent = 1.0 if r > 140 and g < 0.62 * r and b < 0.62 * r else 0.0
                    values += struct.pack("<fff", light, accent, 0.0)
                while len(blob) % 4:
                    blob.append(0)
                doc["bufferViews"].append({"buffer": 0, "byteOffset": len(blob), "byteLength": len(values)})
                blob += values
                doc["accessors"].append({"bufferView": len(doc["bufferViews"]) - 1, "componentType": FLOAT, "count": len(values) // 12, "type": "VEC3"})
                done[uv_index] = len(doc["accessors"]) - 1
            prim["attributes"]["COLOR_0"] = done[uv_index]
            del prim["attributes"]["TEXCOORD_0"]
    for key in ("images", "textures", "samplers"):
        doc.pop(key, None)
    for material in doc.get("materials", []):
        pbr = material.get("pbrMetallicRoughness", {})
        for key in ("baseColorTexture", "metallicRoughnessTexture"):
            pbr.pop(key, None)
        for key in ("normalTexture", "occlusionTexture", "emissiveTexture"):
            material.pop(key, None)
    doc["buffers"][0]["byteLength"] = len(blob)
    out = [(JSON_CHUNK, pad(json.dumps(doc, separators=(",", ":")).encode(), b" ")), (BIN_CHUNK, pad(bytes(blob), b"\x00"))]
    total = 12 + sum(8 + len(b) for _, b in out)
    with open(target, "wb") as f:
        f.write(struct.pack("<III", MAGIC, 2, total))
        for kind, body in out:
            f.write(struct.pack("<II", len(body), kind) + body)
    print(f"{target}: {total} bytes")


if __name__ == "__main__":
    main()
