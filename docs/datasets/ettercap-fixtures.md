# Ettercap fixture datasets

| Fixture ID | Scenario | Source dataset | Notes |
| --- | --- | --- | --- |
| `cic-ids2017-http` | Credential hijack via ARP and HTTP redirection | [CIC-IDS2017](https://www.unb.ca/cic/datasets/ids-2017.html) infiltration scenario | Times and hosts are anonymised and payload strings rewritten to demo-friendly examples while preserving request flow. Recommended filters block POST exfiltration and allow DNS baselines.【F:components/apps/ettercap/fixtures.js†L1-L52】 |
| `mawi-dns-spoof` | DNS spoof drill with rogue TLS artefacts | [MAWI Working Group Traffic Archive](https://mawi.wide.ad.jp/mawi/) 2020-12 sample | ICMP/TLS strings swapped to neutral text, emphasising workflow of spotting spoofed answers and certificates while matching MAWI timing patterns.【F:components/apps/ettercap/fixtures.js†L54-L98】 |

Each fixture bundles:

- Host table data used by the desktop canvas and Next.js browser for IP/MAC labelling.【F:components/apps/ettercap/fixtures.js†L10-L28】【F:components/apps/ettercap/fixtures.js†L56-L74】
- Flow timelines with timestamped protocol annotations for table rendering and animation cues.【F:components/apps/ettercap/fixtures.js†L18-L46】【F:components/apps/ettercap/fixtures.js†L60-L92】
- Sample packets and filter recipes so QA can drive the filter editor regression coverage.【F:components/apps/ettercap/fixtures.js†L30-L52】【F:components/apps/ettercap/fixtures.js†L76-L98】

