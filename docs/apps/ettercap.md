# Ettercap simulation audit

## Desktop window (`components/apps/ettercap/index.js`)

- Loads curated capture fixtures so users can pivot between the CIC-IDS2017 HTTP poisoning and MAWI DNS spoof drills, including dataset citations, recommended CLI flags, and host/flow tables.【F:components/apps/ettercap/index.js†L18-L110】【F:components/apps/ettercap/index.js†L672-L756】
- Provides interactive filtering: host/protocol inputs power the flow table while syntax-highlighted filter editor samples are seeded from each fixture’s recommendations and packet snippets.【F:components/apps/ettercap/index.js†L18-L110】【F:components/apps/ettercap/index.js†L711-L756】
- Retains the ARP poisoning lab with draggable storyboard, animated canvases, and contextual narration for before/after states plus dataset disclaimers.【F:components/apps/ettercap/index.js†L120-L670】【F:components/apps/ettercap/index.js†L758-L826】

## Next.js app entry (`apps/ettercap/index.tsx`)

- Adds persistent lab-mode gating: toggles freeze demos until enabled, update log intervals, and gate command/filter editors with a safety banner when disabled.【F:apps/ettercap/index.tsx†L12-L118】【F:apps/ettercap/index.tsx†L120-L192】
- Integrates the shared fixtures via the new browser component so QA can inspect datasets, filter flows, and feed sample data into the filter editor and command builder panels.【F:apps/ettercap/index.tsx†L14-L192】【F:apps/ettercap/components/FixtureBrowser.tsx†L1-L170】
- Ships a lab command builder with interface/mode toggles, target inputs prefilled from the active fixture, optional notes, and copy-to-clipboard output for runbooks.【F:apps/ettercap/components/CommandBuilder.tsx†L1-L168】
- Keeps telemetry sandboxed: the log pane only streams simulated entries when lab mode is active, and storyboard guidance remains available for walkthroughs.【F:apps/ettercap/index.tsx†L53-L192】

## Fixture dataset summary

- Both UIs consume `components/apps/ettercap/fixtures.js`, which enumerates anonymised excerpts inspired by CIC-IDS2017 and the MAWI archive, with textual payload replacements and recommended lab filters/flags for each dataset.【F:components/apps/ettercap/fixtures.js†L1-L98】

