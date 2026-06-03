---
'@acronis-platform/icons-react': minor
'@acronis-platform/ui-react': patch
---

Add `@acronis-platform/icons-react` — React icon components generated from
`@acronis-platform/design-assets`. Ships all four packs via subpath exports
(`./stroke-mono`, `./solid-mono`, `./stroke-multi`, `./solid-multi`) as
tree-shakeable per-icon named exports plus an `icons` registry + `IconName`
type per pack.

- **mono** packs collapse to `currentColor` (inherit text color); **multi**
  packs keep their authored colors (gradient/clip ids are namespaced per icon
  to avoid collisions).
- The design-assets scale + stroke rules are baked into a `size` prop, so a
  single 24px master renders at any size with the designed stroke weight
  (1.6px @16, 2px @24, 2.5px @32).

`@acronis-platform/ui-react` now depends on it so components and stories can
compose icons (e.g. `<Button><PlusIcon /> Add</Button>`).
