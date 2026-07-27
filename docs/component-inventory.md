# Component Inventory

This document catalogues reusable UI elements under `components/`, `app/`, and `apps/`, including their props, variants, and usage counts. It also notes duplicated patterns and proposes migration plus codemod guidance.

## Contents
- [components/ (core library)](#components-core-library)
- [components/apps/ (app surfaces)](#componentsapps-app-surfaces)
- [app/ directory](#app-directory)
- [apps/ directory](#apps-directory)
- [Duplicate or divergent variants](#duplicate-or-divergent-variants)
- [Codemod plans](#codemod-plans)

## Methodology
Inventory is based on static inspection of each component file and repository-wide usage searches (`rg`). Usage counts exclude tests unless otherwise noted.

## components/ (core library)

### Top-level components

| Component | Path | Props | Variants | Usage |
| --- | --- | --- | --- | --- |
| BadgeList | `components/BadgeList.js` | `badges`, `className` | – | 0 external references【F:components/BadgeList.js†L4-L107】【b2dcb9†L1-L3】 |
| BetaBadge | `components/BetaBadge.jsx` | none | Gate on `NEXT_PUBLIC_SHOW_BETA` | `pages/index` only【F:components/BetaBadge.jsx†L1-L11】【d29301†L1-L9】 |
| CommandBuilder | `components/CommandBuilder.tsx` | `doc`, `build` | – | `components/apps/security-tools`【F:components/CommandBuilder.tsx†L5-L39】【6e350f†L1-L6】 |
| ExplainerPane | `components/ExplainerPane.tsx` | `lines`, `resources` | – | `components/apps/security-tools`【F:components/ExplainerPane.tsx†L1-L36】【aaab57†L1-L6】 |
| ExternalFrame | `components/ExternalFrame.js` | `src`, `title`, `prefetch`, `onLoad`, rest props | Allowed sources only | `apps/vscode`【F:components/ExternalFrame.js†L1-L88】【b1567c†L1-L6】 |
| FixturesLoader | `components/FixturesLoader.tsx` | `onData` | – | `components/apps/security-tools`【F:components/FixturesLoader.tsx†L1-L57】【13e774†L1-L6】 |
| GitHubStars | `components/GitHubStars.js` | `user`, `repo` | – | `components/apps/alex`, `apps/About` (×2)【F:components/GitHubStars.js†L4-L66】【bbe3bf†L1-L11】 |
| HelpPanel | `components/HelpPanel.tsx` | `appId`, `docPath?` | – | `components/apps/terminal`【F:components/HelpPanel.tsx†L7-L61】【39250c†L1-L6】 |
| InstallButton | `components/InstallButton.tsx` | none | Shows when `a2hs:available` event | `pages/index` only【F:components/InstallButton.tsx†L7-L34】【35a68d†L1-L8】 |
| LabMode | `components/LabMode.tsx` | `children` | Banner toggles lab mode | `components/apps/security-tools`【F:components/LabMode.tsx†L9-L37】【2fd6eb†L5-L10】 |
| ModuleCard | `components/ModuleCard.tsx` | `module`, `onSelect`, `selected`, `query?` | – | `pages/post_exploitation`【F:components/ModuleCard.tsx†L5-L46】【c8600a†L1-L6】 |
| NetworkAttackStepper | `components/NetworkAttackStepper.tsx` | internal state only | Stepper for attack phases | Unused outside definition【F:components/NetworkAttackStepper.tsx†L1-L137】【85d252†L1-L3】 |
| PipPortalProvider (legacy) | `components/PipPortal.tsx` | children; context exposes `open`, `close` | Legacy PiP portal without `isOpen` | Unused (superseded by `components/common/PipPortal`)【F:components/PipPortal.tsx†L1-L78】【686ede†L1-L6】 |
| PopularModules | `components/PopularModules.tsx` | internal state only | – | `pages/popular-modules`【F:components/PopularModules.tsx†L1-L359】【26f532†L7-L12】 |
| ResultViewer | `components/ResultViewer.tsx` | `data` | Tabs: raw/parsed/chart | `components/apps/security-tools`【F:components/ResultViewer.tsx†L1-L98】【0e22b3†L1-L6】 |
| Meta | `components/SEO/Meta.js` | none | Static metadata payload | Used on 6 marketing pages【F:components/SEO/Meta.js†L5-L55】【8c3d67†L1-L11】 |
| ScrollableTimeline | `components/ScrollableTimeline.tsx` | internal state only | Views: year vs month | `pages/profile`, `components/apps/About`【F:components/ScrollableTimeline.tsx†L20-L173】【5347c8†L1-L9】 |
| SettingsDrawer | `components/SettingsDrawer.tsx` | `highScore?` | Theme/accent selectors | Not imported (candidate for removal)【F:components/SettingsDrawer.tsx†L6-L54】【e1bbdc†L1-L3】 |
| SpriteStripPreview | `components/SpriteStripPreview.tsx` | `src`, `frameWidth`, `frameHeight`, `frames`, `fps?` | – | Tests only【F:components/SpriteStripPreview.tsx†L6-L55】【f5cc8e†L1-L8】 |
| StatsChart | `components/StatsChart.js` | `count`, `time` | – | Hashcat & John apps (both TS/JS entrypoints)【F:components/StatsChart.js†L1-L20】【9185ee†L1-L12】 |
| Tabs | `components/Tabs.tsx` | `tabs`, `active`, `onChange`, `className?` | Generic tablist | `apps/settings`, `pages/qr`【F:components/Tabs.tsx†L1-L31】【4a46a1†L1-L4】 |
| TerminalOutput | `components/TerminalOutput.tsx` | `text`, `ariaLabel?` | Copy buttons per line | CommandBuilder, dsniff app【F:components/TerminalOutput.tsx†L3-L31】【e51cbc†L1-L7】 |
| ToggleSwitch | `components/ToggleSwitch.tsx` | `checked`, `onChange`, `className?`, `ariaLabel` | – | Settings app, Preferences panel【F:components/ToggleSwitch.tsx†L4-L28】【fa02ba†L1-L8】 |
| Toolbar icon set | `components/ToolbarIcons.tsx` | none | Icon variants (close/minimize/maximize/restore/pin) | VS Code wrapper toolbar【F:components/ToolbarIcons.tsx†L1-L38】【4bf80e†L1-L3】 |
| UseRouteAbortGuard | `components/UseRouteAbortGuard.tsx` | none | Resets `window.routeAbortController` on navigation | Not imported【F:components/UseRouteAbortGuard.tsx†L1-L24】【ee2260†L1-L3】 |
| WarningBanner | `components/WarningBanner.tsx` | `children` | – | NetworkAttackStepper, Mimikatz app【F:components/WarningBanner.tsx†L3-L13】【79e679†L1-L9】 |
| WorkflowCard | `components/WorkflowCard.tsx` | none | Fixed workflow steps | `pages/security-education`【F:components/WorkflowCard.tsx†L1-L48】【796c9f†L1-L4】 |
| YouTubePlayer | `components/YouTubePlayer.js` | `videoId` | Rich player (chapters, PiP) | Currently unused【F:components/YouTubePlayer.js†L1-L200】【6e15ae†L1-L1】 |
| TweetEmbed | `components/tweet-embed.js` | `id` | Fetches sanitized tweet HTML | Not imported (candidate for removal)【F:components/tweet-embed.js†L1-L55】【df0d35†L1-L2】 |

### Base windowing components

| Component | Path | Props | Variants | Usage |
| --- | --- | --- | --- | --- |
| Modal | `components/base/Modal.tsx` | `isOpen`, `onClose`, `children`, `overlayRoot?` | Focus trap & inert overlay | Not used beyond tests (available for future modals)【F:components/base/Modal.tsx†L5-L92】【887d88†L1-L3】 |
| SideBarApp | `components/base/side_bar_app.js` | expects `id`, `title`, `icon`, `isClose`, `isFocus`, `openApp`, `isMinimized`, `openFromMinimised`, `notifications`, `tasks` | Thumbnail hover/preview variant | Used in dock/sidebar rendering【F:components/base/side_bar_app.js†L5-L138】【06143e†L1-L6】 |
| UbuntuApp | `components/base/ubuntu_app.js` | `id`, `icon`, `name`, `displayName?`, `openApp`, `prefetch?`, `disabled?` | Launch animation on open | Used across app grid, favorites, and menu listings【F:components/base/ubuntu_app.js†L5-L86】【ab4825†L1-L12】 |
| Window, WindowTopBar, WindowX/YBorder, WindowEditButtons, WindowMainScreen | `components/base/window.js` | Extensive window manager props (`id`, `title`, sizing defaults, focus handlers, overlayRoot`, etc.) | Supports snapping, maximized, pinned states | Core desktop window shell and exported subcomponents for pages like `security-education` and `nessus-dashboard`【F:components/base/window.js†L1-L180】【6bcad5†L1-L4】 |

### Common utilities & overlays

| Component | Path | Props | Variants | Usage |
| --- | --- | --- | --- | --- |
| ContextMenu | `components/common/ContextMenu.tsx` | `targetRef`, `items` | Roving tabindex vertical menu | Provide accessible context menu wrapper (currently unused vs legacy menus)【F:components/common/ContextMenu.tsx†L1-L119】 |
| NotificationCenter provider | `components/common/NotificationCenter.tsx` | children via context | Tracks notifications per app and sets app badge | Defined but not mounted in app shell【F:components/common/NotificationCenter.tsx†L1-L80】【7db8a4†L1-L6】 |
| PdfViewer | `components/common/PdfViewer/index.tsx` | `url` | Thumbnail rail, search | Only covered by tests currently【F:components/common/PdfViewer/index.tsx†L8-L143】【0292cd†L1-L9】 |
| PipPortalProvider | `components/common/PipPortal.tsx` | children; context exposes `open`, `close`, `isOpen` | Doc-PiP aware portal | Used in `_app`, VideoPlayer, doc slides, `useDocPiP` hook【F:components/common/PipPortal.tsx†L8-L95】【17eec0†L1-L7】 |
| ShortcutOverlay | `components/common/ShortcutOverlay.tsx` | none | Toggles overlay via keymap, exports conflicts | Mounted in `_app` with keyboard shortcut integration【F:components/common/ShortcutOverlay.tsx†L1-L115】【2948c5†L6-L11】 |

### Legacy context menus

| Component | Path | Props | Variants | Usage |
| --- | --- | --- | --- | --- |
| DefaultMenu | `components/context-menus/default.js` | `active`, `onClose` | Static contact/reset entries | Desktop attaches for general context menu【F:components/context-menus/default.js†L1-L61】【425018†L1-L2】 |
| AppMenu | `components/context-menus/app-menu.js` | `active`, `app`, `toggleFavourite`, `closeWindow`, etc. | Manage favorites and window state | Desktop app context menu【F:components/context-menus/app-menu.js†L1-L120】【2db5fb†L1-L10】 |
| DesktopMenu | `components/context-menus/desktop-menu.js` | `active`, `changeBackgroundImage` | Background picker | Desktop root context menu【F:components/context-menus/desktop-menu.js†L1-L105】【67ce2f†L1-L9】 |
| TaskbarMenu | `components/context-menus/taskbar-menu.js` | `active`, `pin`, `close`, `openSettings` | Taskbar item actions | Taskbar context menu【F:components/context-menus/taskbar-menu.js†L1-L139】【c8a4a5†L1-L10】 |

### Menu, panel, and simulator

| Component | Path | Props | Variants | Usage |
| --- | --- | --- | --- | --- |
| WhiskerMenu | `components/menu/WhiskerMenu.tsx` | internal state (query, category); dispatches `open-app` event | Categories: all, favorites, recent, utilities, games | Rendered in top navbar menu【F:components/menu/WhiskerMenu.tsx†L1-L183】【b9e5c7†L1-L6】 |
| Preferences panel | `components/panel/Preferences.tsx` | internal tab state; uses `Tabs`, `ToggleSwitch` | Tabs for display/measurements/appearance/opacity/items | Defined but not imported anywhere yet【F:components/panel/Preferences.tsx†L1-L103】【90f334†L1-L2】 |
| Simulator UI | `components/simulator/index.tsx` | No external props; uses lab mode/persistent state | Tabs raw/parsed, CSV export, worker parsing | Currently unused (candidate for integration)【F:components/simulator/index.tsx†L1-L164】【85c3f5†L1-L2】 |

### Game framework

| Component | Path | Props | Variants | Usage |
| --- | --- | --- | --- | --- |
| GameShell | `components/games/GameShell.tsx` | `game`, `children`, optional `controls`, `settings`, `onPause`, `onResume` | Provides pause/mute/export/import scaffolding | Used by multiple standalone game routes (`games/2048`, `games/sudoku`, `games/wordle`, `games/snake`, etc.)【F:components/games/GameShell.tsx†L1-L88】【6ac3bc†L1-L9】 |
| VirtualControls | `components/games/VirtualControls.jsx` | `buttons`, `onInput` | Touch control overlay | Consumed by mobile-friendly games (search-based)【F:components/games/VirtualControls.jsx†L1-L110】【1624bc†L1-L10】 |
| GameSettingsPanel | `components/game/GameSettingsPanel.jsx` | `settings`, `onChange` | Simple toggles | Shared in retro game components【F:components/game/GameSettingsPanel.jsx†L1-L110】【99d71b†L1-L10】 |

### Utility components

| Component | Path | Props | Variants | Usage |
| --- | --- | --- | --- | --- |
| BackgroundImage | `components/util-components/background-image.js` | none (reads wallpaper from settings) | Adds gradient overlay when needed | Desktop background renderer【F:components/util-components/background-image.js†L1-L41】【3a34a5†L1-L9】 |
| Clock | `components/util-components/clock.js` | none | Displays time/date with intervals | Used in navbar status bar【F:components/util-components/clock.js†L1-L90】【9e86cf†L1-L6】 |
| StatusIcon | `components/util-components/status.js` | `icon`, `text` | Renders status pill | Used inside navbar components【F:components/util-components/status.js†L1-L90】【6f6c95†L1-L2】 |
| SmallArrow | `components/util-components/small_arrow.js` | none | Static arrow icon | Used in UI arrows (navbar)【F:components/util-components/small_arrow.js†L1-L50】【313dbf†L1-L5】 |

### Screen layout components

| Component | Path | Props | Variants | Usage |
| --- | --- | --- | --- | --- |
| Desktop | `components/screen/desktop.js` | expects `bg_image_name`, `changeBackgroundImage` callbacks and window management props | Handles window lifecycle, context menus, app launching | Mounted by `components/ubuntu` as main workspace【F:components/screen/desktop.js†L1-L120】【046375†L1-L5】 |
| Navbar | `components/screen/navbar.js` | none (internal state toggles quick settings) | Embeds Whisker menu, Clock, Status | Used by Ubuntu shell header【F:components/screen/navbar.js†L1-L37】【23f363†L1-L34】 |
| LockScreen | `components/screen/lock_screen.js` | `isLocked`, `bgImgName`, `unLockScreen` | Shows time/date widgets | Toggled by Ubuntu shell lock/unlock flow【F:components/screen/lock_screen.js†L1-L80】【046375†L1-L5】 |
| BootingScreen | `components/screen/booting_screen.js` | `visible`, `isShutDown`, `turnOn` | Boot/shutdown overlay | Controlled by Ubuntu shell on start/shutdown【F:components/screen/booting_screen.js†L1-L80】【046375†L1-L5】 |
| Taskbar | `components/screen/taskbar.js` | `active`, `openApp`, `closeWindow`, etc. | Shows running apps & indicators | Rendered inside Desktop for bottom panel【F:components/screen/taskbar.js†L1-L120】【ab4825†L1-L12】 |
| SideBar | `components/screen/side_bar.js` | `apps`, `openAppByAppId`, `closed_windows`, etc. | Renders favorites dock | Used by Desktop to show pinned apps【F:components/screen/side_bar.js†L1-L80】【06143e†L1-L6】 |
| WindowSwitcher | `components/screen/window-switcher.js` | `windows`, `activeWindow`, `switchWindow` | Alt-Tab style overlay | Triggered by Desktop window manager【F:components/screen/window-switcher.js†L1-L80】 |
| AllApplications | `components/screen/all-applications.js` | `apps`, `openAppByAppId` | Grid overlay | Called from Desktop for app overview【F:components/screen/all-applications.js†L1-L90】 |
| ShortcutSelector | `components/screen/shortcut-selector.js` | `apps`, `openApp` | Keyboard launcher | Bound to Desktop shortcuts【F:components/screen/shortcut-selector.js†L1-L90】 |

## components/apps/ (app surfaces)

The majority of UI under `components/apps/` are full-screen app surfaces consumed via `createDynamicApp` in `apps.config.js`. They are loaded into desktop windows with no external props (state is internal or via hooks). Key groupings:

| Category | App IDs (component suffix) | Component notes | Usage |
| --- | --- | --- | --- |
| Productivity & utilities | `terminal`, `vscode`, `youtube`, `calculator`, `converter`, `file-explorer`, `project-gallery`, `clipboard_manager`, `screen-recorder`, `serial-terminal`, `qr`, `ascii_art`, `quote`, `sticky_notes`, `trash`, etc. | Each exports a default React component in `components/apps/<id>` handling its own state/UI (e.g., terminal, editor stubs). | Wired through `createDynamicApp` entries in `apps.config.js` and pages under `apps/<id>`【F:apps.config.js†L22-L120】【F:apps/terminal/index.tsx†L1-L24】 |
| Security simulations | `security-tools`, `nikto`, `metasploit`, `msf-post`, `nessus`, `nmap-nse`, `openvas`, `reconng`, `hydra`, `john`, `hashcat`, `wireshark`, `mimikatz`, `ettercap`, `reaver`, `ghidra`, `radare2`, etc. | Components model tool flows with lab banners, charts, etc., generally no external props. | Loaded into desktop via dynamic app registration【F:apps.config.js†L88-L132】【F:components/apps/security-tools/index.js†L1-L320】 |
| Games | `2048`, `snake`, `sudoku`, `wordle`, `solitaire`, `minesweeper`, `connect-four`, `pong`, `pacman`, `tower-defense`, `pinball`, `blackjack`, etc. | Game components rely on `GameShell`/game hooks and manage state internally. | Exposed as desktop apps and linked from `games/` routes【F:apps.config.js†L34-L74】【6ac3bc†L1-L9】 |
| System shell apps | `settings`, `x`, `spotify`, `chrome`, `weather`, `weather_widget`, `about` (`alex`), etc. | Provide first-party UX surfaces with bespoke UI. | Default exports consumed by Next pages under `apps/<id>` (one-to-one mapping).【F:apps.config.js†L1-L40】【F:apps/settings/index.tsx†L1-L290】 |

> **Note:** Many apps also have supporting components under `components/apps/<app>/` (e.g., `components/apps/john/components/*`). These are app-specific and follow the same pattern—no shared props beyond internal state. Usage counts are effectively one (mounted by the matching Next.js route).

## app/ directory

| Component | Path | Props | Variants | Usage |
| --- | --- | --- | --- | --- |
| Route error boundary | `app/error.tsx` | `{ error, reset }` (Next.js props) | Reports via `reportClientError`; retry button | Handles per-route errors in App Router【F:app/error.tsx†L1-L20】 |
| Global error fallback | `app/global-error.tsx` | `{ error, reset }` | Wraps body markup for fatal errors | App Router global error UI【F:app/global-error.tsx†L1-L30】 |

## apps/ directory

Each subdirectory under `apps/` provides the Next.js page wrapper for a desktop app. Patterns observed:

- Most pages simply import the matching `components/apps/<id>` default export and re-export it (e.g., `apps/blackjack/index.tsx`).【F:apps/blackjack/index.tsx†L1-L4】
- Some pages add additional layout or metadata (e.g., `apps/About/index.tsx` embeds marketing content around the shared component).【F:apps/About/index.tsx†L1-L120】
- Settings-heavy apps (e.g., `apps/settings/index.tsx`) house all UI directly within the page instead of `components/apps`.【F:apps/settings/index.tsx†L1-L290】

Usage counts are one per app (each route is mapped to a window entry via `apps.config.js`).

## Duplicate or divergent variants

| Area | Overlap | Recommended migration | Effort |
| --- | --- | --- | --- |
| PiP portal providers | `components/PipPortal.tsx` duplicates the provider implemented in `components/common/PipPortal.tsx` but lacks the `isOpen` state and is unused. | Remove legacy file; update imports to use `components/common/PipPortal` exclusively. | **Low** – no current consumers; delete after confirming with `rg 'components/PipPortal'` (should return empty).【F:components/PipPortal.tsx†L1-L78】【F:components/common/PipPortal.tsx†L8-L95】 |
| Context menus | New accessible `ContextMenu` component exists, yet desktop still uses bespoke menus under `components/context-menus/*`. | Gradually migrate legacy menus to render `ContextMenu` with item lists, then delete bespoke menu components. | **Medium** – requires refactor of desktop interactions and testing across right-click flows.【F:components/common/ContextMenu.tsx†L1-L119】【F:components/context-menus/default.js†L1-L61】 |
| Settings UI | `components/SettingsDrawer.tsx` offers a minimal theme/accent picker while `apps/settings/index.tsx` now provides comprehensive settings. Drawer is unused. | Remove drawer or rewire to open the full settings app from relevant surfaces to avoid divergent UX. | **Low** – confirm no imports (current `rg` shows none) then delete / replace CTA with link to settings app.【F:components/SettingsDrawer.tsx†L6-L54】【F:apps/settings/index.tsx†L1-L290】 |
| Video playback | `components/YouTubePlayer.js` implements a bespoke player; newer `components/ui/VideoPlayer.tsx` + PiP portal gives shared video controls. | Consolidate future embeds on `VideoPlayer` and remove/deprecate `YouTubePlayer` unless unique features are required. | **Medium** – requires verifying feature parity (chapters, notes) or porting features into `VideoPlayer`.【F:components/YouTubePlayer.js†L1-L200】【F:components/ui/VideoPlayer.tsx†L1-L160】 |

## Codemod plans

For each planned cleanup, provide automated guidance:

1. **Remove legacy PiP portal (`components/PipPortal.tsx`).**
   - Search: `rg "components/PipPortal" -g"*.{js,jsx,ts,tsx}"`
   - Expected matches: none. If any appear, replace imports with `components/common/PipPortal` and adjust `usePipPortal` exports.
   - Deletion: remove `components/PipPortal.tsx` once search returns empty and `yarn lint` passes.【686ede†L1-L6】

2. **Migrate bespoke context menus to `ContextMenu`.**
   - Search for legacy menus: `rg "components/context-menus" -g"*.{js,jsx,ts,tsx}"`.
   - Replace `<DefaultMenu|AppMenu|DesktopMenu|TaskbarMenu>` usage with a new wrapper that renders `<ContextMenu targetRef={...} items={...} />` and move menu item definitions into arrays.
   - Update event handlers in `components/screen/desktop.js` to toggle the new menu state instead of manipulating DOM classes.【F:components/context-menus/default.js†L1-L61】【F:components/common/ContextMenu.tsx†L1-L119】

3. **Retire `components/SettingsDrawer.tsx`.**
   - Confirm no imports: `rg "SettingsDrawer" -g"*.{js,jsx,ts,tsx}"` (should only show the component file).【e1bbdc†L1-L3】
   - If any surfaces still show a drawer CTA, replace with a button that opens the Settings app window via `window.dispatchEvent(new CustomEvent('open-app', { detail: 'settings' }))`.
   - Remove the component and associated tests.

4. **Deprecate `components/YouTubePlayer.js` in favor of `components/ui/VideoPlayer.tsx`.**
   - Search for usage: `rg "components/YouTubePlayer" -g"*.{js,jsx,ts,tsx}"`.
   - Replace each import with `components/ui/VideoPlayer` and map props (`videoId` -> `src` pointing to `/api/youtube?id=...` or prebuilt embed) while porting features like chapter drawer into shared component if needed.
   - Delete `components/YouTubePlayer.js` after migration and update documentation/tests accordingly.【F:components/YouTubePlayer.js†L1-L200】【F:components/ui/VideoPlayer.tsx†L1-L160】
