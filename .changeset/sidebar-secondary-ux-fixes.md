---
'@acronis-platform/ui-react': patch
---

SidebarSecondary, Resizable, ButtonIcon, Tooltip: UX polish fixes

**Cursor styles:**

- Add `cursor-pointer` to menu items, collapse triggers, and expandable section labels
- Add `cursor-pointer` to `ButtonIcon` base styles globally

**Keyboard accessibility:**

- Space key now activates focused anchor menu items (native `<a>` only responds to Enter)
- Resize edge: Space toggles expand/collapse, ArrowRight expands when collapsed

**Resize edge:**

- Widen hit area from 9px to 17px for easier targeting
- Add `trackCursorAxis="y"` to resize edge tooltip so it follows the pointer vertically
- Render own focus ring via `after` pseudo (CSS border + box-shadow) instead of sidebar container ring
- Sidebar container `:has()` styles now target `border-inline-end-color` only (no outer ring)

**Resizable:**

- `ResizableHandle` divider line now uses a CSS border (`border-inline-start`) instead of `width` + `background` so the browser pixel-snaps the 1px line on fractional positions
- Focus ring rendered as `box-shadow` on the `after` pseudo, auto-centered on the line

**Focus retention:**

- CollapseTrigger now keeps stable DOM structure (Tooltip wrapper always present, disabled when expanded) so focus is preserved across state changes

**Tooltip delay:**

- `TooltipProvider` now defaults `delay` to 300ms (down from Base UI's 600ms)

**Stories:**

- Operations section items show per-item counters (12, 10)
- External link items use `target="_blank" rel="noopener noreferrer"`
- Section action `ButtonIcon` wrapped in `Tooltip`
