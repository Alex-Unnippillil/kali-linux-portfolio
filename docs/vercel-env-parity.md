# Vercel environment parity workflow

This checklist keeps `.env.example` and the deployed Vercel project in sync so new deployments always receive the variables the
app expects.

## Prerequisites

- Install the Vercel CLI (`npm i -g vercel`) and authenticate (`vercel login`).
- Export the scope variables in CI or your shell: `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and `VERCEL_TOKEN`.
- Ensure `.env.local.example` and `.env.example` list the complete set of keys that developers should copy locally.

## Running the parity check

1. Pull the latest configuration and confirm `vercel.json` lists the variables you expect.
2. Run the parity script: `yarn check:vercel-env`.
3. The script reads `.env.example`, runs `vercel env ls --json`, and compares the key sets.
4. A non-zero exit means the lists differ. The script prints which keys are missing from Vercel and which ones are missing from
   the template.
5. Repeat until the script prints `✅ Environment variable parity check passed.`

> Tip: if the CLI cannot resolve the project, double-check the org/project IDs or pass `--scope` and `--cwd` flags explicitly.

## Updating variables for each deployment target

When adding or removing a variable:

1. Update `.env.local.example` and `.env.example` together so developers have the new key.
2. Add the variable to `vercel.json` under `env`, `build.env`, and `preview.env` to document which targets consume it.
3. Push the value to every deployment target you need:

   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL production
   vercel env add NEXT_PUBLIC_SUPABASE_URL preview
   vercel env add NEXT_PUBLIC_SUPABASE_URL development
   ```

4. Re-run `yarn check:vercel-env` to confirm parity before merging.
5. Capture any notes about the change (why it was added, required downstream toggles) in the PR description or release notes.

Maintainers now have a repeatable workflow that prevents drift between local templates and Vercel-hosted environments.

