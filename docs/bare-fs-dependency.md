# bare-fs dependency rationale

The project surfaces an installation warning for `bare-fs`. Running `yarn why bare-fs` shows the package is pulled in via the optional dependency chain `@puppeteer/browsers` → `tar-fs` → `bare-fs`.

We upgraded `puppeteer` and `puppeteer-core` to bring in `@puppeteer/browsers@2.10.8`, the latest release at the time of writing, but the warning persists because `tar-fs@3.1.0` still declares `bare-fs` as an optional dependency. No newer versions of `tar-fs` are available that remove `bare-fs`.

Until upstream packages drop this dependency, `bare-fs` remains required and can be safely ignored.
