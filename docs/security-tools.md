# Security tools simulation notes

All security-oriented apps in this portfolio run entirely in the browser and read from local fixtures so no network activity or exploitation occurs. The `Security Tools` hub stitches these demos together under a shared [lab gate](../components/LabMode.tsx) and now ships with a guided tutorial system so visitors understand the guard rails before exploring.

## Guided tutorials

- `components/HelpOverlay.tsx` renders an accessible overlay that traps focus, supports keyboard navigation (Arrow keys, Tab, Escape), and can optionally highlight UI regions using `data-help-highlight` attributes. The final step closes the overlay and records completion.
- Each tab in `components/apps/security-tools/` declares its steps in [`tutorial.ts`](../components/apps/security-tools/tutorial.ts). Steps point at elements annotated with `data-tutorial="*"` in the main component so highlights remain stable.
- When a tutorial is dismissed the app sets `localStorage` keys in the form `tutorial:<appId>` (for example `tutorial:repeater`). The default behaviour is to auto-open the overlay the first time a tab is visited unless that key is already set.
- Every app menu includes a **Replay tutorial** option which forces the overlay to reopen without touching the stored completion flag. Clearing browser storage removes the keys if you want to verify the first-run behaviour.

## Simulation reminders

The overlay copy reiterates the project’s hard boundary: these views are static teaching aids only. The fixtures live in `/fixtures/` and nothing ever calls out to a target. Update both the tutorial content and the readme bullet in tandem whenever you add a new simulation so the documentation continues to make the educational intent obvious.
