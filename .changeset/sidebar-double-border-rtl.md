---
'@acronis-platform/ui-react': patch
---

Fix double border when SidebarSecondary is used with resizable, and fix RTL text direction in sidebar labels.

- **SidebarSecondary**: remove the `after:` divider from the resize edge; the sidebar's own `border-e` now changes color via `:has()` on hover/active/focus of the resize handle, eliminating the double border.
- **SidebarPrimary / SidebarSecondary**: remove `unicode-bidi:plaintext` from menu-item, section-label, header, and collapse-trigger labels so text direction follows the document's RTL/LTR setting correctly.
