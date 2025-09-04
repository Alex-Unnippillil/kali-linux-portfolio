# Plugin Manifests

Plugins are described by JSON manifests stored in `plugins/catalog`. Each manifest must match a versioned schema defined in `plugins/schema.ts`.

## Schema Versions

### Version 1

```
{
  "version": 1,
  "id": "demo",
  "sandbox": "worker",
  "code": "self.postMessage('content');"
}
```

- `version` – schema version number.
- `id` – unique plugin identifier.
- `sandbox` – execution environment (`worker` or `iframe`).
- `code` – JavaScript executed in the sandbox.

Future schema versions will be documented here.
