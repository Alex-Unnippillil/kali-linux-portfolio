# Log Viewer Utility

The Log Viewer utility simulates a high-volume operations console for exploring structured log entries without touching real infrastructure.

## Features

- **Field-aware filtering** – Toggle log levels, filter by source, message text, tags, and time ranges. Filters update immediately and can be cleared with a single action.
- **Saved presets** – Store frequently used filter combinations locally. Presets are kept in the browser via the `safeLocalStorage` helper so they survive reloads without leaving the demo environment.
- **Virtualized rendering** – The list uses `react-window` together with `react-virtualized-auto-sizer` so thousands of entries can be browsed smoothly without overwhelming the DOM.
- **Color-coded severity** – Each log level renders with an at-a-glance badge to highlight critical events.
- **Export current view** – Download the filtered view as a JSON file. The export bundles the applied filters, preset metadata, and the matching entries so investigations can be shared offline.

## Usage Tips

1. Apply field filters first to trim the data set. Level toggles are additive; select multiple severities to compare trends.
2. Save commonly used slices (for example, `ERROR` + `payments-api`) as presets. They are listed newest-first for quick recall.
3. Use the export action after applying a preset to archive the evidence trail. Every export includes a timestamp and the filters that generated it.
4. This viewer works entirely with simulated data so it is safe to explore without accessing any live infrastructure.
