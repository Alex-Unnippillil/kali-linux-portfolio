# Hashcat Advisor Guidelines

The Hashcat simulation now includes a strategy advisor that reacts to user input without offering operational instructions. This note explains how to extend the tips safely.

## Adding a new tip

1. Open `components/apps/hashcat/Advisor.tsx`.
2. Add a new entry to the exported `advisorRules` array.
   - Give it a unique `id`.
   - Provide localization-ready copy via the `message` object (`id` and `defaultMessage`).
   - Set `tone` to either `info` or `caution` to pick the badge style.
   - Supply a `test` function that inspects the `AdvisorContext` and returns `true` when the tip should appear.
3. Update `__tests__/hashcat-advisor.test.tsx` with a matching context in the `rule coverage` test so every rule stays exercised.
4. Run `yarn test hashcat-advisor` to confirm the advisor suite passes.

## Guard rails

- Keep every tip non-prescriptive. Focus on what the simulation is demonstrating (e.g., why adaptive hashes are slow) rather than how to run a live attack.
- Do not link to tooling that enables offensive action. Point to existing documentation that is already surfaced in the UI if needed.
- Avoid suggesting targets, infrastructure, or evasion strategies.
- If you add analytics tracking properties, stick to high-level metadata (like which rule fired) so no sensitive input leaves the browser.

Following these guard rails keeps the demo aligned with the project’s "education only" policy while still giving visitors useful talking points.
