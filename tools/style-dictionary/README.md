# @acronis-platform/style-dictionary

A **private** build tool (not published) that translates
[`@acronis-platform/design-tokens`](../../packages/design-tokens) into per-brand
CSS custom properties, using [Style Dictionary v5](https://styledictionary.com/).
It is the first tool in the repo's `tools/` tier.

## What it produces

Run the build and inspect the gitignored `dist/`:

```bash
pnpm --filter @acronis-platform/style-dictionary build
```

```
dist/
├── pd-dtcg/                    # stage 1: 100%-DTCG JSON, one file per mode
│   ├── primitives-light.json   #   (Theme axis)
│   ├── primitives-dark.json
│   ├── semantic-acronis.json   #   (Brand axis; aliases kept, not flattened)
│   ├── semantic-brand-b.json
│   ├── components-acronis.json
│   └── components-brand-b.json
└── pd-css/                     # stage 2: per-brand CSS custom properties
    ├── acronis.css
    └── brand-b.css
```

Each CSS file is a single `:root` block using the modern `light-dark()` +
`color-scheme` pattern, with path-derived variable names (no prefix), `rgb()`
colors, `px` dimensions, and expanded typography. Only the **semantic** and
**component** tiers are emitted — the palette is a resolution input, not output.

```css
:root {
  color-scheme: light dark;
  --colors-background-surface-primary: light-dark(rgb(255 255 255), rgb(0 0 0));
  --button-global-radius: 4px;
  --typography-body-default-font-size: 14px;
}
[data-theme='light'] {
  color-scheme: light;
}
[data-theme='dark'] {
  color-scheme: dark;
}
```

## How it works

Two stages — see [`context/pipeline.md`](context/pipeline.md) for the full
mapping and [`context/output.md`](context/output.md) for the CSS contract:

1. **Normalize** the Acronis tokens (per-mode `values`, `com.acronis.units`,
   `platforms`) into plain DTCG JSON, split by mode, filtered to the `PD`
   platform, with aliases preserved.
2. **Resolve & format** each brand against both themes, zipping colors into
   `light-dark()` and writing the CSS.

## Scripts

| Script                        | Does                                              |
| ----------------------------- | ------------------------------------------------- |
| `build`                       | all platforms: `pd-dtcg` → `pd-css` → `pd-assets` |
| `clean`                       | remove `dist/`                                    |
| `lint` / `typecheck`          | eslint / `tsc --noEmit`                           |
| `dev` / `test` / `test:watch` | no-ops (MVP)                                      |

### Targeted builds

Each output is a platform key, `<filter>-<output>` (`filter` = the design-tokens
`platforms` enum, `pd` today). Pass keys to build a subset:

```bash
pnpm build              # everything (default)
pnpm build pd-css       # just pd-css (runs its pd-dtcg dependency first)
pnpm build pd-assets --pack=icons-solid-mono,concept-pack   # only those packs
pnpm build -- --filter=pd                                   # restrict to one filter
```

`pd-assets` is a placeholder today. The `--pack` selector exists so CI can rebuild
only the asset packs that changed; tokens always build together.

Requires **Node ≥ 22** (Style Dictionary v5).
