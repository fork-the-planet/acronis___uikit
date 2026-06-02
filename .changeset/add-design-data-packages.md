---
'@acronis-platform/assets': minor
'@acronis-platform/tokens': minor
---

Add the `@acronis-platform/assets` and `@acronis-platform/tokens` design-data packages.

- `@acronis-platform/assets` — DTCG-divergent JSON manifests for icons and illustrations, plus the bundled SVG binaries they reference. Validated with ajv against `schemas/pack.schema.json` and `schemas/rule.schema.json`.
- `@acronis-platform/tokens` — DTCG-2025.10-conformant design-token JSON (primitives, semantic, components). Validated with ajv against `schemas/tokens.schema.json`.

Both are data-only packages (no build, no runtime API) consumed via their `exports` maps.
