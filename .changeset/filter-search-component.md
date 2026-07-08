---
'@acronis-platform/ui-react': minor
---

Add `FilterSearch`: a composable toolbar layout for data tables (search + filters + tenant switcher + action buttons). Designed to complement the existing `DataTableToolbar` — use `FilterSearch` as a standalone toolbar above any data table, or `DataTableToolbar` when working within the `DataTable` composition. Also fixes `InputSearch` to apply `className` to the outer container so width-sizing (`className="w-56"`) works correctly.
