# Offline fallback QA checklist

This guide walks through verifying the category-aware offline fallbacks that the PWA service worker now serves. Use it during manual QA or before shipping changes to the caching strategy.

## Prerequisites

1. Install dependencies and start the dev server: `yarn install && yarn dev`.
2. Open the site in a Chromium-based browser (Chrome, Edge, Brave). These steps rely on DevTools network throttling.
3. Clear existing service worker state the first time you run the test (DevTools > Application > Service Workers > **Unregister**).

## Shared preparation steps

1. With the site online, open one example from each category so its assets are cached:
   - Desktop: `/apps/terminal`
   - Simulator: `/apps/wireshark`
   - Game: `/apps/checkers`
2. Confirm the window loads and close it. This seeds the offline cache and records the route metadata used by the fallback diagnostics.
3. Open DevTools (F12 or `Cmd+Opt+I` on macOS). Keep it open for the rest of the checks.

## Desktop fallback

1. In DevTools, go to the **Network** tab and tick **Offline** in the throttling dropdown.
2. Navigate to `/apps/terminal` again.
3. Verify that the offline screen shows the “Desktop workspace unavailable offline” heading, the desktop-specific troubleshooting tips, and the cached Terminal entry in the “Available offline” list.
4. Press **Run again** to ensure diagnostics update the timestamp and show the recorded last route/attempt values.
5. Click **Retry connection** while still offline to ensure the page tries to reload and remains on the fallback without throwing errors.

## Simulator fallback

1. Staying in offline mode, navigate to `/apps/wireshark`.
2. Confirm the fallback switches to the simulator copy (“Simulators need connectivity”) with the correct bullet points.
3. Check that cached simulators appear when available; otherwise the empty-state message should prompt you to visit the app while online.
4. Switch DevTools back to **Online** and click **Retry connection**. The simulator should reload successfully.

## Games fallback

1. Enable offline throttling again and browse to `/apps/checkers` or any other game.
2. The fallback should show the games-specific messaging and any cached games under “Available offline.”
3. Scroll through the tips to ensure they reference retro game behaviour.
4. Toggle the network back online and press **Retry connection** to resume the game.

## Direct games routes

Some games also expose `/games/*` routes (for trainers or editors). With the network offline, open `/games/blackjack`. The same games fallback should render with diagnostics.

## General fallback

1. While still offline, open the launcher at `/apps`.
2. Confirm the fallback defaults to the desktop category and that diagnostics continue to render.
3. Optionally test a non-app page (e.g. `/projects`) to ensure the generic offline page still loads without category-specific styling.

## Resetting after QA

1. Untick the **Offline** checkbox in DevTools.
2. Force-reload the page (`Cmd+Shift+R` / `Ctrl+Shift+R`) to fetch fresh assets.
3. Clear site data if you want to reset cached apps (DevTools > Application > Storage > **Clear site data**).
