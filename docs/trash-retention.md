# Trash Retention Policy

The Trash app simulates a desktop recycle bin backed by `localStorage`. Entries are stored under the
`window-trash` key and automatically purged based on a configurable retention window.

## Retention Window
- Items remain in Trash for 30 days by default. The number of days is stored in `localStorage` under
  the `trash-purge-days` key and can be updated by other desktop utilities or manual QA scripts.
- On every mount the Trash state filters out entries older than the retention window and rewrites
  `window-trash` to keep the data set consistent.

## Metadata Captured on Delete
- Each item stores its originating app ID, title, icon preview, and `originalPath` so restore flows
  can open the same app route again or display the source location to the user.
- Emptying the trash archives the removed entries in a `window-trash-history` list (capped at the 20
  most recent entries) to support quick restore actions.

## User Actions
- **Restore**: Re-opens the selected app and removes it from Trash. Confirms intent and updates the
  desktop icon immediately.
- **Delete**: Moves the entry into the history buffer so it can be recovered until the history limit
  is reached.
- **Empty**: Prompts for confirmation, displays a short countdown, and then clears all entries while
  archiving them into the history buffer. The desktop icon updates as part of the same flow.
- **Restore All**: Restores every entry currently in Trash after confirmation.

## Synchronisation Hooks
- Every operation dispatches a `trash-change` event, which keeps the dock icon and other listeners in
  sync with the latest `localStorage` state.
- History restores prompt for conflicts: users can replace the existing entry or rename the restored
  one, preventing silent overwrites.

Keep this document updated when retention rules or storage keys change so QA can validate the
behaviour quickly.
