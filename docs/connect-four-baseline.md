# Connect Four Baseline Findings

## Baseline Findings (pre-hardening pass)

* Board sizing was fixed to a single pixel size, making it cramped on phones and oversized in larger windows.
* Column interaction relied on small top-row buttons, which were difficult to hit on touch devices and did not support tapping anywhere in a column.
* Keyboard navigation existed, but the board did not respect global focus state; keys could fire even when the window was not focused.
* There was no ghost/preview disc to communicate the currently selected column.
* Color palette, high-contrast, and quality settings from `GameSettingsContext` were not applied, leaving accessibility toggles inactive.
* CPU move computation ran synchronously on the main thread at higher depths, creating jank on mobile.
* Win feedback and post-game actions were minimal (no strong CTA, no match progression).
* Undo behavior worked, but edge cases around AI think timing and game-over states needed hardening.
* No persisted match flow or player stats were visible for tracking performance over time.
