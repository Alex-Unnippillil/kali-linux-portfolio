# Release Magnet URIs and Verification

Use `scripts/generate-signed-magnet.mjs` to publish magnet links for release files.
The script prints the file's SHA-256, a magnet URI embedding that hash, and a
signature produced with your private key.

```bash
node scripts/generate-signed-magnet.mjs <file> <privateKey> [httpMirror]
```

- `file` – path to the release artifact.
- `privateKey` – PEM file used to sign the magnet URI.
- `httpMirror` – optional HTTP(S) URL to check parity against.

When a mirror URL is supplied the script downloads the file and confirms the
SHA-256 matches the local copy.

## Verifying downloads

1. **Check the hash**
   ```bash
   sha256sum <downloaded-file>
   # compare with the SHA-256 displayed next to the magnet URI
   ```
2. **Validate the signature**
   ```bash
   echo -n 'magnet:?dn=...' > magnet.txt
   base64 -d <<<"<signature>" > magnet.sig
   openssl dgst -sha256 -verify public.pem -signature magnet.sig magnet.txt
   ```
3. **Mirror parity**
   If the script reported a mismatch, fetch another mirror and repeat the hash
   check.

Distribute the magnet URI, SHA-256, and signature together so users can confirm
integrity before installing a release.
