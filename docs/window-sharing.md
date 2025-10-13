# Sharing a window layout

The desktop shell now exposes a built-in way to capture an individual window's layout and
context so it can be shared as a link.

## Copying a link

1. Open the window you want to share and adjust it to the desired size and position.
2. Use the new **Copy link to this window/state** control in the window chrome (next to the
   pin, minimize, and close buttons).
3. The permalink, which includes the app identifier, current position, size, and any
   serializable in-app context, is copied to your clipboard. You can paste it into chat,
   email, or notes as needed.

The copy action uses the Clipboard API when available. It automatically falls back to a
legacy copy operation if the secure clipboard API is not available, and finally to a
manual prompt in the rare case both mechanisms fail.

## Opening a shared link

When someone visits a URL that contains the serialized window state parameter, the desktop
shell will:

1. Parse and validate the payload before use, clamping positions and dimensions to safe
   ranges and stripping unsafe context.
2. Persist the state temporarily so the window component can restore the layout once it is
   mounted.
3. Dispatch an `open-app` event with the decoded context so the correct application is
   launched automatically.
4. Apply the stored layout to the first instance of the matching window after the desktop
   surface has finished booting.

The query string parameter is removed after it is processed to keep the URL clean and to
avoid opening duplicate windows when navigating. Invalid or tampered states are ignored.
