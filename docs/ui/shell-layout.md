# Shell layout

This note documents how the desktop shell is assembled so that new surfaces slot neatly into the existing Kali/Ubuntu-inspired frame. It focuses on the top header, the desktop content well, and the taskbar footer, and ties spacing back to the shared design tokens.

## Layout stack at a glance

| Zone | Component(s) | Key responsibilities |
| ---- | ------------- | -------------------- |
| Header | `Navbar` | System status affordances (network icon, whisker menu, clock, quick settings) and lock/shutdown entry points. |
| Content workspace | `main#desktop` | Hosts draggable application windows, wallpaper, left-side dock, and transient overlays. |
| Footer | `Taskbar` | Shows running apps, focus state, and window minimize/restore affordances. |

The root `Ubuntu` shell wires the pieces together in this order to guarantee z-index stacking and focus management. 【F:components/ubuntu.js†L3-L131】

## Composition rules

### Header (system bar)

* Anchor the header to the top-right of the viewport with `position: absolute; top: 0; right: 0;` so it spans the full width above all windows (`z-50`). 【F:components/screen/navbar.js†L18-L44】
* Default padding mirrors token steps: horizontal gutters use `pl-3/pr-1` (~`--space-3`/`--space-1`), while interactive affordances sit on `py-1` (~`--space-2`). Keep new controls on those increments to avoid uneven density. 【F:components/screen/navbar.js†L19-L43】【F:styles/tokens.css†L36-L42】
* The clock already switches to `text-xs` below the `md` breakpoint; follow that precedent for additional header text so copy never wraps on narrow viewports. 【F:components/screen/navbar.js†L23-L29】
* Leave a clear focus path—elements like the status button expose `focus:border-ubb-orange`. Preserve the outline width specified in tokens when adding new focusable elements. 【F:components/screen/navbar.js†L30-L43】【F:styles/tokens.css†L60-L63】

### Content workspace (desktop)

* Use `main#desktop` as the structural container. It stretches to fill the monitor (`h-full w-full`), applies `pt-8` so floating windows never collide with the header, and keeps overlays inside the same stacking context. 【F:components/screen/desktop.js†L866-L970】
* The dedicated `#window-area` div stays `position: absolute` within the desktop to capture skip-link focus from the global “Skip to content” anchor on the landing page. Maintain that ID to preserve accessibility. 【F:components/screen/desktop.js†L870-L878】【F:pages/index.jsx†L33-L39】
* The left-side dock (`SideBar`) and wallpaper renderer mount inside the same desktop scope. Treat them as part of the content layer; new persistent chrome should be inserted here instead of the header/footer. 【F:components/screen/desktop.js†L880-L904】
* Use the Tailwind-powered 12-column helpers for internal layouts in app windows when more structure is needed. 【F:docs/internal-layouts.md†L1-L22】

### Footer (taskbar)

* The taskbar pins to the bottom edge with `absolute bottom-0 left-0` and spans the viewport width. Keep the height at `h-10` (2.5 rem) for consistent hit areas across densities. 【F:components/screen/taskbar.js†L18-L45】
* Running app buttons already apply `mx-1 px-2 py-1`; treat those as the baseline spacings for additional badges or controls to keep density aligned with the rest of the shell. 【F:components/screen/taskbar.js†L18-L44】【F:styles/tokens.css†L36-L42】
* Respect the safe-area guidance from the UI polish backlog—pad the bar by the appropriate `env(safe-area-inset-*)` values before adding fixed elements that hug screen edges. 【F:docs/TASKS_UI_POLISH.md†L65-L82】

## Preferred spacing scale

The shared design tokens define the canonical spacing steps; use them as semantic references in CSS variables or Tailwind equivalents.

| Token | Value | Shell usage |
| ----- | ----- | ------------ |
| `--space-1` | 0.25 rem | Micro-gaps around icons or separators. |
| `--space-2` | 0.5 rem | Vertical padding for header/taskbar buttons (`py-1`). |
| `--space-3` | 0.75 rem | Default horizontal padding for header controls (`pl-3/pr-3`). |
| `--space-4` | 1 rem | Window padding and modal gutters. |
| `--space-5` | 1.5 rem | Desktop `pt-6/pt-8` offsets when layering banners. |
| `--space-6` | 2 rem | Generous content breathing room, especially in full-screen overlays. |

Reference `styles/tokens.css` when authoring raw CSS and mirror the same values via Tailwind spacing utilities (e.g., `px-3`, `py-2`). 【F:styles/tokens.css†L36-L62】

## Responsive behaviour

* **Breakpoint-aware typography.** Follow the header’s `text-xs md:text-sm` pattern so controls remain legible without overflowing on sub-768 px widths. 【F:components/screen/navbar.js†L23-L29】
* **Compact modes.** Honour the backlog guidance: at ≤ 360×640, fall back to a single-window focus and surface the app drawer instead of the multi-window canvas. Document and implement those switches inside desktop media queries. 【F:docs/TASKS_UI_POLISH.md†L65-L84】
* **HiDPI scaling.** On `devicePixelRatio ≥ 1.5`, bump title bars and icons by ~14 % to prevent cramped hit areas; reuse the token-based multipliers rather than hardcoding pixel values. 【F:docs/TASKS_UI_POLISH.md†L65-L78】【F:styles/tokens.css†L55-L59】
* **Safe-area insets.** Apply `padding-inline`/`padding-block` adjustments for notched devices so the header and taskbar stay fully visible. 【F:docs/TASKS_UI_POLISH.md†L65-L82】
* **Reduced motion.** Respect the motion tokens when introducing shell transitions—the defaults fall back to `0ms` under `prefers-reduced-motion`. 【F:styles/tokens.css†L50-L105】

## Implementation reference

The snippet below shows a compliant shell assembly using the existing components and spacing tokens:

```jsx
import Navbar from '@/components/screen/navbar';
import Desktop from '@/components/screen/desktop';
import Taskbar from '@/components/screen/taskbar';

export default function Shell() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-ub-grey text-ubt-grey">
      <Navbar />
      <main id="desktop" className="relative h-full w-full pt-8">
        <div id="window-area" className="absolute inset-0" />
        {/* Mount wallpaper, dock, and windows here */}
      </main>
      <Taskbar />
    </div>
  );
}
```

Use this as a starting point for storybook examples or integration tests that need a minimal but fully compliant shell.

## Related docs

* **Design tokens & spacing:** `styles/tokens.css` for canonical values, plus backlog item 23 in `docs/TASKS_UI_POLISH.md` for the ongoing audit. 【F:styles/tokens.css†L36-L63】【F:docs/TASKS_UI_POLISH.md†L99-L104】
* **Internal grid helpers:** `docs/internal-layouts.md` explains the 12-column utilities available inside windows. 【F:docs/internal-layouts.md†L1-L22】

## Review history

* *Design lead feedback:* Emphasise safe-area handling and keep padding tied to the shared spacing scale to ease future theme swaps. (Incorporated by adding explicit references to the `--space-*` tokens and the notch guidance.)
* *Dev lead feedback:* Document the skip-link target and call out the responsive fallback expectations so new shells preserve accessibility and small-screen behaviour. (Addressed in the content workspace and responsive sections.)
