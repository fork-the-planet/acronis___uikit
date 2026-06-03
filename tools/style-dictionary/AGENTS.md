# AGENTS.md — `tools/style-dictionary`

`@acronis-platform/style-dictionary` — a **private** (unpublished) build tool: a
[Style Dictionary v5](https://styledictionary.com/) translation pipeline that
turns `@acronis-platform/design-tokens` into per-brand CSS custom properties.
This is the first inhabitant of the repo's `tools/` tier (scripts that automate,
translate, or execute operations — never published to npm).

Repo-wide rules (TypeScript, file naming, Conventional Commits) live in the repo
root's [`../../context/`](../../context/) and apply on top. This file documents
only what is specific to this workspace.

## Build

The only script that does real work. From the repo root:

```bash
pnpm --filter @acronis-platform/style-dictionary build
```

`src/index.ts` is the single entry point. Each output is a **platform key**,
`<filter>-<output>` — the SD-style name that is also the dist dir and the CLI
selector. It builds them in dependency order, writing **gitignored** artifacts to
`dist/<filter>-<output>/`. For the `pd` filter:

1. `pd-dtcg` → `dist/pd-dtcg/` — six per-mode, 100%-DTCG JSON files.
2. `pd-css` → `dist/pd-css/` — `acronis.css` and `brand-b.css`.
3. `pd-assets` → `dist/pd-assets/` — **placeholder** (not implemented; warns).

Usage:

```bash
tsx src/index.ts                     # all filters, all outputs
tsx src/index.ts pd-css              # one platform (runs its pd-dtcg dependency first)
tsx src/index.ts pd-assets --pack=icons-solid-mono   # one asset pack only
tsx src/index.ts --filter=pd         # restrict to one filter
```

`pd-css` consumes the DTCG files `pd-dtcg` writes, so requesting `pd-css` runs
`pd-dtcg` first; the default builds everything. `dev` is a no-op; `clean` removes
`dist/`; `lint`/`typecheck` run eslint/tsc; `test` is an MVP no-op (build and
inspect `dist/`).

## Platforms

A platform key is `<filter>-<output>`. Both halves are real axes:

- **`filter`** (`pd` | `web`) maps to the design-tokens `platforms` enum
  (`PD` | `WEB`) — a closed enum every token must declare. The same sources
  produce a **different** bundle per filter. Today every token is `["PD"]`, so
  `pd` is the only built filter; `web` is schema-defined and coming. The same axis
  exists per-asset in `@acronis-platform/design-assets`.
- **`output`** (`dtcg` | `css` | `assets`) is the artifact kind.

The build list is explicit in `index.ts`:

- `FILTERS` is the array of filters that have source data (`['pd']` today);
  `FILTER_ENUM` maps each to its tokens `platforms` value. The valid platform keys
  are `FILTERS × {dtcg, css, assets}`.
- Adding WEB = add `'web'` to `FILTERS`. No hook changes — the stages take a
  `filter` and derive their keys / dist dirs from it.

## Source layout

Two areas: a single `index.ts` that constructs the Style Dictionary instances, and
`hooks/` holding **all** translation logic (the SD docs' shape — a thin entry that
references hooks).

```
src/
  index.ts              The only non-hook module: shared design data (TOKEN_SOURCES,
                        VIEWS, BRANDS, THEMES, FILTERS, FILTER_ENUM, distDir), the
                        two SD stages (buildDtcg, buildCss), the assets placeholder
                        (buildAssets), the makeSd factory, and the CLI.
  hooks/
    preprocessors/      acronis/dtcg — Acronis source → per-mode DTCG. `normalizeTree`
                        is what stage 1 calls directly; `acronisDtcg` wraps it as an
                        SD preprocessor (kept for reuse, not currently registered).
    transforms/         color/hsl-to-rgb, dimension/px, scalar/css,
                        typography/css-class + the `acronis/css` transform group
                        (stage 2 value formatting). Each transform owns its value
                        formatting; `dimension/px` and `scalar/css` export their
                        formatter, which `typography/css-class` reuses per sub-field.
    filters/            semantic-only — drop the primitive roots from CSS output.
    formats/            css/light-dark — render `:root` vars + typography classes.
    index.ts            STATIC_HOOKS — the registry every instance shares.
```

