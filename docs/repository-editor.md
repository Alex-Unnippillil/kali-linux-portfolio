# Native repository editor

The desktop **Visual Studio Code** app and `/apps/vscode` now share a native,
VS Code-style source workspace. There is no StackBlitz iframe, external editor
login, account authorization, or network-consent screen.

## Using the workspace

The app opens `README.md` automatically. Browse folders in Explorer, use the
Search view to filter file names/paths, or press **Ctrl/Cmd+P** for Quick Open.
Open several files in tabs. Find within a file, toggle wrapping, copy code, or
edit it locally. **Ctrl/Cmd+S** downloads the active file; it does not write to
GitHub. Local Changes lists modified files, including files whose tabs were
closed. Closing the application window discards its in-memory drafts: download
work before closing. No browser storage holds those drafts.

On narrow windows and phones, Explorer is a dismissible drawer. The title bar
and activity rail remain reachable. Keyboard shortcuts are scoped to this app,
not registered globally. A plain-text editor remains usable while the rich
editor loads, or if the rich editor cannot initialize.

This is a source viewer/editor, **not a remote development environment**. It does
not run repository code, install extensions, offer a shell, commit changes, or
pretend that visitor edits modify the owner's repository.

## Source and build contract

`yarn dev`, `yarn build`, and `yarn export` generate a first-party snapshot using
`scripts/generate-repository-snapshot.mjs`. It packages Git-tracked text files
from the checkout being built. The exact commit is recorded in the manifest and
in original-source links. The generated source is updated with every deployment,
not fetched from a moving GitHub branch in the visitor's browser.

Files live under `public/showcase/repository/`: a small index and one
content-hashed JSON asset per source file. Code is fetched on demand; the whole
repository is not placed in the initial JavaScript bundle or preloaded by the
service worker. The manifest uses fresh-first caching, while at most 80 requested
hashed files are cached for a week. Assets are usable in the static export too.

Packaging rejects symlinks, binary or invalid UTF-8 data, untracked files,
private-key/environment/credential filenames, dependencies, generated output,
test fixtures, raw QA payloads, and the X post archive. There is a 256 KiB
per-source-file and 16 MiB total source budget. Secrets must never be committed
to the public repository in the first place; this packaging filter is additional
protection, not a secret scanner. Source generation requires a Git checkout.

Monaco and its editor worker are bundled from the repository's existing
`monaco-editor` dependency. They load from this site's own origin, not a CDN.
No new dependency, permissive frame policy, or relaxed CSP is required.

## Verification

Unit tests cover manifest identity, source-path safety, automatic loading,
keyboard file selection, session edits, retries, and cancelled requests.
`tests/node/showcase-scripts.test.mjs` exercises the real source/archive scripts.
The browser suite exercises the actual Monaco build, downloaded source equality,
find, editing/undo, wrapping, narrow-window geometry, accessibility, and close.
Browser runs include Chromium, Firefox, and WebKit.
