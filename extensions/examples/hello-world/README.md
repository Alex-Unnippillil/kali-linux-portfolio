# Hello World Dev Example

This example extension shows how Dev Mode extensions are structured:

- **`manifest.json`** – declares metadata, command contributions, panel source, settings schema, and permissions.
- **`extension.js`** – runtime script loaded inside the sandbox. It renders the panel markup, reacts to settings,
  and posts log messages back to the Plugin Manager output.
- **`panel.html`** – standalone UI markup that is bundled with the manifest and injected into the sandbox.

Run the desktop in Dev Mode (`NEXT_PUBLIC_DEV_MODE=true` or `yarn dev`) and open the Plugin Manager app.
The catalog will expose this extension under the `hello-world` id so you can inspect the manifest output
and see how commands, settings, and permissions are surfaced.
