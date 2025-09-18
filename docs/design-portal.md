# Design Portal – Terminal Color Palettes

The terminal now offers curated ANSI 0–15 palettes that pass WCAG AA contrast
requirements on both dark and light themes. Use these presets as the starting
point for any window dressing or visual QA.

## Bundled presets

| Preset | Theme inspiration | Notes |
| --- | --- | --- |
| **Kali Contrast** | Updated take on the classic Kali palette | Balanced hues that remain legible on `#0f1317` backgrounds and their light counterparts. Minimum contrast: ≥4.9:1.
| **Cyber Wave** | Neon synthwave | Extremely bright primaries tuned for deep blacks or airy light shells. Minimum contrast: ≥5.3:1.
| **Dawn Patrol** | Early-morning reconnaissance dashboards | Warmer neutrals paired with teal highlights. Minimum contrast: ≥5.0:1.

Each preset ships with 16 ANSI swatches plus matching background, foreground,
cursor, and selection colors for dark **and** light variants. The data lives in
[`data/terminal/colors.ts`](../data/terminal/colors.ts) and is validated by
[`utils/color/ansiContrast.ts`](../utils/color/ansiContrast.ts) to guarantee
ratios stay above 4.5:1.

## Importing and exporting palettes

Open the Terminal settings panel and use the **Copy preset JSON** button to
export the current palette. The payload supports two shapes:

```jsonc
// Reference a built-in preset
{ "presetId": "kali-contrast" }

// Provide custom dark/light variants
{
  "custom": {
    "name": "Night Ops",
    "dark": {
      "background": "#05070a",
      "foreground": "#f0f3f7",
      "cursor": "#4d8dff",
      "selectionBackground": "rgba(77, 141, 255, 0.35)",
      "palette": ["#7f8696", "#ff5151", "…", "#ffffff"]
    },
    "light": { "background": "#f4f7fb", "foreground": "#111926", "cursor": "#0d52ba", "selectionBackground": "rgba(13, 82, 186, 0.18)", "palette": ["…"] }
  }
}
```

Imported palettes must provide 16 ANSI entries per variant and maintain AA
contrast. The validation helper will reject any swatch that falls short of the
4.5:1 baseline.

## Accessibility checklist

- Verify every ANSI color reaches ≥4.5:1 against the active background.
- Ensure custom palettes include distinct cursor and selection colors.
- Re-run `yarn test` to exercise `ansiContrast` coverage when adding presets.
