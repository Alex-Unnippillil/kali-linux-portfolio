# Hydra Throttle Planner

The Hydra simulator now includes a **Throttle Planner** panel that helps facilitators explain how password spray protections work without sending any live traffic. The planner:

- Lets you explore multiple backoff curves (none, linear, exponential, progressive, or custom) and tune lockout limits.
- Generates a timeline of up to 5,000 simulated attempts using a virtualised table so the UI stays responsive on modest hardware.
- Renders an overlay canvas showing relative spacing between attempts and any recorded demo data from the main Hydra window.
- Provides classroom presets (cloud IAM, legacy VPN, custom plan) and supports JSON import/export for sharing lesson scripts.

## Teaching guidelines

- Use the planner to discuss why throttling exists and how operators should respect lockout policies. It is designed for whiteboard conversations and **never** launches real brute-force traffic.
- Keep demos inside the portfolio. Do not copy the generated configuration into offensive tooling or connect it to external services.
- Highlight that recorded timelines come from the in-browser simulator only; they model delays but do not touch production systems.
- When sharing presets, include context about the defensive control being illustrated and note that organisations may configure stricter limits.

## Safety boundaries

- The panel mirrors the project’s security boundary: it manipulates fake timelines and renders them locally. No network requests are made when adjusting curves or importing/exporting settings.
- JSON exports contain only UI preferences (curve type, thresholds, and jitter) and must stay within the educational environment.
- If you extend the planner, continue to enforce the 5k-event cap and avoid adding outbound calls to authentication services or password lists.

These notes help keep classroom runbooks aligned with Kali Linux Portfolio’s “simulation only” policy while still giving students a visual, high-impact explanation of throttling mechanics.
