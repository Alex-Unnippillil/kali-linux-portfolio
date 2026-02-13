# Improvement Tasks Backlog

This backlog tracks 60 actionable tasks to enhance the Kali Linux Portfolio experience. Each task is designed to be independently executable in a fresh cloud instance.

## Desktop Shell & Navigation

1. Add keyboard shortcuts documentation to the desktop help overlay and ensure focus indicators are visible.
2. Implement a "Show Desktop" button in the dock that minimizes or hides all open windows.
3. Refine window snapping behavior to support left/right tiling with animation cues.
4. Improve the context menu to include quick access to wallpaper settings.
5. Add high-contrast and reduced motion accessibility toggles to the settings app.
6. Ensure dock icons display a running indicator when an app window is open.
7. Create a quick search palette triggered by `Ctrl+Space` that searches apps and documents.
8. Localize desktop chrome strings (window controls, context menus) for English and Spanish.
9. Improve the boot splash screen with progress feedback during initial asset loading.
10. Build integration tests that verify window focus management via keyboard navigation.

## Apps Catalog & Launcher

11. Redesign the app launcher grid to support grouping apps by category tabs.
12. Add filtering and sorting options for the app catalog modal (favorites, recent, type).
13. Provide tooltips and short descriptions on hover in the launcher grid cards.
14. Enable right-click context actions on app tiles (favorite, pin to dock, open in windowed mode).
15. Add analytics events for app launches and favorites toggles (respecting existing feature flags).
16. Create an onboarding tour that highlights key apps the first time a user opens the launcher.
17. Introduce a "Recently Opened" section on the desktop with the last five apps used.
18. Implement lazy loading for heavy app bundles to improve initial load performance.
19. Add keyboard navigation to the launcher grid with arrow keys and Enter activation.
20. Build smoke tests that open each app once and assert basic rendering without console errors.

## Security Tool Simulations

21. Expand the Nmap simulator with customizable scan templates and canned output previews.
22. Add a Wireshark-inspired packet capture viewer with sample datasets and filtering controls.
23. Improve the Metasploit demo by adding a guided scenario selection with educational notes.
24. Create a reporting dashboard that aggregates simulated scan results for export as PDF.
25. Implement feature flags to enable or disable individual security tool demos at runtime.
26. Enhance the password cracker simulation with adjustable wordlists and runtime metrics.
27. Add a "Learning Mode" overlay with definitions and links for each security tool app.
28. Provide a JSON schema and editor for importing custom simulated scan datasets.
29. Integrate save/load support for tool sessions using local storage (with clear data UI).
30. Build Jest tests covering the parsing logic for simulated tool outputs.

## Games & Utilities

31. Refresh the retro games hub with a carousel layout and richer metadata cards.
32. Add gamepad remapping UI to the emulator apps with live preview of inputs.
33. Improve the text editor (Gedit) with markdown preview and syntax highlighting options.
34. Add a screenshot utility app that captures the current desktop state and saves to gallery.
35. Implement a calculator history tape with copy-to-clipboard buttons.
36. Enhance the terminal app with command history search (`Ctrl+R`) and theme presets.
37. Add an RSS reader utility that loads curated security news feeds in demo mode.
38. Provide offline-ready documentation for each bundled app accessible via the help menu.
39. Introduce achievements or badges for completing game challenges or tutorials.
40. Build unit tests for core utility app reducers and hooks to prevent regressions.

## Content & Documentation

41. Update the About window with the latest experience highlights and certification badges.
42. Add a "What's New" changelog app that reads from `CHANGELOG.md` and surfaces recent updates.
43. Document all feature flags and environment variables in `docs/configuration.md`.
44. Create contributor guidelines for adding new simulated tools, covering data and UI patterns.
45. Produce architecture diagrams illustrating app module relationships in `docs/architecture/`.
46. Add copywriting polish to app descriptions to emphasize educational objectives.
47. Translate prominent marketing copy into at least two additional languages with language switcher.
48. Record animated GIF demos for top apps and embed them in the documentation site.
49. Build a style guide page showcasing typography, color tokens, and component usage.
50. Add automated lint rule documentation explaining custom ESLint checks in the repo.

## Performance, QA & Tooling

51. Introduce bundle analysis tooling (`next-bundle-analyzer`) with documented workflow.
52. Optimize image assets using modern formats (WebP/AVIF) and update import paths.
53. Add service worker tests ensuring offline caching includes critical shell assets.
54. Configure pa11y CI scripts to run against key pages and document the baseline results.
55. Improve Lighthouse performance scores by auditing blocking scripts and unused CSS.
56. Add end-to-end Playwright tests for login/contact flows to prevent regressions.
57. Automate dependency update checks with Renovate and document merge procedures.
58. Implement error boundary coverage reports to ensure all desktop windows handle errors gracefully.
59. Set up visual regression tests for core windows using Playwright's screenshot comparison.
60. Create a release checklist template summarizing QA steps, feature flags, and deployment notes.
