# Metasploit Offline Dataset

The Metasploit simulator ships with a local JSON index so the UI works in exports and lab environments where network access is restricted. The dataset lives at `components/apps/metasploit/modules.json` and mirrors a trimmed version of the upstream `modules_metadata.json` structure.

## Module index shape

Each entry includes:

- `name`: Fully-qualified module path.
- `description`: Multi-line synopsis used in search results and module details.
- `type`: `auxiliary`, `exploit`, or `post` for grouping.
- `severity`: Relative severity badge for filtering.
- `platform`, `tags`, `cve`: Metadata the tree, search box, and tag filter consume.
- `options`: Command builder metadata with `desc`, `default`, and `required` flags.
- `transcript`, `doc`, `teaches`, `disclosure_date`: Optional extended details displayed in the module pane and canned console output.

The command builder reads the `options` object to surface fields and pre-populate defaults. Update this JSON file whenever new modules or teaching transcripts are added so the UI stays in sync.

## Canned console transcripts

`apps/metasploit/index.tsx` renders a static console preview and lab warnings. The transcript is intentionally deterministic to keep offline demos reproducible. Adjust the `cannedConsole` string alongside the dataset when changing the walkthrough steps.

## Workflow

1. Edit `components/apps/metasploit/modules.json` and keep the schema documented above.
2. Run `yarn test --runTestsByPath __tests__/metasploitPage.test.tsx` to confirm the command builder still renders module options from the JSON file.
3. Update this document if the dataset gains new fields or if additional offline fixtures are introduced.
