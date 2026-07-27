# Module Workspace feeds

The Module Workspace exposes curated presets as Atom and RSS feeds so readers can
open the Kali desktop with pre-populated lab state.

## Endpoints

- Atom: `https://unnippillil.com/feeds/module-workspace.atom.xml`
- RSS 2.0: `https://unnippillil.com/feeds/module-workspace.rss.xml`

Each entry links to `/module-workspace?restore=<token>` where `token` is a
base64url-encoded JSON payload that captures:

- The workspace name to activate or create.
- The module identifier and option values to seed inputs.
- Optional stored values (mirroring the in-memory module store) so the Command
  Output and Stored Values sections render immediately.
- A simulated command result to display in the log.
- Tags that drive the initial tag filter when present.

## Restoring a preset manually

1. Copy the deep link from a feed entry.
2. Paste it into a browser that is running the portfolio.
3. The Module Workspace page reads the `restore` query parameter, validates it,
   clears existing module-store data, and rehydrates the workspace, module
   inputs, and stored command output.
4. If a matching tag exists, the filter is pre-selected so the catalog matches
   the feed entry context.

## Validation

The XML responses are trimmed and escaped so they pass the W3C feed validator.
When updating feed templates run both feed URLs through
<https://validator.w3.org/feed/> to confirm Atom and RSS compliance.
