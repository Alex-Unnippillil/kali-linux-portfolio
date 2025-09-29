# Offline QA Checklist

Use this script whenever the service worker, contact form, or offline storage logic changes. The steps assume `yarn dev` is running locally at `http://localhost:3000`.

## 1. Queue a draft while offline

1. Open the contact app (`/apps/contact` or the desktop launcher).
2. Fill in the form with a realistic message.
3. Open browser DevTools → **Network** and toggle **Offline**.
4. Submit the form. Expect:
   - A blue banner confirming the message was saved for later.
   - The draft appears in IndexedDB under `contact-draft-queue > drafts` with `status: "queued"`, timestamps, and attempts `0`.
   - A queued prompt offers **Restore**, **Submit**, and **Dismiss** actions.
5. Reload the page while still offline to verify the prompt reappears (restore should refill the form).

## 2. Automatic background sync

1. While the queued prompt is visible, toggle the network back **Online**.
2. Wait up to 5 seconds for background sync to run.
3. Expect the banner to report that the message was sent successfully and the queued prompt to disappear.
4. Confirm the IndexedDB store is empty.

## 3. Manual resend flow

1. Repeat the offline queue steps, but keep the browser online afterwards without waiting for sync.
2. Click **Submit queued draft**.
3. Expect the form to send immediately and the queued record to be removed.
4. If the connection drops mid-send, the banner should note that the draft remains queued.

## 4. Documentation and cleanup

- Clear local storage, IndexedDB, and unregister the service worker before the next scenario to avoid stale data.
- Note any deviations (missing prompt, incorrect timestamps, lingering drafts) in the release checklist.

