# Taskbar controls

The taskbar is a control surface for the existing desktop window manager. It does not create a second window-state store. The native X showcase and repository editor remain intact. Opening YouTube now requests its playlist directory immediately, independently of saved optional-network preferences; it does not display an enable-network prompt or change unrelated apps' settings.

## Interaction

Click the focused application's taskbar button to minimize it. Click a minimized or background application to restore or focus it. The selected style identifies only the focused window; running indicators remain visible for background and minimized applications, including pinned apps. Phone controls use the same manager commands.

Use Left/Right and Home/End to move between taskbar controls. On the phone, navigation includes Apps and Show desktop, not just running apps. On the desktop, Down opens an application's preview; Escape closes it and restores focus to its taskbar button. Preview actions can switch/restore, minimize, or close the real window even before its thumbnail loads. Context menus skip disabled items during keyboard navigation. Existing pinning and drag ordering are retained.

The monitor-shaped **Show desktop** control minimizes visible windows in the current workspace. **Restore windows** restores that captured set, leaving previously minimized applications alone and restoring the previously focused window last. Closed windows are not reopened. The controller waits for actual workspace-state acknowledgements between commands to avoid overwriting window-manager session updates, cancels pending commands when workspaces change, and recovers from missing acknowledgements after three seconds. Phone and desktop controls share the same snapshot across viewport changes.

## Validation

`yarn lint`, `yarn typecheck`, `yarn test --coverage --maxWorkers=2`, `yarn dedupe:check`, `yarn npm audit --all --recursive --severity high`, `yarn build`, and `yarn export` remain the repository gates. No dependency or runtime version was changed.

`yarn playwright test --config=playwright.portfolio.config.ts` runs the production-build suite, including `taskbar-operating-system.spec.ts` and `taskbar-os.spec.ts`, in Chromium, Firefox, and WebKit. These drive real launcher/window-manager interactions, covering focus/minimize/restore, retained calculator input, keyboard preview controls, selective Show desktop, phone rotation, touch target size, and overflow. The app-polish regression uses the correct Restore label after minimizing a phone window. The browser workflow retains screenshots and traces. Unit coverage separately verifies command ordering, closed-window handling, workspace isolation, and timeout recovery.

The YouTube regression suite checks immediate API requests and first-video embedding, including after reloading with a legacy network-off preference. It also checks that unrelated preference changes do not interrupt playback, failed or empty playlists do not loop, and closing or refreshing the app aborts stale requests. The player does not autoplay. Live API quota, credentials, network availability, and embedding permissions remain external requirements.

PRs #10684 and #10685 were integrated into #10686 before the production gate. The reviewed public-source catalog was regenerated for the added taskbar files, and temporary integration workflows were removed. The older downloadable component-test package is not a substitute for combined repository checks; consult the exact-head CI results for executed validation.
