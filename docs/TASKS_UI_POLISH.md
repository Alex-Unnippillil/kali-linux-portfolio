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
    - **Accept:** SVG icons normalized to common grid (e.g., 24 or 32), consistent stroke widths.
    - **Where:** `public/images/*`.

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

## J) Onboarding & guidance

65. **First-run desktop tour**
   - **Accept:** First visit surfaces a 4-step overlay explaining dock, launcher, windows, and settings; dismissible with "Don't show again" stored in persistent state.
   - **Where:** `components/screen/desktop-tour/*`, `hooks/usePersistentState.ts`.

66. **Contextual help hotspots**
   - **Accept:** Optional info dots on complex apps reveal tooltips with short guidance; toggle from Settings.
   - **Where:** `components/base/window/WindowChrome.tsx`, app-specific wrappers.

67. **Quick-start checklist widget**
   - **Accept:** Dock shortcut opens a checklist modal highlighting key interactions; items persist completion per user.
   - **Where:** `components/util-components/checklist/*`, `stores/uiStore.ts`.

68. **Launcher empty-state copy**
   - **Accept:** When search yields no apps, display helpful text plus a button to open the feedback form.
   - **Where:** `components/screen/launcher/AppSearchResults.tsx`.

69. **In-app keyboard cheatsheet**
   - **Accept:** Pressing `?` with focus on desktop opens overlay listing shortcuts; respects reduced-motion setting.
   - **Where:** `components/screen/overlays/ShortcutSheet.tsx`, `hooks/useGlobalHotkeys.ts`.

70. **Feedback nudge toast**
   - **Accept:** After 3 minutes of interaction, subtle toast invites user to send feedback with dismiss + never show again control.
   - **Where:** `components/toast/*`, analytics event hook.

## K) Notifications & feedback

71. **Unified notification center**
   - **Accept:** Clock tray icon opens panel listing recent system toasts with timestamps and clear-all.
   - **Where:** `components/screen/panel/NotificationCenter.tsx`.

72. **Non-blocking progress toasts**
   - **Accept:** Long-running simulated tasks show progress bar toasts with pause/cancel affordances.
   - **Where:** `components/toast/ToastQueue.tsx`.

73. **Window-level status badges**
   - **Accept:** Apps can pass status badge text (e.g., "Syncing…") to render in titlebar corner with tooltip.
   - **Where:** `components/base/window/TitleBar.tsx`.

74. **Error boundary theming**
   - **Accept:** When a windowed app errors, show branded fallback with retry button instead of raw message.
   - **Where:** `components/base/window/ErrorBoundary.tsx`.

75. **Screenshot success feedback**
   - **Accept:** Taking a screenshot triggers haptic-like pulse and toast with "Copy" + "Open folder" actions.
   - **Where:** `components/screen/desktop/ScreenshotButton.tsx`, `hooks/useClipboard.ts`.

76. **Notification sound palette**
   - **Accept:** Provide 4 subtle sound themes selectable in Settings with preview playback and stored preference.
   - **Where:** `settingsStore.js`, `components/audio/NotificationSounds.ts`.

## L) Navigation & discoverability

77. **Global command palette**
   - **Accept:** `Ctrl+K` opens searchable palette for apps, settings, commands; supports keyboard navigation.
   - **Where:** `components/screen/overlays/CommandPalette.tsx`, `hooks/useCommandRegistry.ts`.

78. **Launcher categories row**
   - **Accept:** App drawer adds horizontal filter chips (All, Tools, Games, Utilities) with smooth indicator.
   - **Where:** `components/screen/launcher/CategoryTabs.tsx`.

79. **Recent files list**
   - **Accept:** Desktop exposes quick-access recent docs with icons and open-in-app mapping.
   - **Where:** `stores/filesStore.ts`, `components/widgets/RecentFilesCard.tsx`.

80. **Search-as-you-type highlight**
   - **Accept:** Matching characters in launcher search are visually highlighted for clarity.
   - **Where:** `components/screen/launcher/AppSearchResult.tsx`.

81. **Dock reorder via drag**
   - **Accept:** Users drag dock icons to reorder favorites with animated placeholder.
   - **Where:** `components/screen/dock/DockIcon.tsx`, `hooks/useDragList.ts`.

