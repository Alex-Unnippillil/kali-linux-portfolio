# Files app design portal

The Files app now ships with a smart folder gallery that lets you seed the
sidebar with curated filters in one click. Use this page as your reference
when reviewing the experience or tailoring it for client work.

## Using the gallery

1. Open the **Files** app and press **Smart folder gallery** in the toolbar.
2. Each card represents a template with a short description, accent colour,
   and quick tips. Press **Add to sidebar** to create a copy.
3. Added folders appear in the navigation pane instantly. Selecting a folder
   runs its filters against the current root directory and lists matches in
   the main view.

The gallery ships with four starter templates:

| Template | Summary | Default rules |
| --- | --- | --- |
| Today | Highlights files touched since midnight. | Modified date within 0 days, sorted newest first. |
| Large files | Surfaces anything over 50 MB for cleanup. | Size ≥ 50 MB, sorted largest first. |
| Recent downloads | Tracks activity inside the Downloads folder for the past week. | Path contains “downloads”, modified within 7 days. |
| Duplicates | Groups files with the same name and size so you can dedupe quickly. | Duplicate by name and size, sorted alphabetically. |

## Customising smart folders

* Hover over a smart folder in the sidebar and click **Edit** to open the
  editor overlay. Changes apply immediately and are persisted in
  `localStorage` so they survive reloads.
* The editor supports the following filter types:
  - **Date** – Accepts a rolling window measured in days. Set `0` to capture
    today only or increase the value for a weekly snapshot.
  - **File size** – Uses megabytes for clarity. The value is converted to
    bytes automatically and stored in the folder definition.
  - **Path match** – Offers “Contains” and “Starts with” operators plus an
    optional case-sensitive toggle.
  - **Duplicates** – Lets you switch between name-only, size-only, or name &
    size matching.
* Sorting can be toggled between modified date, size, or name in ascending or
  descending order. Select **Manual (unsorted)** to disable ordering.
* Each folder keeps an accent colour and description. These appear in the
  sidebar and table header to reinforce context.

## Performance guidance

* Queries stream directory entries and reuse a metadata cache to avoid calling
  `FileSystemFileHandle.getFile()` more than once per path.
* The evaluator yields back to the main thread every 35 files and caps output
  at 500 matches, preventing long blocks on large hierarchies.
* Duplicate filters run after base filters so you can scope audits with path
  or size rules before grouping.

For layout tweaks reference `components/apps/file-explorer.tsx` and
`components/apps/files/SmartFolderEditor.tsx`. Template definitions live in
`data/files/smart-folder-templates.ts` and are safe to extend with new canned
experiences.
