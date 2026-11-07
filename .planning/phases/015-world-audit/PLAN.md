# Plan

allowed_write_paths: `.planning/phases/015-world-audit/`, `src/scene/`, `e2e/`, `tools/world-audit*`, `artifacts/evidence/world-audit-015/`, `.cache/`, `docs/knowledge/`.

1. Trace world coordinates, model placement, extents and animation; build an evidence-based map and identify collision cases.
2. Remove foreground light cones and fix verified placement and motion problems without changing asset licensing or adding network access.
3. Add focused regression tests for placement and motion; inspect screenshots and run fast/full gates. Preserve existing uncommitted artifacts.
4. Review staged changes and commit locally. Human art review remains separate.