82. **Cross-app deep link handling**
   - **Accept:** Opening `app://` links from Terminal or docs focuses existing windows or spawns new ones gracefully.
   - **Where:** `utils/appLinks.ts`, desktop manager.

## M) Motion & micro-interactions

83. **Physics-based window easing**
   - **Accept:** Window move/resize transitions use spring easing with velocity clamping under reduced-motion guard.
   - **Where:** `components/base/window/WindowMotion.tsx`.

84. **Launcher icon hover lift**
   - **Accept:** App icons subtly lift and cast shadow on hover, settling with overshoot.
   - **Where:** `styles/components/launcher.css`.

85. **Dock minimize animation**
   - **Accept:** Minimizing window animates toward dock icon with scale/opacity tween.
   - **Where:** `components/base/window/animations.ts`.

86. **Notification center reveal**
   - **Accept:** Panel slides with 200 ms cubic-bezier and opacity fade, accessible fallback when reduced motion.
   - **Where:** `components/screen/panel/NotificationCenter.tsx`.

87. **Loading skeletons for heavy apps**
   - **Accept:** Canvas-heavy apps show skeleton placeholders and shimmer while dynamic import loads.
   - **Where:** `components/base/AppContainer.tsx`.

88. **Wallpaper transition fade**
   - **Accept:** Switching wallpaper crossfades over 300 ms with optional blur pre/post.
   - **Where:** `components/screen/desktop/WallpaperLayer.tsx`.

## N) Accessibility extensions

89. **High-contrast icon set**
   - **Accept:** Provide alternative icon assets with higher contrast automatically when high-contrast theme enabled.
   - **Where:** `public/icons/high-contrast/*`, theme switcher.

90. **Screen reader desktop map**
   - **Accept:** Expose ARIA landmarks describing dock, launcher, desktop windows order.
   - **Where:** `components/screen/desktop/DesktopRegion.tsx`.

91. **Keyboard resizing shortcuts**
   - **Accept:** `Alt+Shift+Arrow` adjusts window size in 40 px increments with announcements.
   - **Where:** `hooks/useWindowHotkeys.ts`.

92. **Accessible color picker**
   - **Accept:** Theme picker includes text inputs for hex and WCAG compliance indicator.
   - **Where:** `components/apps/settings/ThemePicker.tsx`.

93. **Focus trap in modals**
   - **Accept:** All modals enforce focus trap, close on Escape, and return focus to invoker.
   - **Where:** `components/base/modal/Modal.tsx`.

94. **Caption support for media apps**
   - **Accept:** Media players surface captions toggle and remember preference.
   - **Where:** `components/apps/media/*`.

## O) Internationalization & localization

95. **Language switcher UI**
   - **Accept:** Settings adds language dropdown with instant locale swap using Next i18n routing.
   - **Where:** `settingsStore.js`, `lib/i18n.ts`.

96. **Localized date/time formatting**
   - **Accept:** Clock, notifications, and file timestamps respect selected locale and timezone.
   - **Where:** `utils/formatters/date.ts`.

97. **RTL layout validation**
   - **Accept:** Desktop chrome, dock, and launcher support RTL mirroring with CSS logical properties.
   - **Where:** `styles/index.css`, layout helpers.

98. **Localized onboarding copy**
   - **Accept:** Tour and tooltips pull strings from translation files with fallback to English.
   - **Where:** `public/locales/*`, onboarding components.

99. **Number formatting for metrics**
   - **Accept:** Resource monitor and analytics widgets format numbers per locale separators.
   - **Where:** `utils/formatters/number.ts`.

100. **Font stack adjustments per locale**
   - **Accept:** Provide locale-specific font fallbacks (e.g., CJK) without layout shift.
   - **Where:** `_document.jsx`, `styles/typography.css`.

## P) Settings & personalization depth

101. **Custom keybinding manager**
   - **Accept:** Settings includes grid to remap global shortcuts with reset defaults.
   - **Where:** `components/apps/settings/Keybindings.tsx`, `hooks/useShortcutRegistry.ts`.

102. **Per-app theme overrides**
   - **Accept:** Users can assign accent variants per app; stored and applied on window focus.
   - **Where:** `stores/themeStore.ts`, app display wrappers.

103. **Desktop icon sizing slider**
   - **Accept:** Slider adjusts app grid icon size between 64–112 px with live preview.
   - **Where:** `components/apps/settings/DesktopAppearance.tsx`.

