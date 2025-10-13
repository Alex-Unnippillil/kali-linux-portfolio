# Captive Portal Detection Service

The captive portal detector polls the same endpoints that major operating systems use to confirm unrestricted internet access. When one of the probes is intercepted, the service launches a sandboxed WebKit session so the sign-in flow cannot touch the user's primary browser profile.

## How it works

1. **Connectivity probes.** The service issues HTTP GET requests to the following well-known URLs:
   - `http://connectivitycheck.gstatic.com/generate_204`
   - `http://clients3.google.com/generate_204`
   - `http://captive.apple.com`
   - `http://msftconnecttest.com/connecttest.txt`

   These endpoints return either HTTP 204 (no content) or a short plain-text body. Captive portals typically redirect or replace the response with an HTML login form. Any deviation in status code, body contents, or a transport error marks the network as captive.

2. **Notifications.** Desktop notifications (via `notify-send` when available) inform the user about connectivity state changes: online, captive detected, login complete, or cancellation.

3. **Sandboxed browser.** On detection, the service spawns GNOME Web (Epiphany) or another WebKit implementation in kiosk/application mode with an isolated temporary profile directory. The instance opens `http://neverssl.com`, a plain HTTP site that captive portals commonly intercept. When the login succeeds and the probes return expected values, the sandboxed browser is terminated automatically.

4. **Manual retry.** After completing the portal login, the user can press **Enter** in the terminal running the service to re-check connectivity. The loop repeats until the network is unrestricted or the user aborts with `Ctrl+C`.

## Privacy considerations

- **Minimal data collection.** Only the HTTP status code and up to 512 bytes of response body from the probe endpoints are stored in memory for evaluation and logging. No telemetry is sent anywhere else.
- **No persistent profile.** The sandboxed browser writes data to a temporary directory that is discarded when the process exits, keeping portal credentials out of the main browser profile.
- **Local notifications.** All feedback is rendered locally on the host desktop via the standard notification daemon; no remote services are contacted for notifications.
- **Manual control.** The user explicitly triggers every retry and can abort the service at any time, preventing background monitoring if that is undesirable.

## Operational notes

- The service prefers GNOME Web (`epiphany-browser`) or its Flatpak variant. If neither is installed, it falls back to any available WebKit driver. As a last resort it will ask the user to open the login page manually.
- Standard UNIX signals stop the service immediately. When aborted, it notifies the user so they understand that automated checks ceased.
