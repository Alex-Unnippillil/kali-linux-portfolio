# AppArmor Profile Lab

The AppArmor Profile Lab provides an educational walkthrough of how profile learning works in AppArmor without touching a host system. It lives at `components/apps/apparmor/index.tsx` and is registered as an app under `apps/apparmor`.

## Feature Highlights

- **Profile catalogue** – three demo services showcase how AppArmor modes (`disabled`, `enabled`, `complain`, `enforce`) affect confinement. Radio groups let users toggle the simulated state and see status badges update instantly.
- **Guided learning flow** – a four-step wizard walks through the baseline profile, sample audit logs, rule selection, and final preview. Navigation buttons support back/next so learners can experiment freely.
- **Learning engine** – canned audit logs feed into `utils/apparmorLearner.ts`, which returns suggestions, generated rules, and a unified diff. The UI surfaces rule snippets, rationale, and raw logs while ensuring no real policy changes occur.
- **Diff and preview** – the last step renders the generated profile alongside a diff (headers use `<profile>.base`/`<profile>.learned`). Deselecting suggestions updates both views so the user understands the impact of each rule.

## Files of Interest

- `components/apps/apparmor/index.tsx` – React component powering the lab UI.
- `utils/apparmorLearner.ts` – deterministic learning helper that transforms simulated logs into rule insertions and diff output.
- `apps/apparmor/index.tsx` – Next.js route that embeds the component inside the desktop shell.
- `__tests__/components/apps/apparmor.test.tsx` – Jest tests covering profile mode toggles and the guided flow.

All data is static and scoped to the browser to ensure the simulator remains safe for public demos.
