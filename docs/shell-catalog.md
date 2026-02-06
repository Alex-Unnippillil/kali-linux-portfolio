# Shell catalog guide

The development catalog at `/dev/shell-catalog` showcases the window chrome patterns that power the desktop UI. Use it as a
lightweight alternative to Storybook when evaluating density, rhythm, and theme contrast before promoting a change to the main
desktop shell.

## Access control

- **Local development** – the catalog is available automatically when running `yarn dev`.
- **Preview or production** – set `NEXT_PUBLIC_ENABLE_DEV_SHELL_CATALOG=true` in the environment before building to opt-in. The
dev route guard will otherwise redirect visitors to the 404 page.
- The route is never meant for end users. Leave the flag unset in public deployments.

## Adding a new shell example

1. Open `pages/dev/shell-catalog.tsx`.
2. Create a small preview component (see `WorkspacePreview`, `CommandCenterPreview`, or `QuickPanelPreview` for patterns).
   - Accept the `theme` (`"light" | "dark"`) and `density` (`"compact" | "comfortable" | "spacious"`) props so the shared
toggles continue to work.
   - Reuse the `palette` and `densityScale` tokens exported in the file to keep typography, padding, and accent colors
consistent.
   - Keep each preview roughly `h-60` tall so the layout remains balanced. Adjust internal padding rather than changing the
height when exploring density options.
3. Register the component by appending an entry to the `shellVariants` array. Provide a concise `title`, `description`, and a
`render` function that returns your preview component.
4. If you need additional shared styling tokens, extend the `palette` or `densityScale` objects instead of inlining new color or
spacing values.
5. Validate the experience in both themes and across every density option. The spacing grid toggle is helpful for confirming the
baseline rhythm.

## Tips

- Keep copy short and descriptive—aim for language that explains the shell’s role rather than real telemetry.
- Prefer semantic elements (`ul`, `li`, `button`, `header`) so the previews mirror the accessibility model of the actual
windows.
- When a preview needs interactive state, contain it inside the component rather than mutating shared module state. This keeps
snapshots deterministic for tests.
