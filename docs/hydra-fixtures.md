# Hydra Credential Fixtures

The Hydra simulator ships with synthetic credential datasets so contributors can demo the UI without sourcing real leaks. The fixtures live in `components/apps/hydra/fixtures.js` and are imported directly into the React app so they load instantly during static export and in offline scenarios.

## Dataset structure

Each fixture entry exposes:

- `name` – stable identifier used when composing Hydra commands (e.g. `lab-ssh-users.txt`).
- `label` – human readable title rendered in the dropdowns.
- `description` – short explanation that appears in the list sidebar.
- `content` – newline-delimited values embedded directly in the bundle.
- `readOnly` – marks the item as a lab asset so the UI disables the remove button and keeps the list in localStorage.

The simulator merges these fixtures with anything a user uploads and persists the combined set in `hydraUserLists` and `hydraPassLists`. Uploaded files can safely override non-readonly entries, while fixtures automatically regain their canonical description and contents when the app initializes.

## Extending the fixtures

1. Update `components/apps/hydra/fixtures.js` with new entries. Prefer short, illustrative lists that highlight teaching moments (e.g. seasonal rotations, password sprays).
2. Provide descriptive labels so the UI can distinguish fixtures from user uploads.
3. Keep the strings synthetic—never commit real credentials or secrets.
4. Run `yarn test __tests__/hydra.test.tsx` to ensure the seeding and read-only behaviors remain covered.

The UI surfaces a "Lab mode" toggle and banner so these datasets always stay in educational territory. When the toggle is off, Hydra only performs dry runs and command previews.
