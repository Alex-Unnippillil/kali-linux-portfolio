# Robots Parser

This project includes a simple `robots.txt` parser used by the Robots Auditor app. It fetches a site's `robots.txt`, caches the response by domain and uses the returned `ETag` to avoid re-downloading unchanged files.

## Parsing quirks

* Lines with unknown directives are ignored.
* `Disallow:` without a path is treated as `/`.
* Rules appearing before any `User-agent` are grouped under `*`.
* Longest matching rule wins; if an `Allow` and `Disallow` tie, the `Allow` takes precedence.

Missing `robots.txt` files are reported to the UI so you can distinguish between an empty policy and an absent file.
