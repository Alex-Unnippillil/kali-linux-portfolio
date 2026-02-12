# UI Polish Task List

This document tracks UI polish tasks for the Kali/Ubuntu inspired desktop experience. Each item includes acceptance criteria and file hints.

## A) Windowing & Desktop interactions

1. **Snap-to-grid for move and resize**
   - **Accept:** Dragging and resizing snaps to an 8 px grid. Toggle in Settings.
   - **Where:** `components/base/window/*`, `components/screen/desktop.js`, `hooks/usePersistentState.ts`.
   - **Why:** Consistent rhythm improves perceived quality.

2. **Window size presets**
   - **Accept:** Context menu offers sizes: 960×600, 1200×800, 1440×900.
   - **Where:** `components/context-menus/*`, window component.

3. **GNOME-like maximize on titlebar double-click**
   - **Accept:** Double-click titlebar toggles maximize.
   - **Where:** window chrome component.
   - **Ref:** GNOME window patterns.

4. **Edge snap (tiling)**
   - **Accept:** Dragging to left or right edge snaps to half screen, top edge maximizes.
   - **Where:** desktop drag controller.

5. **Keyboard window management**
   - **Accept:** Alt+Tab app switcher, Alt+\` intra-app cycling, Super+Arrow tiling.
   - **Where:** desktop keymap handler.

6. **Remember window positions per app**
   - **Accept:** Reopen restores last size and position per app key.
   - **Where:** `usePersistentState.ts`.

7. **Focus ring and z-index clarity**
   - **Accept:** Active window has clear focus ring and shadow, no ambiguity with stacked windows.
   - **Where:** window CSS, Tailwind tokens.

8. **Dock running indicators**
   - **Accept:** Running apps show a small pill indicator. Click dock icon focuses existing window before spawning new one.
   - **Where:** dock component, app launcher logic.

9. **Dock context menu**
   - **Accept:** Right-click dock icon shows Quit, Hide, New Window, Unpin.
   - **Where:** `components/context-menus/*`.

10. **Window controls hit area**
    - **Accept:** Close, Minimize, Maximize hit targets ≥ 40×40 CSS px, with hover and pressed states.
    - **Where:** titlebar CSS and events.

11. **Resizable edges and corners**
    - **Accept:** Cursor changes on edges and corners, resize feels native with 8 px handles.
    - **Where:** window chrome.

12. **Workspaces (virtual desktops) MVP**
    - **Accept:** Shortcut Ctrl+Super+Left/Right cycles 2–3 workspaces; windows are scoped.
    - **Where:** desktop state machine.

13. **Window min size constraints**
    - **Accept:** Apps cannot resize below content-fit minimums; aspect guard keeps within ~1.6:1 golden ratio band for dialogs.
    - **Where:** window constraints.

14. **Alt-Tab overlay polish**
    - **Accept:** Smooth 150–200 ms fade and scale in, row of app icons with labels.
    - **Where:** overlay component; follow motion ranges.

## B) Responsive layout & sizing

15. **HiDPI awareness**
    - **Accept:** On `devicePixelRatio>=1.5`, increase titlebar height and icon sizes by 12–16%.
    - **Where:** CSS variables in `styles/index.css`, Settings toggle.

16. **Small screens fallback**
    - **Accept:** At ≤ 360×640, desktop falls back to single-window mode with app drawer.
    - **Where:** desktop layout, media queries.

17. **Taskbar density setting**
    - **Accept:** Compact, Comfortable, Spacious densities adjust paddings on a 4 or 8 px step.
    - **Where:** Tailwind theme tokens.

18. **Safe-area insets**
    - **Accept:** Dock and notifications avoid notches using `env(safe-area-inset-*)`.
    - **Where:** CSS.

19. **Portrait behavior**
    - **Accept:** Windows open centered and sized to 90% width on portrait; dialogs stacked.
    - **Where:** new-window sizing util.

20. **Content overflow guards**
    - **Accept:** Apps using iframes or canvases never overflow titlebar; scrollbars styled.
    - **Where:** app shells.

21. **Title truncation and tooltips**
    - **Accept:** Ellipsize long window titles, show full text on hover.
    - **Where:** titlebar.

22. **Bootstrap grid equivalence via Tailwind**
    - **Accept:** A simple 12-col grid utility in Tailwind for internal layouts.
    - **Where:** `tailwind.config.js`.

## C) Visual design & theming

23. **Ubuntu/Kali theme tokens audit**
    - **Accept:** One source of truth for colors, radii, shadows, spacing scale; tokens documented.
    - **Where:** `tailwind.config.js`, `styles/index.css`.

24. **Shadow elevation scale**
    - **Accept:** 4 levels: dock, window inactive, active, modal; consistent blurs and offsets.
    - **Where:** CSS tokens.

25. **Accent color setting**
    - **Accept:** Choose from 6 accents; applies to focus, selection, controls; stored persistently.
    - **Where:** Settings app + CSS variables.

26. **Wallpaper fit and blur**
    - **Accept:** Wallpapers are `object-fit: cover` with soft blur on login/lock screens.
    - **Where:** desktop and lock components.

27. **Iconography pass**
    - **Accept:** SVG icons normalized to a 24 px grid with a consistent 1.5 px stroke; shapes land on the pixel grid to avoid blur.
    - **How:** Use the shared helpers in `components/icons/IconBase.tsx` and keep decorative glyphs `aria-hidden`.
    - **Where:** `components/icons/*`, `public/images/*`.

28. **Hover and pressed states**
    - **Accept:** Dock tiles, app grid, buttons have clear hover and pressed; 100–150 ms ease out.
    - **Where:** CSS transitions.

29. **High-contrast theme**
    - **Accept:** Accessible theme toggle with WCAG AA contrast for text and key UI.
    - **Where:** theme tokens.

30. **Window border and corner polish**
    - **Accept:** 1 px hairline borders with subtle inner highlights; corner radius consistent.

## D) Performance & loading

31. **LCP optimization on desktop boot**
    - **Accept:** Largest Contentful Paint ≤ 2.0 s on mid-range mobile on Vercel.
    - **Where:** prioritize first wallpaper and main heading; use Next `<Image>` with proper `sizes`, `priority`.

32. **Avoid layout shift (CLS)**
    - **Accept:** CLS < 0.02 across pages; reserve space for dock and window chrome.
    - **Where:** CSS min-height rules; Next `<Image>` with width/height or `fill`.

33. **Bundle trims for heavy apps**
    - **Accept:** Verify dynamic import with prefetch hints for games, ensure no heavy libs leak into desktop shell.
    - **Where:** `apps.config.js`, dynamic imports; already supported, extend coverage.

34. **Idle prefetch of likely apps**
    - **Accept:** On idle, prefetch top 3 recent apps.
    - **Where:** desktop idle callback; dynamic import prefetch.

35. **Canvas and worker offloading**
    - **Accept:** Games render on `OffscreenCanvas` where available; logic in a Worker to reduce main thread jank.
    - **Where:** `components/apps/Games/*`, `workers/*`.
    - **Note:** You already mock workers in tests.

36. **Virtualize app grid**
    - **Accept:** App grid remains smooth at 120+ items with virtualization.
    - **Where:** app catalog grid component.

37. **Throttle window shadows on move**
    - **Accept:** While dragging, simplify expensive effects, restore on drop.
    - **Where:** CSS class toggles during drag.

38. **Image formats and `next/image` audit**
    - **Accept:** Convert wallpapers and big icons to WebP/AVIF; set correct `sizes`; add blur placeholders for hero imagery.
    - **Where:** `public/images`, usages.

39. **Preload critical fonts**
    - **Accept:** Preload base UI font with `font-display: swap` and unicode-range subsets.
    - **Where:** `_document.jsx` or `<Head>` in Pages.

40. **Analyze with Speed Insights and Lighthouse budgets**
    - **Accept:** Set thresholds and track in CI; address regressions.
    - **Where:** Vercel Speed Insights already integrated in `_app.jsx`.

## E) Accessibility

41. **Keyboard-first navigation**
    - **Accept:** Full desktop and app grid operable by keyboard (Tab, Arrow, Enter, Escape), with visible focus.
    - **Where:** focus management in desktop and window components.

42. **ARIA for window chrome**
    - **Accept:** Titlebar buttons have `aria-label`s, window has `role="dialog"` or `region"` with descriptive `aria-labelledby`.
    - **Where:** window component.

43. **Live regions for terminal output**
    - **Accept:** Terminal app announces new output via `aria-live="polite"` with rate limiting.
    - **Where:** terminal app.

44. **Reduced motion support**
    - **Accept:** `prefers-reduced-motion` respected, sets zero or minimal animations.
    - **Where:** global CSS and motion helpers.

45. **Color contrast checks**
    - **Accept:** All text meets WCAG AA; verify with `pa11y` script.
    - **Where:** `pa11yci.json`, Tailwind tokens.

46. **Skip to desktop content**
    - **Accept:** Hidden “Skip to desktop” link focuses app grid on activation.
    - **Where:** `_app.jsx` or layout.

47. **Dialog semantics for modals**
    - **Accept:** Lock screen, settings, and prompts use `role="dialog"` with focus trap and `aria-modal="true"`.
    - **Where:** respective components.

48. **High-contrast theme validation**
    - **Accept:** Automated checks for contrast across states using `pa11y` scenarios.
    - **Where:** `pa11yci.json`.

49. **Tooltips accessible**
    - **Accept:** Tooltips are announced on focus, not only hover.

## F) App UX improvements

50. **Gedit contact form UX**
    - **Accept:** Inline validation, clear error text, loading state, success toast; Recaptcha errors surfaced.
    - **Where:** Gedit app; env vars already specified in README.

51. **Firefox app permissions UI**
    - **Accept:** Explicit message about sandboxed iframes and limited capabilities; tighten CSP and image domains for embeds.
    - **Where:** Firefox app; `next.config.js` CSP list.

52. **Project Gallery lazy loading**
    - **Accept:** Cards lazy-load images with aspect boxes to avoid CLS; blur placeholders.
    - **Where:** gallery app; `<Image>` audit.

53. **Games help overlay consistency**
    - **Accept:** Standardized overlay for controls, pause, restart; same keybind to toggle.
    - **Where:** `components/apps/Games/common/*`.

54. **Weather app responsiveness**
    - **Accept:** Cards wrap cleanly at 320 px width, no overflow; skeletons while loading.
    - **Where:** weather app.

55. **Alex app and About content spacing**
    - **Accept:** Adopt 8 px baseline rhythm across headings, paragraphs, and lists.
    - **Where:** Alex/About app styles.

## G) PWA & offline polish

56. **Offline desktop and app-fallback page**
    - **Accept:** Friendly offline screen with retry and cached apps list; SW caches minimal shell.
    - **Where:** `public/`, PWA config. ([ducanh-next-pwa.vercel.app][12])

57. **Install prompt UX**
    - **Accept:** Non-intrusive “Install” entry in Settings and Help; show only when `beforeinstallprompt` fires.
    - **Where:** PWA prompt handler.

58. **Share target to Sticky Notes**
    - **Accept:** Web Share Target pushes text/URLs into Sticky Notes; documented in README.
    - **Where:** `manifest.json`, notes app; aligns with your PWA share flow.

## H) SEO, metadata, social

59. **`<SEO/Meta>` audit**
   - **Accept:** Titles, descriptions, canonical, Open Graph images for desktop and key apps; JSON‑LD for Person and Project list.
   - **Where:** `components/SEO/Meta.js`.

60. **Image sizes for social previews**
   - **Accept:** 1200×630 Open Graph, 1080×1080 square fallback; served as static files and referenced in meta.
   - **Where:** `public/images/social/*`.

## I) Whisker menu mobile optimization

61. **Mobile-first layout pass**
   - **Accept:** At viewports ≤ 768 px, the whisker menu expands to a full-height sheet anchored to the bottom, with safe-area padding and scrollable content that never clips under the notch.
   - **Where:** `components/menu/WhiskerMenu.tsx`, Tailwind utility tokens.

62. **Touch-friendly categories**
   - **Accept:** Category list converts to horizontally scrollable chips with 48 px minimum touch targets, swipe support, and retains keyboard focus loops.
   - **Where:** `components/menu/WhiskerMenu.tsx`, supporting CSS.

63. **Sticky search and quick actions**
   - **Accept:** Search input remains pinned to the top when scrolling; quick favorite shortcuts wrap to two columns with 56 px targets on mobile.
   - **Where:** `components/menu/WhiskerMenu.tsx`.

64. **One-handed reach mode toggle**
   - **Accept:** Settings exposes a "One-handed mode" switch that repositions close/launch actions toward the bottom on small screens; persisted per device.
   - **Where:** `components/menu/WhiskerMenu.tsx`, Settings store, menu layout helpers.

