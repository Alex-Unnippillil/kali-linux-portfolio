# PWA Share Target

This guide walks through testing the mobile share target that feeds the Sticky Notes app.

## Prerequisites
- Deploy the site (or run `yarn dev` on a LAN-accessible host) so the mobile browser can reach it.
- Install the Progressive Web App on the mobile device via the browser’s **Install** / **Add to Home Screen** prompt.
- Launch the installed app once to ensure storage permissions are granted.

## Share a link or snippet
1. On the mobile device, open any browser page or highlight text you want to capture.
2. Tap **Share** and choose **Kali Linux Portfolio** from the app list.
3. Wait for the installed PWA to launch. The request is routed to `/api/share`, which forwards the payload to `/apps/sticky_notes/`.
4. The Sticky Notes window appears with a new note pre-populated with the shared text or URL.
5. Close or edit the note as required. Notes persist locally via IndexedDB so they remain available across sessions.

## Troubleshooting tips
- **Share option missing** – Confirm the PWA is installed and the manifest includes the `share_target` block.
- **Nothing happens after sharing** – Check the device is online and that `/api/share` is reachable (static exports omit API routes).
- **Text formatting lost** – The share target strips surrounding whitespace but otherwise preserves the shared content verbatim.

Re-run the workflow whenever you update the sticky notes logic or manifest to ensure the integration still works on mobile.
