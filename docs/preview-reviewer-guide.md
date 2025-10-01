# Preview deployment reviewer guide

This repository now publishes per-PR preview builds via the `Preview Deployments` workflow (`ci/preview.yml`). The workflow posts a status comment on each pull request with a link to the deployed Vercel preview as well as a downloadable bundle analysis report.

## Accessing the preview

1. Open the pull request.
2. Locate the automated comment titled “🚀 Preview build ready.”
3. Follow the **Preview URL** link to view the live deployment. Previews run with analytics disabled and simulated tool APIs so you can safely explore features without requiring privileged credentials.

> **Note:** Vercel deploys behind GitHub authentication for private repositories. If prompted, log in with your GitHub account that has access to this repository.

## Reviewing the bundle report

1. In the same comment, use the **Bundle report** link to download the `bundle-report-<run-id>.zip` artifact.
2. Extract the archive locally. The `.next/analyze` directory contains:
   - `client.html` – client bundle breakdown.
   - `server.html` – server bundle breakdown.
3. Open the HTML files in your browser to inspect bundle sizes, added modules, and potential regressions.

## When a preview fails

If the workflow cannot deploy:

- A “⚠️ Preview deployment failed” comment is posted with a reminder to run the production build locally.
- Follow the fallback recipe:
  ```bash
  yarn install
  yarn build
  yarn start
  ```
- Bundle reports may still be attached to the workflow run. Navigate to **Checks → Preview Deployments → Artifacts** to download them.

## Environment safeguards

Previews automatically set the following environment variables to ensure sensitive integrations stay disabled:

- `NEXT_PUBLIC_ENABLE_ANALYTICS=false`
- `FEATURE_TOOL_APIS=disabled`
- `NEXT_PUBLIC_SUPABASE_URL=` (empty)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=` (empty)
- `SUPABASE_URL=` (empty)
- `SUPABASE_SERVICE_ROLE_KEY=` (empty)

This keeps analytics, Supabase features, and other remote integrations inactive during reviewer testing.
