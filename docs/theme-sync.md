# Theme synchronisation channel

The desktop shell now keeps theme selections in sync across tabs and windows by
broadcasting updates through [`BroadcastChannel`](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel).
The implementation lives in `src/theming/channel.ts` and is wired into the
shared theme helpers in `utils/theme.ts` and the `useTheme` hook.

## How it works

- `setTheme` applies the theme locally **and** calls `publishThemeChange`, which
  posts a `ThemeBroadcastMessage` containing a unique id, the theme value, and a
  timestamp.
- `subscribeToThemeUpdates` listens for those messages and updates the local
  React state plus the DOM via `setTheme(..., { broadcast: false })` so we do not
  echo the change back onto the channel.
- Messages are de-duplicated via their unique ids so listeners that receive both
  the broadcast and the fallback signal only process the first copy.

This keeps the update path synchronous apart from the browser-delivered
`BroadcastChannel` round-trip, which comfortably satisfies the 100 ms target in
our Jest coverage.

## Fallback behaviour

Some engines (older Safari/WebViews) do not implement `BroadcastChannel`. To
cover that case we also write every message to
`localStorage['app:theme:broadcast']` and always register a `storage` event
listener. Browsers that only support the storage event still receive the theme
update, while modern ones ignore the duplicate because of the message id guard.

If both paths are available the broadcast arrives first and the later storage
signal is ignored. When only the storage path exists, propagation depends on the
browser firing the cross-tab storage event; this is usually tens of milliseconds
and still below the 100 ms target under normal conditions.

## Performance notes

- No polling is involved—updates come directly from the browser primitives.
- We cap the de-duplication buffer (`MAX_TRACKED_MESSAGES`) to 32 entries so the
  channel stays O(1) for new messages.
- Tests in `__tests__/themeChannel.test.ts` use a deterministic channel mock to
  assert that both the broadcast path and the storage fallback deliver the new
  theme well within the 100 ms budget.