`index.ts` is _what's produced_ (the two stages + the CLI); `hooks/` is _how it's
transformed_. Adding an output is a new build function + a branch in the CLI's
per-filter loop. New translation logic goes in a hook under `hooks/`, registered in
`hooks/index.ts`. A new source package gets a reader (like `readTokenSource`) in
`index.ts`.

## CI integration

Change-detection and validation-gating live in **CI**, not this tool — the tool is
a pure, granular builder. CI detects changed paths, runs each package's existing
`validate` (ajv), and on success calls the tool with the right selector. The
contract CI keys off:

| Changed path                                     | Build invocation                                |
| ------------------------------------------------ | ----------------------------------------------- |
| `design-tokens/tokens/**` or its schema          | `build` (whole token build: `pd-dtcg`+`pd-css`) |
| `design-assets/packs/<name>.json` or `<name>/**` | `build pd-assets --pack=<name>`                 |
| `design-assets/rules/**` or `pack.schema.json`   | `build pd-assets` (all packs — shared input)    |

Tokens always build together (one schema, tightly-coupled files); assets are
per-pack (a pack name is the `packs/<name>.json` stem). `--pack` validates against
the live pack list, so the tool needs `@acronis-platform/design-assets` as a
workspace dependency. The actual workflow is future work; this records the
CI↔CLI contract so it stays stable.

## Gotchas

- **Node ≥ 22** — Style Dictionary v5 requires it (the repo is already on 22).
- **`dist/` is gitignored** — `@acronis-platform/design-tokens` is the source of
  truth; regenerate rather than commit output.
- **Platform filter** — the `normalizeTree` pass keeps only tokens whose
  `platforms` array includes the build's filter enum value (PD today), then strips
  the (non-DTCG) `platforms` key; `$extensions` is retained for traceability. The
  enum value is threaded in from the `filter` via `FILTER_ENUM` (see Platforms),
  not hardcoded.
- **Stage 1 serializes `normalizeTree`'s output directly**, not `sd.tokens` —
  SD's own init normalization relocates `$type` (it drops the redundant
  group-level type _and_ the token-level type on units-promoted dimensions),
  which would break the "every token self-describing, references intact"
  contract of the DTCG artifact. That's why `buildDtcg` calls `normalizeTree`
  itself instead of running stage 1 through an SD instance.
- **Scalar value transforms stay non-transitive; the typography one must be
  transitive.** Stage 2's `acronis/css` group keeps `color/hsl-to-rgb`,
  `dimension/px`, and `scalar/css` **non-transitive** — they run after reference
  resolution and must not be `transitive: true` (a transitive scalar transform
  re-runs mid-resolution and breaks `{…}` alias resolution). `typography/css-class`
  is the deliberate **exception**: a composite token's sub-fields are references,
  so SD only applies a value transform to it on the transitive (post-resolution)
  pass — non-transitive, it never fires at all. It's safe because typography
  composites are terminal (nothing aliases into them), so it can't interfere with
  anyone else's resolution.
- **Typography → utility classes, not variables.** Composite typography tokens
  are emitted as `.typography-*` classes (one declaration per field), not per
  field as `--…` custom properties. They are **not** expanded: the
  `typography/css-class` transform builds the declaration block from the resolved
  composite `$value`, and the `css/light-dark` format wraps it in the
  `.typography-*` selector. Because the composite's sub-fields carry no `$type`,
  the transform formats them by shape (`formatScalar`), handling both already-px
  strings and inline `{ value, unit }` objects.
- **Gradients are skipped** in the CSS (the 4 `colors.background.ai.*` tokens) —
  see [`context/output.md`](context/output.md). The build logs the skipped count.

## Loading context

Before non-trivial work, read the matching file(s) in full.

| When the task involves…                                                                                              | Load                                         |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| The two stages, the source→mode mapping, the PD filter, how aliases are kept vs flattened                            | [`context/pipeline.md`](context/pipeline.md) |
| The CSS contract — `light-dark()`, `rgb()` colors, no-prefix path-derived var names, typography expansion, gradients | [`context/output.md`](context/output.md)     |

To understand the **input** shape (the Acronis token divergences this tool
consumes), read
[`../../packages/design-tokens/context/manifest.md`](../../packages/design-tokens/context/manifest.md).

## Conventions for new context files

`context/<name>.md`, lowercase-hyphen. One concept per file; add a row to the
table above in the same change — an unlisted file is invisible to the agent.
