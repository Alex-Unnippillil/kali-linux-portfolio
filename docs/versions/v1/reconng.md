# Recon-ng Simulation

> ⚠️ For educational use in authorized lab environments only.

## Module Schemas

Modules are defined in `components/apps/reconng/index.js` as schema objects with:

- `input` – expected target type (`domain` or `ip`).
- `demo(target)` – returns canned text, nodes and edges for offline runs.
- `fetchUrl(target)` – optional CORS-friendly endpoint used when **Live fetch** is enabled.

## Offline Demonstration

Static fixtures in `public/reconng-marketplace.json` and `public/reconng-chain.json` supply marketplace modules and example chains. Module runs default to the schema's `demo` output so the simulation works without network access.

## Module Chains

The Builder view visualizes an example module chain and lets you execute it. Modules run in topological order and pass any discovered artifacts (domains, IPs and entities) to downstream modules. Results are rendered with Cytoscape using the `cose-bilkent` layout.

## Opt-in Network Requests

Checking the **Live fetch** box sends a limited request to the schema's `fetchUrl`. If the request succeeds, its text replaces the demo output. If it fails, the demo data is shown instead. Remote responses are not stored and the graph remains the example data.

## Data Storage

 - Per-module API keys are persisted in `localStorage` under the key `reconng-api-keys` and inputs are masked by default.
- Workspace graphs and entity sets exist only in memory but can be exported as CSV or JSON.
- Static marketplace and chain data live in the `public/` directory.

