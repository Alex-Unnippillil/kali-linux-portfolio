# Language QA Checklist

This checklist covers a manual verification loop for the localized Kali Linux portfolio. Run it after adding or updating translations to ensure the desktop shell and app windows continue to render correctly in every supported language.

## 1. Environment preparation

1. Clear cached data so previously persisted settings do not affect the test run.
2. Start the development server (`yarn dev`) and open the site in a private/incognito browser window.
3. Verify that the system language selector in **Settings → Appearance** lists every locale defined in `utils/i18n.ts`.

## 2. Locale switching smoke test

1. With the site loaded, open the Settings application.
2. Switch to each locale via the selector and confirm that the UI updates immediately without a full page reload.
3. Reload the page after each switch and confirm the language persists (settings are stored in IndexedDB/localStorage).

## 3. Layout validation per locale

For each supported locale:

1. Confirm the `<html>` element updates its `lang` attribute and direction (`dir`) to match the locale definition.
2. Open the desktop, dock, launcher, and at least three apps (one game, one utility, one simulation) to ensure translated strings do not overflow buttons, tabs, or window chrome.
3. Check the Settings panels (Appearance, Accessibility, Privacy) for clipping or misaligned controls caused by longer labels.
4. Trigger toast/live region announcements (copy, cut, paste) and verify they render in the selected language.
5. Validate that context menus, notifications, and keymap overlays inherit the correct language.

## 4. Regression checks

1. Run `yarn lint` and `yarn test` to ensure no new warnings or failing tests are introduced by translation updates.
2. Export and import settings across languages to confirm the locale value is persisted with the rest of the profile.
3. Capture screenshots of the desktop in each locale for design review or change tracking.

Document any issues discovered during the checklist and file follow-up tasks for missing translations, layout overflows, or RTL-specific bugs.
