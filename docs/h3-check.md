# HTTP/3 Alt-Svc Checker

The `/api/h3-check` endpoint fetches headers from a target URL and reports
whether the server advertises HTTP/3 via the `Alt-Svc` header. The
negotiated protocol (ALPN) is returned along with a link to
[documentation](https://developer.mozilla.org/docs/Web/HTTP/Headers/Alt-Svc).

- **QUIC attempt** – the handler sends a UDP datagram to the server to mimic a
  QUIC connection. Browsers expose little detail on UDP failures, so the API
  includes any socket error message but callers should expect generic network
  errors when HTTP/3 cannot be reached.
- **Caching** – HEAD responses are cached for five minutes to avoid repeated
  network requests.

Example request:

```text
/api/h3-check?url=https://example.com
```

Example response:

```json
{
  "altSvc": "h3=\":443\"; ma=2592000",
  "negotiatedProtocol": "h2",
  "h3Advertised": true,
  "documentation": "https://developer.mozilla.org/docs/Web/HTTP/Headers/Alt-Svc",
  "udpError": null,
  "note": "Browsers limit UDP error details; HTTP/3 failures often appear as generic network errors."
}
```
