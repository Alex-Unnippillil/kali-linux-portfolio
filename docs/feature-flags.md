# Feature flag rollout guide

The portfolio now exposes a deterministic flagging system that keeps server and
client decisions aligned. Use this guide when adding or modifying flags.

## Where flags live

- **Definitions**: `lib/flags.ts` contains the canonical `flagDefinitions`
  object. Each entry documents its purpose, default state, and rollout
  percentage.
- **Runtime access**: Components should call the `useFlag(name)` hook from
  `hooks/useFlags.tsx` to read a boolean decision. If several flags are needed,
  prefer `useFlags()` and query `flags` or `isEnabled` directly.
- **Overrides**: Query parameters prefixed with `flag:` override any other
  sources for the current session. Local overrides persist in
  `localStorage` under the `kali.flags.overrides` key.

## Rolling out a new flag

1. **Add a definition** in `lib/flags.ts` with a unique key, description, and
   `rolloutPercentage`. Default values should describe the disabled state.
2. **Document behaviour** in this file so reviewers understand the gating
   intent and any follow‑up tasks once the flag is stable.
3. **Reference the flag** inside components via `useFlag('feature.key')` or the
   `useFlags()` helper. Avoid reading from `flagDefinitions` directly in UI
   code.
4. **Decide rollout steps**:
   - For internal testing set `rolloutPercentage` to `0` and manually enable the
     feature using `?flag:feature.key=true` or a local override.
   - For gradual exposure bump the percentage in small increments (for example
     `5`, `10`, `25`, `50`, `100`). Each increase must land in a PR that
     references validation notes and monitoring expectations.
5. **Verify deterministic bucketing** by running `yarn test`. Jest contains
   coverage for the flagging engine and will surface regressions in hashing or
   override behaviour.
6. **Clean up after launch**. Once the flag reaches `100` and stabilises for at
   least one release cycle, remove dead code and update `flagDefinitions` to
   reflect the permanent state.

## Debugging tips

- Use `localStorage.setItem('kali.flags.overrides', JSON.stringify({
  'feature.key': true }))` in the browser console to persist overrides.
- Call `localStorage.removeItem('kali.flags.overrides')` to clear manual tweaks.
- Inspect `document.cookie` for the `kali_flag_seed` entry. It ensures the same
  visitor is bucketed consistently on the server and client.

