# Adaptive desktop and video library

This change continues `engineering/portfolio-release-2026-09-17`; the homepage
still enters the OS directly, with portfolio content inside native app windows.
An optional first-visit hint explains input and window controls without becoming
an entry gate, modal tour, account prompt, or separate landing page.

## Input and layout

Desktop icons share pointer handlers for mouse, pen and touch. A tap activates
once, browser-synthesized click events are suppressed, movement cancels activation,
and cancellation/unmount clean up the interaction. Keyboard activation remains
available. Touch detection includes secondary touch pointers on hybrid laptops;
it never switches mouse input off.

The YouTube UI uses CSS container queries and a ResizeObserver so it adapts to
its window's width, not just the screen. Search, navigation, cards, queue and
player reflow in small windows and after orientation changes. Interactive targets
are at least 44px, keyboard focus is visible, motion preferences are respected,
and app shortcuts ignore editable controls and modifier combinations.

## Video data and playback

The existing `/api/youtube/directory` and `/api/youtube/playlist-items` contracts
are preserved. Server-side credentials remain preferred; the existing restricted
public-key fallback is retained for static export deployments. This change does
not add credentials or require a new service.

The combined feed requests at most three playlists concurrently and retains a
separate continuation cursor for each playlist. Video IDs are deduplicated across
pages/playlists. Empty, failed, invalid-cursor and exhausted responses do not
cause automatic request loops. Failures expose an explicit retry. Refresh, channel
changes, network-off and unmount cancel or invalidate in-flight responses.
Search and sort apply to **loaded videos**, not to the entire YouTube catalogue.

No player is loaded until a visitor chooses a video. The official privacy-enhanced
YouTube embed remains the player. Search does not interrupt playback; the watch
view provides a queue, previous/next, theatre layout, description expansion,
sharing and an external YouTube fallback. Playback availability still depends on
YouTube, browser permissions, region, and the video's embedding restrictions.

Watch later retains the existing `youtube:watch-later` local-storage format. It
is browser-local and explicitly not presented as YouTube account synchronization.
Network-off settings are respected; enabling requests requires a visitor action.

## Regression coverage

Unit tests cover helpers, pagination, empty/error responses, stable playback while
searching, saved-video persistence, stale response cancellation, hybrid input,
accidental icon activation and optional desktop help. Browser scenarios in
`tests/portfolio/youtube-responsive.spec.ts` exercise the real OS and app with
controlled API responses at 390, 820 and 1440px, touch/mouse/keyboard, rotation,
window reopening, screenshots and overflow checks. These fixtures do not prove
live Google API or DRM/restricted-video availability.

Run `yarn typecheck`, `yarn lint`, `yarn test --runInBand`, `yarn build`, then
`yarn playwright test --config=playwright.portfolio.config.ts`. Browser evidence
is written to `portfolio-screenshots/` and uploaded by the existing CI workflow.
