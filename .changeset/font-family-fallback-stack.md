---
'@acronis-platform/tokens-pd': patch
---

Emit a web-safe fallback chain for `font-family` instead of the bare design
family.

The design tokens carry only the preferred family (`Inter`) — all Figma's
font-family variables express — so the generated CSS previously rendered
`font-family: Inter;` with no fallback. If Inter isn't loaded, the browser
dropped straight to its default serif. The `typography/css-class` transform now
appends a generic fallback chain at generation time, so the `.ui-typography-*`
classes (and the matching Tailwind `fontFamily` preset keys) render
`font-family: Inter, system-ui, sans-serif;` and degrade gracefully.

The fallback is keyed on the preferred family (`Inter` → `system-ui,
sans-serif`, `IBM Plex Mono` → `ui-monospace, monospace`), defaulting to
`sans-serif`. The token source is unchanged; this is purely a CSS-output
concern. Affects the regenerated semantic CSS and Tailwind presets (both
brands).
