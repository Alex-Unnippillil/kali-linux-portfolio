# Wordle dictionary sources

The Wordle app ships with a few small offline word packs so puzzles can rotate
without network access. Each list is curated from public data and saved as
static JSON so the service worker can precache them alongside the application
shell.

| Dictionary | Entries | Source | Notes |
|------------|---------|--------|-------|
| `common`   | 200     | [tabatkins/wordle-list](https://github.com/tabatkins/wordle-list) | Trimmed subset of the MIT-licensed "allowed guesses" list used by the original Wordle to provide a balanced mix of starter words. |
| `alt`      | 10      | Maintainer curated | Everyday words aimed at quick demo rounds. |
| `animals`  | 10      | Maintainer curated from Wikipedia's "List of animal names" (2023 snapshot) | Focused on approachable animal names for themed play sessions. |
| `fruits`   | 10      | Maintainer curated from Wikipedia's "List of culinary fruits" (2023 snapshot) | Lightweight mix of common fruits for teaching rounds. |

If additional packs are introduced, prefer public-domain or MIT-compatible
sources so they can ship with the static bundle and keep offline play working.
