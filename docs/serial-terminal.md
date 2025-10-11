# Serial Terminal Demo Notes

The Serial Terminal app ships as an educational showcase of the Web Serial API. Because GitHub Pages and the static export do not expose physical USB devices, the UI falls back to an in-repo transport stub that simulates common connect and disconnect flows.

## Demo Transport

- `utils/serialTransportStub.ts` exports the stub used both in production demo mode and in Jest tests.
- When the real Web Serial API is unavailable, the app instantiates the stub and exposes a simulated device log with canned boot messages.
- The stub implements `requestPort`, `open`, `close`, and dispatches a `disconnect` event so the desktop shell can surface the same status transitions a hardware device would trigger.

## Limitations

- The demo does **not** persist or forward data to real hardware; all output is generated locally for safety.
- Write flows are intentionally omitted. The UI is read-only and only echoes scripted demo data when connected.
- Browser builds without Web Serial support will always run in demo mode. The Connect button remains available so QA teams can validate the stubbed experience.

## Testing

- `__tests__/serial-terminal.test.tsx` covers both demo mode and the explicit disconnect path using mocked serial devices.
- Additional integration tests can register their own `SerialTransportStub` instances and assign them to `navigator.serial` to validate custom scripts without touching hardware.
