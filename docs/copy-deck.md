# Copy deck guidelines

The desktop launcher and marketing surfaces read short bits of copy from JSON
files stored in `data/copy/`. Each file exports an array of entries with the
following shape:

```json
{
  "id": "desktop-hero",
  "tagline": "Spin up a Kali desktop in your browser.",
  "secondary": "Launch simulated tools, games, and workflows—no installs or external targets required."
}
```

## Authoring rules

- **Location.** Add or edit entries in `data/copy/*.json`. Keep samples that
  mirror production content under `public/fixtures/` for designers and
  copywriters.
- **Identifier.** `id` must be a unique, kebab-case string. Reuse the same id if
  a piece of copy powers multiple surfaces.
- **Tagline length.** The `tagline` string should be concise—no more than
  60 characters once trimmed. Aim for one sentence fragment without a period.
- **Secondary line length.** The `secondary` string provides a fuller
  explanation and is capped at 140 characters. Keep it to a single sentence.
- **Whitespace.** Trailing or leading spaces are disallowed. The lint rule trims
  entries before measuring the length and fails on stray whitespace.
- **Encoding.** UTF-8 text is supported. Smart quotes and em dashes are fine as
  long as the length constraints are respected.

## Linting

`yarn lint` now runs `scripts/lint-copy-deck.mjs`, which scans every
`data/copy/*.json` file and rejects entries that violate the rules above. Run it
locally after editing copy to spot issues early:

```bash
node scripts/lint-copy-deck.mjs
```

The script reports each offending field with the file name and entry id so you
can adjust the text quickly.
