# Operator handbook

This handbook explains how to inspect and toggle runtime behaviour that is guarded by environment-driven feature flags. Use it alongside the existing environment variable reference in the repository README.

## Admin access

- **Local development / previews** – the feature flag dashboard is automatically available when `NODE_ENV !== 'production'`.
- **Production** – supply the `ADMIN_READ_KEY` as either the `x-admin-key` header or the `key` query string when visiting `/admin/flags`. Requests without a valid key respond with a `404` so the route stays hidden from unauthorised users.

## Feature flag dashboard

| Route | Purpose |
| --- | --- |
| `/admin/flags` | Lists every flag declared in `lib/featureFlags` along with the resolved value, rollout percentage, and dependency notes. |

The dashboard evaluates flags server-side so values always reflect the environment of the rendered page. Each entry surfaces:

- **Environment** – whether the flag is consumed client-side or server-side.
- **Status** – enabled or disabled once dependencies are considered.
- **Source** – whether the current value comes from `process.env` or the default fallback.
- **Rollout** – a percentage derived from an optional `*_ROLLOUT` variable, clamped between 0–100.
- **Notes** – dependency warnings (for example, Hydra requires `FEATURE_TOOL_APIS`).

## Declaring new flags

1. Add a `FeatureFlagDefinition` entry in `lib/featureFlags/index.ts`. Specify the environment (`'client'` or `'server'`), a short description, and the truthy values that mean "enabled".
2. Append the associated environment variable(s) to `.env.local.example` so local setups have placeholders.
3. Document the flag in the README environment table so operators understand the behaviour.
4. If the flag should support gradual rollouts, set `rolloutEnv` to the name of an environment variable ending in `_ROLLOUT` (for example, `FEATURE_TOOL_APIS_ROLLOUT`).

## Rollout controls

Every flag supports an optional rollout environment variable defined in the metadata (`rolloutEnv`). When present, the admin dashboard displays the configured percentage so operators can confirm staged rollouts at a glance. Missing or invalid rollout values fall back to `100%` for enabled flags and `0%` for disabled flags.

### Available flags

| Flag | Environment variable | Rollout variable | Notes |
| --- | --- | --- | --- |
| Client analytics | `NEXT_PUBLIC_ENABLE_ANALYTICS` | `NEXT_PUBLIC_ENABLE_ANALYTICS_ROLLOUT` | Enables GA4 tracking wrappers. |
| Demo mode | `NEXT_PUBLIC_DEMO_MODE` | `NEXT_PUBLIC_DEMO_MODE_ROLLOUT` | Forces simulated tooling to use demo data. |
| UI experiments | `NEXT_PUBLIC_UI_EXPERIMENTS` | `NEXT_PUBLIC_UI_EXPERIMENTS_ROLLOUT` | Activates experimental window heuristics. |
| Static export mode | `NEXT_PUBLIC_STATIC_EXPORT` | `NEXT_PUBLIC_STATIC_EXPORT_ROLLOUT` | Disables live APIs during static exports. |
| Beta badge | `NEXT_PUBLIC_SHOW_BETA` | `NEXT_PUBLIC_SHOW_BETA_ROLLOUT` | Shows a beta badge when set to `1`. |
| Tool API routes | `FEATURE_TOOL_APIS` | `FEATURE_TOOL_APIS_ROLLOUT` | Unlocks all simulated offensive API routes. |
| Hydra API | `FEATURE_HYDRA` | `FEATURE_HYDRA_ROLLOUT` | Requires `FEATURE_TOOL_APIS` to run. |

Keep rollout variables in sync across environments (local, preview, production) if you rely on staged rollouts for QA.
