---
'@acronis-platform/ui-react': minor
---

Add `logo` and `collapsedLogo` props to `SidebarPrimaryHeader` so consumers can render distinct graphics per rail state (e.g. a full brand lockup when expanded vs. a monogram when collapsed) instead of resizing or hiding a single node via CSS. `children` still works unchanged when only one representation is needed.
