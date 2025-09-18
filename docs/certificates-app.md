# Certificates App

The **Certificates** utility provides a desktop-style view of the mock trust store that powers certificate-centric demos. It
is built entirely on top of the client-side `utils/certStore.ts` store and exposes the following behaviours:

- Lists **system** and **user** certificates with quick filters for scope, trust state, TLS issue status, and a search box.
- Highlights approaching expirations (30 day warning window) and past expirations with prominent badges.
- Links TLS diagnostics from scanners (Nmap NSE, Nessus, Wireshark simulators, etc.) to the matching certificate fingerprint.
  Any tool can publish to the shared `tls:issue` pubsub channel to surface an incident inside the manager.
- Presents a metadata viewer with issuer, fingerprint, key usage, and any supplemental metadata from the store.
- Supports mock **trust**, **revoke**, **import**, and **export** actions to mirror an OS certificate manager.

## Import / Export format

The `importCertificate` helper expects JSON payloads with the following minimal shape:

```json
{
  "label": "QA Service Cert",
  "subject": "CN=qa.lab.internal",
  "issuer": "CN=Kali Issuing CA",
  "validFrom": "2025-01-01T00:00:00.000Z",
  "validTo": "2025-12-31T00:00:00.000Z",
  "type": "Server",
  "usage": ["Server Authentication"]
}
```

Optional properties include `fingerprint`, `serialNumber`, `scope`, `metadata`, `algorithm`, and `trusted`. When a payload
omits the fingerprint, the store generates a mock SHA-1 style fingerprint to keep identifiers unique.

The export button returns the same structure, formatted as pretty-printed JSON so it can be pasted back into the import box or
into other demos.

## TLS issue bridge

Apps that simulate TLS findings can publish incidents via the global pubsub helper:

```ts
import { publish } from '../utils/pubsub';

publish('tls:issue', {
  summary: 'Deprecated cipher suite negotiated',
  severity: 'warning',
  source: 'Wireshark',
  fingerprints: ['DD:44:33:DD:44:33:DD:44:33:DD:44:33:DD:44:33:DD:44:33:DD:44:33:DD:44:33'],
  detectedAt: new Date().toISOString(),
  remediation: 'Rotate service certificate and disable TLS 1.0',
});
```

The certificates app automatically subscribes to this channel and rebroadcasts the issue in the UI if it matches any known
fingerprints. Multiple fingerprints may be supplied to cover leaf and intermediate certificates.

## Store reset helpers

`utils/certStore.ts` also exposes `resetCertStore()` for test suites and storybook scenarios. This repopulates the store with
fixture certificates and TLS issues so tests remain deterministic. The React hook `useCertStore()` is used inside the
component to subscribe to changes.

Refer to `__tests__/components/apps/certificates.test.tsx` for examples that validate filtering, trust toggles, pubsub-driven
TLS issues, and import/export flows.
