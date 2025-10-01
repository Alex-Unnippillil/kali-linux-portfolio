# Secure Store Overview

The portfolio now ships with a shared `utils/secureStore` helper that encrypts
sensitive preferences (API keys, network toggles, etc.) in the browser. It uses
AES-GCM via WebCrypto whenever possible and automatically falls back to a
passphrase-verified compatibility mode when WebCrypto APIs are unavailable.

## How it works

1. **Passphrase-derived keys.** A user-provided passphrase is stretched via
   PBKDF2 and fed into AES-GCM for authenticated encryption. Salt, IV, and
   iteration metadata are stored alongside the ciphertext so future decryptions
   can rebuild the key.
2. **Tamper detection.** AES-GCM authentication tags surface corrupted payloads
   as `INVALID_PASSPHRASE` errors. In compatibility mode a lightweight checksum
   (FNV-1a) performs basic tamper detection, and the stored passphrase hash must
   match before secrets are revealed.
3. **Key rotation.** The helper exposes `rotateSecureItem` which decrypts with
   the old passphrase and re-encrypts with the new one. Both Recon-ng and the
   weather widget surface UI affordances for this workflow.
4. **Friendly errors.** Every failure path throws a `SecureStoreError` with a
   helpful `message` and `code` (e.g. `INVALID_PASSPHRASE`, `CORRUPTED`). UI
   layers surface these to explain why an unlock or rotation failed.

## User flows

### Recon-ng settings

1. Open the **Settings** tab and choose a passphrase. New installs will show a
   "Create Passphrase" button; existing users see "Unlock".
2. After unlocking, API key inputs become editable. Values are saved
   immediately and encrypted under the active passphrase.
3. Optional: enter a new passphrase in the rotation field to re-encrypt stored
   keys. Success and error messages appear inline.
4. When WebCrypto is unavailable, the UI highlights that a compatibility mode is
   active. Keys remain passphrase protected but without strong encryption.

### Weather widget

1. Provide a passphrase, click **Unlock**, and then paste your OpenWeather API
   key before hitting **Save**.
2. The widget re-fetches weather data using the decrypted key. Clearing the
   field removes the stored secret.
3. Rotate the passphrase at any time using the inline controls. Locked states
   disable saving to prevent accidental plaintext storage.
4. If the browser lacks WebCrypto support the widget calls out the compatibility
   mode so users know the key is only passphrase-gated.

## Compatibility mode

When `crypto.subtle` is missing the helper:

- Stores secrets as base64-encoded JSON alongside an FNV-1a checksum.
- Persists a hash of the passphrase so the user must supply the same phrase to
  unlock, even though strong encryption is unavailable.
- Emits a warning in the UI (Recon-ng settings and weather widget) explaining
  the reduced guarantees.

This keeps legacy browsers functional while making it clear that users should
prefer modern WebCrypto-capable environments for full protection.
