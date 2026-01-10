# Mimikatz Offline Dataset Packaging

The **Mimikatz Offline Workbench** ships with synthetic datasets so incident response drills can run entirely without network
access. This document records how those fixtures are structured and how to extend them safely.

## Dataset location

- **Source file:** `components/apps/mimikatz/offline/datasets.json`
- **Scope:** Each entry represents a single self-contained scenario, including:
  - `id`, `title`, and `summary` metadata for the UI selector.
  - `labSafety` text that reiterates the "for training only" intent.
  - Optional `artifacts` describing relevant capture metadata (timestamp, module, etc.).
  - A `flow` array rendered as the step-by-step investigation guide.
  - The raw `dump` text that the parser consumes. Keep line breaks explicit (`\n`) and prefer Mimikatz console syntax so the
    offline parser can reliably extract usernames and passwords.

## Authoring guidelines

1. **Stay synthetic.** Never commit real credentials, hostnames, or partner data. Craft fictional accounts that reinforce the lab
   narrative and pair every dataset with explicit safety warnings.
2. **Prefer small payloads.** Dumps should remain under ~4 KB to keep bundle size reasonable for the static export.
3. **Encode workflows.** Use the `flow` list to spell out the actions analysts should rehearse (review briefing, inspect accounts,
   document remediation, etc.). This keeps the simulator instructional even without instructor facilitation.
4. **Validate with tests.** Update `__tests__/mimikatzOffline.test.tsx` with expectations for any new dataset so Jest confirms the
   parser still surfaces the fictional credentials.
5. **Document updates.** Reference new datasets in this file and update `docs/app-ecosystem-roadmap.md` if the change closes a
   roadmap item.

## Local verification

Run the targeted Jest suite whenever datasets or the offline parser change:

```bash
yarn test mimikatzOffline
```

This ensures the sanitized dumps continue to parse locally without relying on any network features.
