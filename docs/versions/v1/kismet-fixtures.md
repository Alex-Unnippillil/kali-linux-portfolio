# Kismet Fixture Reference

The Kismet simulator ships with local JSON datasets so the app can operate entirely offline during demos and static exports. Thi
s document summarizes each fixture and how the UI uses it.

## Capture dataset

- **Path:** `components/apps/kismet/sampleCapture.json`
- **Structure:** Array of management frame summaries containing `ssid`, `bssid`, `channel`, and `signal` keys.
- **Usage:**
  - Pre-populates the access point table, channel histogram, and time-series graph when the simulator loads.
  - Provides the offline summary counts that appear when Lab Mode is disabled.
  - Powers the "Reload fixtures" action so reviewers can reset after uploading their own capture.

The capture entries intentionally repeat certain BSSIDs so the simulator can demonstrate frame aggregation (frame counters incre
ment per network) and busiest-channel calculations.

## Client dataset

- **Path:** `components/apps/kismet/sampleClients.json`
- **Structure:** Array of client devices with a `mac` field and a `history` list of previously associated networks (`ssid`, `bss
id`).
- **Usage:**
  - Cross-referenced with the capture dataset to surface the channel associated with each known network.
  - Supplies the vendor filter options and inventory table rendered under Lab Mode.
  - Helps highlight how repeated associations map to different access points within the same fixture capture.

## OUI lookup

- **Path:** `components/apps/kismet/oui.json`
- **Structure:** Map of upper-case MAC prefixes (`AA:BB:CC`) to vendor names.
- **Usage:**
  - Decorates both access points and client devices with vendor labels.
  - Extends client history entries with vendor fallbacks when the capture dataset lacks a matching BSSID.

> Keep fixture arrays lightweight so they remain bundle-friendly. If additional demos are required, prefer adding new JSON files
 alongside the existing ones and extend the simulator's loader rather than embedding large PCAP files in the repo.
