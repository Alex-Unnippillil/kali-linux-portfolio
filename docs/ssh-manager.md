# SSH Key Manager

The SSH Key Manager app simulates a secure workstation workflow without ever
leaving the browser. It is designed for demos and training sessions where
showing how SSH keys are managed is useful but touching a visitor's machine is
not allowed.

## Features

- **Ed25519 generation.** Uses the WebCrypto API to build 256-bit Ed25519 key
  pairs entirely in memory, then stores the private key encrypted with
  AES-GCM/PBKDF2. The app never transmits key material to a server.
- **Imports existing material.** Accepts PKCS#8/OpenSSH private keys alongside a
  matching `ssh-ed25519` public key. Metadata such as the comment, fingerprint,
  and created timestamp are persisted in IndexedDB.
- **Passphrase aware.** Users can supply a passphrase when generating or
  importing a key. The private key is encrypted with that passphrase before it
  is saved and the UI requires it again before loading the key into the agent.
- **Mock agent integration.** Keys can be added to or removed from a simulated
  SSH agent (`sshAgentMock`). This keeps the feature educational while avoiding
  real host integrations.
- **Clipboard ergonomics.** A "Copy public key" button writes the comment-aware
  OpenSSH entry to the clipboard, emits an analytics signal, and resets its
  "Copied" state after two seconds to avoid confusion.

## Implementation notes

- Stored entries live under the `ssh-manager::keys` key via `idb-keyval`. Tests
  mock the module, so please keep the storage API stable.
- The clipboard helper respects browsers without `navigator.clipboard` and
  shows a warning if access is denied.
- The mock agent lives in `utils/sshAgentMock.ts`; it keeps private keys in
  memory only and exposes `reset()` for tests.
- Analytics uses the `ssh_public_key_copied` event name. Update
  `lib/analytics-client.ts` if you add more events.

## Testing

Unit coverage is handled by `__tests__/components/apps/ssh-manager.test.tsx`.
Run `yarn test` locally to catch regressions before submitting a PR.
