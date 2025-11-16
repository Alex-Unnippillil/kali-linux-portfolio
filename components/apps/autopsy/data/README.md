# Autopsy Simulator Fixtures

These JSON fixtures are **synthetic** and exist solely to demonstrate how the Autopsy simulator in the Kali Linux Portfolio surfaces forensic concepts.

- `sample-artifacts.json` was authored for earlier UI prototypes to populate artifact tables when no upload occurs.
- `forensic-datasets.json` extends that idea with timeline and hash-set snippets that correlate with the demo assets in `public/demo-data/autopsy/`. The hashes were generated locally with `openssl dgst -sha256` against harmless text blobs so no real malware is referenced.

Because the data is fictional, the UI keeps everything read-only and labels the teaching intent in the panels that consume these fixtures. Update this document whenever new fixtures are added so reviewers can quickly confirm provenance.
