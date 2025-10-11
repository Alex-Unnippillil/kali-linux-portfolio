# BeEF Simulation Lab

> ⚠️ **Educational use only.** The BeEF app in this portfolio replays curated datasets and never launches live payloads.

## Overview

The Browser Exploitation Framework (BeEF) desktop app provides a guided tour of common hook-management workflows without touching
real targets. The simulation focuses on:

- A **hook inventory** with fictional browser profiles so learners can practice triage.
- A **module catalog** populated with canned exploit demonstrations, each paired with an explanation of what would happen in a
  production environment.
- A **lab-mode gate** that keeps high-risk flows (credential access, network scanning, device capture) disabled until the user
  acknowledges they are working inside an authorized training lab.
- A **payload builder sandbox** that generates static HTML snippets entirely in-browser for tabletop exercises.

All telemetry, hook events, and module outputs are sourced from static fixtures committed to the repository. Nothing leaves the
user's browser, and no system files are touched.

## Classroom Tips

1. Walk through the hook inventory first to assign roles (red team operator, blue team observer, instructor).
2. Keep lab mode disabled while introducing BeEF concepts, then enable it to discuss higher-impact modules and ethical
   considerations.
3. Reference the canned activity timeline to map modules back to their observed effects.
4. Encourage learners to inspect the generated HTML in the payload builder to understand modern browser mitigations such as CSP
   and the Same-Origin Policy.

## Related Files

- `components/apps/beef/index.js` – main React component with lab-mode gating and canned datasets.
- `components/apps/beef/modules.json` – catalog metadata including explanations and lab-mode flags.
- `components/apps/beef/demoData.js` – hook inventory and activity timeline fixtures.
- `__tests__/beef.test.tsx` – Jest tests covering dataset rendering and lab-mode behavior.

> ✅ The simulation is designed to reinforce ethical hacking boundaries and to prepare learners for hands-on work in controlled
> environments only.
