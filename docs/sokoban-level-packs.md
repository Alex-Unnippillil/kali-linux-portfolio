# Sokoban level pack format

The desktop Sokoban app (`components/apps/sokoban.js`) and the newer `/apps/sokoban`
page both rely on the same lightweight level structure:

- Levels are arrays of strings where each character represents a tile.
- Packs are arrays of those levels with optional metadata (name, difficulty).
- Levels can be imported from plain text (blank lines separate boards) or JSON
  documents that expose either `{ "levels": string[][] }` or a raw `string[][]`.
- Exported text uses the same blank-line delimiter, making it easy to round-trip
  into level editors.

When adding built-in packs, extend `apps/sokoban/levels.ts`. Custom packs saved
through the UI are persisted either to OPFS when available or to
`localStorage` as a fallback.

## Tile legend

- `#` – Wall
- `@` – Player starting position
- `+` – Player on target
- `$` – Box
- `*` – Box on target
- `.` – Target tile
- Space – Empty floor

Keeping the tiles consistent with the classic Sokoban notation ensures imported
puzzles from community collections render without conversion.
