# Media Loading Guidelines

These rules document how to configure hero imagery, wallpapers, and embedded media to keep the Kali desktop fast and responsive.

## Hero imagery and wallpapers
- Use `next/image` whenever possible. When an image must remain an HTML `<img>`, add `loading="eager"`, `decoding="async"`, `fetchpriority="high"`, and `importance="high"` so the wallpaper appears immediately.
- Mark hero assets with `priority` (or `fetchPriority="high"`) so the boot splash, lock screen, and other above-the-fold artwork are requested before lazy content.
- Define an explicit `sizes` attribute when using `next/image` to avoid oversized downloads on mobile.

## Lazy embeds and thumbnails
- Any iframe or third-party embed that is not required for first paint must include `loading="lazy"` **and** `importance="low"`. Add `referrerPolicy="no-referrer"` when the embed will accept it to minimise cross-site requests.
- Thumbnails that trigger heavy embeds must render with `loading="lazy"` and `fetchPriority="low"` so they yield to hero graphics.
- When prefetching external documents with `<link rel="prefetch">`, set `importance="low"` (and `as="document"` when applicable) to keep speculative fetches from blocking critical requests.

## Verification checklist
1. After changing media, run the site (`yarn dev`) and open Chrome DevTools → Network tab.
2. Reload the page with “Disable cache” enabled and confirm:
   - hero wallpapers and boot imagery appear at the top of the waterfall with high priority;
   - lazy iframes remain queued until user interaction and show `Priority: Low`.
3. Capture a screenshot of the waterfall if priority assignments changed.
4. Run `yarn lint` before opening a PR to ensure JSX attributes and imports are valid.

Following these rules keeps above-the-fold art crisp without starving the simulated desktop of bandwidth.
