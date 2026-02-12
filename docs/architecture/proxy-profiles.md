# Proxy profile storage

The proxy profile store tracks global proxy chains, per-app overrides, and individual proxy nodes. It is backed by IndexedDB via `utils/safeIDB.ts` using the database name `proxy-profiles`, object store `state`, and a single record keyed by `profiles`.

## State schema

### `ProxyProfilesState`

| Field | Type | Notes |
| --- | --- | --- |
| `version` | `number` | Schema version written alongside the payload. Currently `1`. |
| `updatedAt` | `number \| null` | Epoch milliseconds of the most recent mutation. |
| `nodes` | `Record<string, ProxyNode>` | Registry of proxy endpoints keyed by node id. |
| `chains` | `Record<string, ProxyChain>` | Saved chain definitions that reference node ids. |
| `system` | `SystemProxyState` | Global proxy routing that applies when no override is active. |
| `overrides` | `Record<string, AppProxyOverride>` | Per-app chain selections keyed by the application id. |

### `ProxyNode`

Represents a single proxy endpoint.

- `id`: Stable identifier for referencing the node inside chains.
- `name`: Human readable label.
- `protocol`: One of `http`, `https`, `socks4`, `socks5`, `ssh`, `tor`, or `custom`.
- `host`: Hostname or IP address of the proxy server.
- `port`: Numeric TCP port.
- `credentials`: Optional object with `username` and `password` for authenticated proxies.
- `health`: Snapshot of the latest health probe containing:
  - `status`: `unknown`, `online`, `degraded`, or `offline`.
  - `latencyMs`: Optional latency measurement from the last probe.
  - `checkedAt`: Epoch milliseconds when the health state was recorded.
  - `lastError`: Optional diagnostic string for failed checks.
- `notes`: Optional operator notes rendered in management UI.

### `ProxyChain`

Defines how traffic should traverse multiple nodes.

- `id`: Unique identifier.
- `name`: Display label.
- `description`: Optional helper text for UI.
- `nodeIds`: Ordered list of node ids the traffic should traverse.
- `strategy`: Chain execution mode (`cascade`, `failover`, or `load-balance`).
- `createdAt` / `updatedAt`: Epoch timestamps for auditing changes.

### `SystemProxyState`

Describes the currently active system-wide proxy routing.

- `activeChainId`: Chain id currently applied globally, or `null` for direct connections.
- `fallbackChainIds`: Ordered list of backup chain ids.
- `bypassHosts`: Domains or CIDR blocks that should skip the proxy.
- `lastSwitchedAt`: Timestamp of the latest active chain change.

### `AppProxyOverride`

- `chainId`: Chain id selected for a specific app.
- `lastUpdated`: Timestamp recorded whenever the override is saved.

## Change events

All mutations publish a `CustomEvent` named `proxy-profiles-change` on `window`. The `detail` payload contains the normalized state and a reason descriptor indicating whether a node, chain, system selection, or app override triggered the update. Non-React code can listen for this event or use `subscribeToProxyProfiles` to react to profile switches without polling.

React components should consume the `useProxyProfiles` hook, which exposes the current state and mutation helpers backed by the same IndexedDB document.
