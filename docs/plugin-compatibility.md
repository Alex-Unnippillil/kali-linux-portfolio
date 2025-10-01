# Plugin compatibility requirements

The plugin catalog uses semantic version ranges to ensure extensions target a
compatible version of the core runtime exposed to sandboxes.

- **Core version source:** `extensions/constants.ts` exports
  `CORE_API_VERSION`. Update this value whenever you introduce breaking changes
to the extension API surface.
- **Requirement syntax:** manifests may include a `requires.core` property with a
  [semantic version range](https://semver.org/). The loader supports wildcards
  (`*`), comparison operators (`>=`, `<=`, `>`, `<`, `=`), logical OR (`||`), and
  the `^` and `~` shorthand operators.
- **Validation:** the loader enforces the requirement when the manifest is
  served. Requests for incompatible extensions respond with HTTP 412 and a JSON
  payload describing the expected and actual versions. Invalid range syntax is
  rejected with HTTP 400 and an actionable error message.

## Sample manifest

```jsonc
{
  "id": "example-tool",
  "sandbox": "worker",
  "code": "self.postMessage('ready')",
  "requires": {
    "core": ">=1.0.0 <2.0.0"
  }
}
```

When the manifest is fetched, the loader checks the declared range against the
running core version and either returns the manifest or blocks the install with
an explanatory error. The Plugin Manager UI surfaces these warnings so
developers and users know why an extension cannot run.

## Local testing

If you need to verify a range, import the utilities in
`extensions/semver.ts` from a test or script:

```ts
import { checkSatisfiesRange } from '@/extensions/semver';

checkSatisfiesRange('^1.0.0', '1.1.0'); // { ok: true, ... }
checkSatisfiesRange('^1.0.0', '2.0.0'); // { ok: false, issue: 'mismatch', ... }
```

This keeps compatibility checks consistent between tooling and the runtime
loader.