104. **Dynamic wallpaper playlists**
   - **Accept:** Users create wallpaper rotation playlists with intervals, pause/resume.
   - **Where:** `components/apps/settings/WallpaperScheduler.tsx`, `hooks/useInterval.ts`.

105. **Session restore preference**
   - **Accept:** Toggle to reopen previous session windows on boot; stores state snapshot.
   - **Where:** `stores/sessionStore.ts`, desktop boot logic.

106. **Ambient background audio**
   - **Accept:** Optional ambient loops with volume slider in Settings; pauses on video playback.
   - **Where:** `components/audio/AmbientPlayer.tsx`.

## Q) Desktop widgets & surfaces

107. **Calendar widget redesign**
   - **Accept:** Month view with event dots, add event button linking to notes app.
   - **Where:** `components/widgets/CalendarWidget.tsx`.

108. **Weather widget cards**
   - **Accept:** Desktop shows mini weather card with gradient backgrounds matching conditions.
   - **Where:** `components/widgets/WeatherWidget.tsx`.

109. **System health heads-up display**
   - **Accept:** Compact overlay summarizing CPU, memory, storage with sparkline.
   - **Where:** `components/widgets/SystemHud.tsx`.

110. **Sticky notes refresh**
   - **Accept:** Notes have color themes, markdown-lite support, drag ordering, persistence.
   - **Where:** `components/apps/stickies/*`.

111. **Notification summary widget**
   - **Accept:** Desktop widget summarizing unread notifications and quick actions.
   - **Where:** `components/widgets/NotificationSummary.tsx`.

112. **Media control mini-player**
   - **Accept:** Persistent mini-player for active media apps with album art and transport controls.
   - **Where:** `components/widgets/NowPlaying.tsx`.

## R) App-specific UI refinements

113. **Terminal theme selector**
   - **Accept:** Terminal offers selectable color schemes with preview grid.
   - **Where:** `components/apps/terminal/ThemePicker.tsx`.

114. **Calculator history timeline**
   - **Accept:** Calc app shows scrollable history with tap-to-reuse results and export.
   - **Where:** `components/apps/calc/HistoryPanel.tsx`.

115. **Project gallery masonry layout**
   - **Accept:** Projects grid switches to responsive masonry with lazy-loaded thumbnails.
   - **Where:** `components/apps/projects/ProjectGrid.tsx`.

116. **Resource monitor dark/light charts**
   - **Accept:** Charts adapt colors per theme with accessible contrast.
   - **Where:** `components/apps/resource-monitor/Charts.tsx`.

117. **About app timeline section**
   - **Accept:** Timeline visualization for career milestones with scroll-snap.
   - **Where:** `components/apps/about/Timeline.tsx`.

118. **Contact form confirmation modal**
   - **Accept:** After submit, show modern confirmation modal with follow-up links and copy-to-clipboard email.
   - **Where:** `components/apps/contact/ConfirmationModal.tsx`.

## S) Observability & UX research hooks

119. **Session replay opt-in banner**
   - **Accept:** Provide optional privacy-respecting session replay toggle with explanatory copy (no actual tracking yet).
   - **Where:** `components/screen/overlays/PrivacyBanner.tsx`.

120. **In-app feedback form refresh**
   - **Accept:** Feedback modal supports categories, screenshot attachment, sentiment rating.
   - **Where:** `components/apps/feedback/FeedbackForm.tsx`.

121. **UX metrics dashboard**
   - **Accept:** Internal-only dashboard visualizing core Web Vitals and engagement metrics with dummy data.
   - **Where:** `components/apps/analytics/ExperienceDashboard.tsx`.

122. **User journey logging stub**
   - **Accept:** Add logging hooks that emit anonymized events to console/storage for future analytics (no network calls).
   - **Where:** `hooks/useUXEvents.ts`, `stores/analyticsStore.ts`.

123. **Survey prompt scheduler**
   - **Accept:** After defined sessions count, prompt short survey with skip/dismiss persistence.
   - **Where:** `components/screen/overlays/SurveyPrompt.tsx`.

124. **Changelog spotlight modal**
   - **Accept:** New releases trigger modal summarizing changes with "Got it" and "Learn more" links.
   - **Where:** `components/apps/changelog/ReleaseSpotlight.tsx`.

