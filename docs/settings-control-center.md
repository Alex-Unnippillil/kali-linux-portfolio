# Settings control center

Both the desktop Settings app and `/apps/settings` use the same `SettingsCenter`
and hydrated `SettingsProvider`. Preferences are browser-local, not hardware or
operating-system controls. The existing desktop, window manager and immediate
YouTube loading are preserved.

## Navigation and controls

The control center has eight categories: Overview, Personalization, Display &
accessibility, Input & shortcuts, Sound & feedback, Privacy & network, Profiles &
backup, and System. Wide windows use a grouped sidebar; narrow windows use a
labelled category selector. Search finds individual preferences and aliases and
moves keyboard focus to the corresponding control. Ctrl/Command+F stays within
Settings. Switches expose a stable accessible label and explicit On/Off states.

Changes apply immediately and a single-step Undo restores the previous supported
preference snapshot. Theme, custom accent, wallpaper and fit/dimming use a live
preview. Text scaling is bounded to 75–150 percent without changing browser zoom.
The reduced-transparency and stronger-focus preferences also affect actual desktop
panels, menus and portaled dialogs, including after Settings is closed. Existing
reduced-motion, high-contrast and larger-target preferences remain available.

Input includes a non-persisted practice field and a reference for the actual
window-manager shortcuts. It does not claim to change the device's pointer speed,
keyboard layout, or hardware mapping. App volume and test sound control supported
built-in audio, not device volume or embedded-video players. Haptic and fullscreen
controls report browser capability instead of claiming unsupported operations.

The Automatic clock format uses the browser's locale, including in the top bar;
12- and 24-hour overrides are explicit. Showing seconds updates the clock without
resetting an open calendar's month or keyboard navigation. Only month navigation,
not every second, is announced in the calendar's live region. Timers and visibility
listeners are cleaned up when the clock unmounts or its interval changes.

## Persistence and safe configuration management

Legacy preference keys remain compatible. New workspace-only preferences use
`kali:workspace-preferences:v1`. The provider validates saved values before enabling
controls so loading cannot overwrite stored settings with defaults. Storage
failures are reported, and changes can remain available for the current session.

Everyday, Focus and Presentation modes show a change review before applying.
Up to eight named profiles are stored in `kali:settings-profiles:v1`. Profile
creation, application, renaming and deletion use the same validated preference
model. A stale profile list cannot silently overwrite changes from another tab.

Exports are versioned `kali-desktop-settings` JSON. Imports have a 64 KB limit,
validate every supported value before any change, and require an explicit review
and confirmation. An older asynchronous file read cannot replace a newer choice.
Network permissions, profiles, notes, game progress and other app data are excluded
from import/export. Legacy `allowNetwork` entries are ignored; they never grant
network permission. Optional networking remains off by default, while approved
YouTube reads continue to work without a prompt.

Reset asks for confirmation and restores preference defaults, including disabling
optional networking. It preserves named profiles and unrelated app storage. Native
confirmation dialogs keep keyboard focus inside and restore the trigger on close.

## Validation

The model, hydration, UI and reset unit suites exercise malformed values, invalid
imports, profile limits, stale writes, preservation of app data and reopening the
real provider after reset. Settings production-browser scenarios run in Chromium,
Firefox and WebKit through the existing portfolio workflow. They cover desktop and
phone layouts, 150-percent text, rotation, search/focus, real persistence, profile
lifecycle, reviewed backups, global accessibility effects and clock/calendar
regressions. Automated accessibility checks are scoped to the Settings interface;
they supplement, rather than replace, manual accessibility review.

The existing full-repository lint, typecheck, unit coverage, immutable dependency,
security, production build and static export gates still apply. Regenerate the
reviewed repository source catalog after adding/removing tracked files. Exact
commit, test results and Vercel deployment identity are recorded in the release PR.
