# Vercel secret audit

This project relies on several runtime environment variables for Supabase, reCAPTCHA, and the admin API. Each of these variables is resolved from a Vercel secret so they can be rotated without touching the repository.

## Secret-to-variable mapping

| Vercel secret | Injected environment variable | Purpose |
| --- | --- | --- |
| `portfolio-admin-read-key` | `ADMIN_READ_KEY` | Unlocks the `/api/admin/messages` endpoint. |
| `portfolio-recaptcha-secret` | `RECAPTCHA_SECRET` | Validates contact-form submissions on the server. |
| `portfolio-recaptcha-site-key` | `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Client-side reCAPTCHA integration. |
| `portfolio-supabase-url` | `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL used on both server and client. |
| `portfolio-supabase-anon-key` | `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase key used in the browser. |
| `portfolio-supabase-service-role-key` | `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase service key for privileged APIs. |
| `portfolio-email-service-id` | `NEXT_PUBLIC_SERVICE_ID` | EmailJS service identifier. |
| `portfolio-email-template-id` | `NEXT_PUBLIC_TEMPLATE_ID` | EmailJS template identifier. |
| `portfolio-email-user-id` | `NEXT_PUBLIC_USER_ID` | EmailJS user/public key. |
| `portfolio-ga-tracking-id` | `NEXT_PUBLIC_TRACKING_ID` | Google Analytics measurement ID. |
| `portfolio-youtube-api-key` | `NEXT_PUBLIC_YOUTUBE_API_KEY` | YouTube data API key for the video app. |

## Verification checklist

1. List currently defined secrets and confirm each name above is present:

   ```bash
   vercel secrets ls
   ```

2. If a secret is missing or misnamed, create or update it. Examples:

   ```bash
   # Create or update the reCAPTCHA secret
   vercel secrets add portfolio-recaptcha-secret "<server-secret>"

   # Rename an existing secret if needed
   vercel secrets rename old-supabase-url portfolio-supabase-url
   ```

3. Trigger a fresh deployment so that the newly synced secrets are injected:

   ```bash
   vercel --prod
   ```

4. After deployment, hit `/api/contact` and `/api/track` to ensure the `missing_*` error codes no longer appear in the response payloads.

This document doubles as the audit trail: the `vercel.json` configuration now reads from the secrets listed above, and `.env.local.example` includes matching placeholders for local development.
