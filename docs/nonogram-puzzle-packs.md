# Nonogram Puzzle Packs

The Nonogram app loads its daily puzzle from a reusable pack definition. Packs
live under `apps/games/nonogram` and use the helper utilities in
`apps/games/nonogram/packs.ts`.

## File format

Each pack is defined as a JSON object with a `name` and a `puzzles` array. Every
puzzle entry lists a friendly `name` and the solution grid encoded as strings
using `#` for filled cells and `.` for blanks:

```json
{
  "name": "Sample",
  "puzzles": [
    {
      "name": "Puzzle 1",
      "grid": [
        "#..",
        "##.",
        "..."
      ]
    }
  ]
}
```

The pack loader converts these strings into Nonogram clues on demand. For more
advanced workflows you can generate packs programmatically with the exported
`parsePack` and `loadPack` helpers.

## Loading packs in the app

`components/apps/nonogram.js` imports `sample-pack.json` and passes it through
`loadPackFromJSON`. The component relies on `getDailyPuzzle` to pick a puzzle by
seed so that everyone receives the same challenge each day. You can ship new
puzzles by updating the JSON file or by loading additional packs dynamically.

## Persisted progress and scoring

Player progress and hint usage are stored with
`apps/games/nonogram/progress.ts`. Each puzzle is keyed by its `name`, allowing
multiple packs to coexist without collisions. Completion time is tracked in
`localStorage` under `nonogramBestTime`, enabling the high-score display inside
the app.

When adding new packs, make sure each puzzle has a unique `name` so that saved
state and best times remain scoped correctly.
