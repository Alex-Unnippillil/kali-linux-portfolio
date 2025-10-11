# Recon-ng Simulation

> ⚠️ For educational use in authorized lab environments only.

## Module Schemas

Modules are defined in `components/apps/reconng/index.js` as schema objects with:

- `input` – expected target type (`domain` or `ip`).
- `demo(target)` – returns canned text, nodes and edges for offline runs.
- `fetchUrl(target)` – optional CORS-friendly endpoint used when **Live fetch** is enabled.

## Offline Demonstration

Static fixtures in `public/reconng-marketplace.json`, `public/reconng-chain.json`, and `public/reconng-dataset.json` supply marketplace metadata, example chains, playbooks, and the command builder inputs. Module runs default to the schema's `demo` output so the simulation works without network access.

## Lab Mode Messaging

`public/reconng-dataset.json` exposes the lab-only banner shown across the app. The message reminds learners that every workflow stays inside the browser, uses redacted fixtures, and must only be run in authorized training environments.

## Playbooks & Safe Command Builder

The same dataset file powers two offline guidance surfaces:

- **Playbooks** – step-by-step walkthroughs stitched from the sanitized DNS, WHOIS, and reverse IP fixtures. Each step calls out the canned artifacts and the expected state of the workspace so instructors can narrate the flow without issuing live commands.
- **Safe Command Builder** – a dropdown of Recon-ng console snippets with locked placeholder values. Learners can swap between the approved domains and IPs (all from documentation-only ranges) and observe how the console transcript and expected outputs update.

## Module Chains

The Builder view visualizes an example module chain and lets you execute it. Modules run in topological order and pass any discovered artifacts (domains, IPs and entities) to downstream modules. Results are rendered with Cytoscape using the `cose-bilkent` layout.

## Opt-in Network Requests

Checking the **Live fetch** box sends a limited request to the schema's `fetchUrl`. If the request succeeds, its text replaces the demo output. If it fails, the demo data is shown instead. Remote responses are not stored and the graph remains the example data.

## Data Storage

- Per-module API keys are persisted in `localStorage` under the key `reconng-api-keys` and inputs are masked by default.
- Workspace graphs and entity sets exist only in memory but can be exported as CSV or JSON.
- Static marketplace, chain, and dataset files live in the `public/` directory.

## Dataset Sources

- Domains (`example.com`, `shop.example.com`, `demo-saas.local`) and IP addresses (`93.184.216.34`, `203.0.113.10`) map to documentation/demo ranges reserved for illustrations.
- Contact and TLS metadata is authored specifically for this simulator and does not reference real organizations or certificates.

