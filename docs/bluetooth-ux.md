# Bluetooth UX Guidelines

The Bluetooth sensor app now guides users through explicit pairing stages and shares status with the desktop tray.

## Pairing flow
- The scanner shows four steps — request permission, secure pairing, service discovery, and ready state. Each step has an icon and highlights the active stage.
- Errors surface retry messaging inside the app. Automatic retries reuse the cached device when possible.
- Battery information is displayed when the sensor exposes the `battery_service` characteristic. Values are cached for reconnects.

## Quick Settings integration
- The system tray exposes current connection status, device name, and inline connect/disconnect actions.
- Retry is available directly from the tray when the link drops. Buttons are disabled while pairing is in progress.
- Battery percentage is shown inline whenever it is available from the cached profile.

## Testing
- `__tests__/components/apps/bluetooth.test.tsx` covers the happy path, retry flow, and reconnect handling. Run `yarn test` before submitting changes.
