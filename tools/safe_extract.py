#!/usr/bin/env python3
"""Extract a ZIP into isolated staging while rejecting traversal and links."""
import argparse
import pathlib
import shutil
import stat
import zipfile


def safe_extract(archive: pathlib.Path, destination: pathlib.Path, max_files: int, max_bytes: int) -> int:
    destination = destination.resolve()
    destination.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive) as zf:
        infos = zf.infolist()
        files = [entry for entry in infos if not entry.is_dir()]
        if len(files) > max_files:
            raise ValueError(f"arquivo demais: {len(files)} > {max_files}")
        total = sum(entry.file_size for entry in files)
        if total > max_bytes:
            raise ValueError(f"extração acima do limite: {total} > {max_bytes}")
        seen = set()
        for entry in infos:
            normalized = entry.filename.replace("\\", "/")
            candidate = pathlib.PurePosixPath(normalized)
            if candidate.is_absolute() or not candidate.parts or any(part in ("", ".", "..") for part in candidate.parts):
                raise ValueError(f"caminho inseguro: {entry.filename!r}")
            if candidate.parts[0].endswith(":"):
                raise ValueError(f"caminho de unidade inseguro: {entry.filename!r}")
            mode = (entry.external_attr >> 16) & 0xFFFF
            if stat.S_ISLNK(mode):
                raise ValueError(f"link simbólico rejeitado: {entry.filename!r}")
            key = str(candidate).casefold()
            if key in seen:
                raise ValueError(f"caminho duplicado: {entry.filename!r}")
            seen.add(key)
            target = (destination / pathlib.Path(*candidate.parts)).resolve()
            if destination not in target.parents and target != destination:
                raise ValueError(f"destino sai do staging: {entry.filename!r}")
        for entry in infos:
            candidate = pathlib.PurePosixPath(entry.filename.replace("\\", "/"))
            target = destination / pathlib.Path(*candidate.parts)
            if entry.is_dir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                with zf.open(entry) as source, target.open("wb") as output:
                    shutil.copyfileobj(source, output, length=1024 * 1024)
        return total


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=pathlib.Path)
    parser.add_argument("destination", type=pathlib.Path)
    parser.add_argument("--max-files", type=int, default=10000)
    parser.add_argument("--max-bytes", type=int, required=True)
    args = parser.parse_args()
    try:
        size = safe_extract(args.archive, args.destination, args.max_files, args.max_bytes)
        print(f"safe-extract: OK ({size} bytes)")
    except (OSError, zipfile.BadZipFile, ValueError, RuntimeError) as error:
        print(f"safe-extract: FAIL: {error}")
        raise SystemExit(1)
