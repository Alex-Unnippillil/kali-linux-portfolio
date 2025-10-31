# Accessibility exceptions

The automated Playwright + axe audits currently flag a handful of serious issues that must be addressed before we can enable fail-on-violation gates in CI. The table below captures the areas that exceed the allowed thresholds, together with a remediation plan. Summary markdown files for each failure are generated in `playwright-results/` and uploaded as CI artifacts.

| Area | Serious violations | Last validated | Notes | Remediation plan |
| ---- | ------------------ | -------------- | ----- | ---------------- |
| Desktop shell (`#window-area`) | 1 | Playwright axe run | Window title bar nests focusable controls, triggering `nested-interactive`. | Refactor the window title bar to ensure buttons (close/minimize/etc.) are not nested inside another interactive element. Consider using a non-focusable wrapper that delegates events to discrete buttons. |
| Applications directory (`/apps`) | 2 | Playwright axe run | Search input fails color-contrast (1.04 ratio) and the document is missing a `<title>`. | Update the `/apps` page to set an explicit `<title>` and adjust the search input styling (foreground/background colors) to hit at least 4.5:1 contrast. |
| Profile overview (`/profile`) | 1 | Playwright axe run | Missing document `<title>`. | Set a descriptive page title via `next/head` (e.g., "Profile · Alex Unnippillil") to support screen reader navigation. |
| Security education hub (`/security-education`) | 2 | Playwright axe run | CTA chip fails color contrast (1.37 ratio) and the page is missing a `<title>`. | Provide a title for the page and revisit the accent colors so text/background meet 4.5:1 contrast. |
| Notes workspace (`/notes`) | 1 | Playwright axe run | Missing document `<title>`. | Add a `<title>` that reflects the workspace context (for example, "Notes · Kali Portfolio"). |
| Terminal window (`#terminal`) | 1 | Playwright axe run | Window title bar nests focusable controls. | Align with the shell-wide window chrome fix so controls are exposed individually, not nested. |
| Settings window (`#settings`) | 1 | Playwright axe run | Same nested interactive pattern as the terminal window. | Share the title-bar refactor across settings and other desktop apps once the shell fix lands. |
| Firefox window (`#firefox`) | 2 | Playwright axe run | Title bar nests interactive controls and two interior elements miss color contrast (3.96 and 3.67 ratios). | Apply the shell title-bar fix and tweak the Firefox theming (foreground/background variables) to satisfy 4.5:1 contrast. |

## Follow-up checklist

- [ ] Track each remediation item above in the accessibility backlog and assign owners.
- [ ] Once fixes land, rerun `npx playwright test --project accessibility` to confirm all serious violations reach zero.
- [ ] Reduce the allowed `moderate`/`minor` thresholds once serious issues are cleared to tighten the gate over time.
