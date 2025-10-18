# Breadcrumb navigation polish

## Story
Desktop and mobile users kept losing track of their location when diving through multi-level tools such as the OPFS file explorer and the NSE script browser. The refreshed breadcrumb component keeps the trail visible on small screens by pinning it under the app chrome and adds hover tooltips so deeply nested directories can still be identified.

## Implementation
- `components/ui/Breadcrumbs.tsx` now normalises styling with CSS custom properties, truncates long labels, exposes a tooltip, and adds arrow/home/end key support so focus can slide across the trail without tabbing through the entire window.
- `components/apps/file-explorer.js` consumes the new API, applies a sticky header on handheld viewports, and configures higher-contrast breadcrumb tokens for the dark OPFS surface.
- `apps/nmap-nse/index.tsx` swaps its bespoke markup for the shared breadcrumbs while preserving accent colour on the category node.

## Accessibility notes
- Truncation is paired with the `title` tooltip and retains the full string for assistive tech via the button label.
- Arrow keys, Home, and End move focus without triggering navigation, matching menu bar patterns.
- Sticky positioning only activates on compact layouts, preventing nested scroll traps on desktop where the bar already sits within a fixed window chrome.
