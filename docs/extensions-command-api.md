# Extensions Command API

Extensions can add custom actions to the global command palette by using the
helpers exported from `extensions/api/commands.ts`. Commands registered through
this module appear alongside the built-in terminal commands with a badge that
indicates their source.

## Registering commands

```ts
import { registerExtensionCommand } from 'extensions/api/commands';

const dispose = registerExtensionCommand('my-extension', {
  id: 'my-extension.sayHello',
  label: 'Say hello',
  category: 'Examples',
  shortcut: {
    default: 'Ctrl+Alt+H',
    mac: '⌘⌥H',
  },
  run: () => {
    console.log('Hello from my extension!');
  },
});
```

`registerExtensionCommand` automatically scopes the command to the extension id
and returns a disposer. Call the disposer from your extension's teardown hook to
remove the command.

If you are registering a core command from inside the application itself, use
`registerCommand` instead and omit the `extensionId`:

```ts
import { registerCommand } from 'extensions/api/commands';

const dispose = registerCommand({
  id: 'core.openHelp',
  label: 'Open Help',
  run: openHelpWindow,
});
```

## Metadata

Each command exposes rich metadata that is surfaced in the palette:

- `label` – human-readable name shown in the list.
- `category` (optional) – used to group commands visually.
- `shortcut` (optional) – describe default/macOS/Windows/Linux shortcuts. These
  values are displayed as a compact summary.
- `source` (optional) – overrides the badge text. When omitted the badge will
  display either `Core` or the provided `extensionId`.

## Command execution

Use `executeCommand(id, ...args)` to invoke a command programmatically. The
return value from the registered `run` handler is passed through, so handlers can
return promises or synchronous values.

## Listening for registry changes

The command palette subscribes to updates via `onCommandsChanged(listener)`. You
can use the same helper to react to commands being added or removed:

```ts
import { onCommandsChanged } from 'extensions/api/commands';

const unsubscribe = onCommandsChanged((commands) => {
  console.table(commands);
});
```

The listener receives a sorted array of registered commands. Call the returned
function to unsubscribe.

## Unregistering commands

- `unregisterCommand(id)` removes an individual command.
- `unregisterExtensionCommands(extensionId)` removes all commands contributed by
  an extension. This is used by the extension host when an extension unloads to
  ensure the palette stays in sync.
