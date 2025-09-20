# Trash retention and recovery controls

The desktop Trash app keeps closed windows and virtual file entries in local storage
so they can be restored later. This document summarizes how retention works and how
users can manage it.

## Retention policy

- **Default window**: Items remain in Trash for **30 days** unless the user changes
  the retention setting.
- **Automatic purge**: Anything older than the configured retention window is
  removed on load. The same timeline applies to the "Recently Deleted" undo
  history.
- **Manual empty**: Emptying the Trash removes the current contents immediately.
  The deleted set is stored as a batch so it can be restored with a single undo
  action.
- **Undo history**: Up to 20 delete or empty operations are preserved. Undoing an
  entry restores every item in that batch, unless a name conflict prevents an
  individual item from being recovered.

## User controls

- **Storage settings** (`/apps/settings/storage`): Provides a slider and numeric
  input to choose the retention window between 1 and 365 days. Saving the setting
  updates the Trash immediately.
- **Trash warnings**: When the Trash contains items larger than 50 MB, a banner
  warns the user that emptying may take longer. The Empty button also displays the
  estimated reclaimable size.
- **Restore behavior**: Restoring attempts to send files back to their original
  virtual path using metadata stored with each Trash entry. Desktop windows fall
  back to relaunching the app if a file handler is not available.
- **Batch undo**: The "Recently Deleted" panel groups empties and deletes. The
  Undo button restores the entire group, while "Restore All" returns every
  available entry.

## Events and integration hooks

- `trash-retention-change` – fired on `window` whenever the retention setting is
  saved. Listeners can refresh local caches.
- `restoreToOriginalLocation(item)` – exported helper that restore handlers can
  register with via `registerTrashRestoreHandler` in `utils/files/trash.ts` to take
  over file restoration if they manage a virtual file system.

