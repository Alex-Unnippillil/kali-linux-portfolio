# Taskbar controls

The taskbar is a control surface for the existing desktop window manager. It does not create a second window-state store. YouTube's connected default, the native X showcase, and the repository editor remain unchanged.

## Interaction

Click the focused application's taskbar button to minimize it. Click a minimized or background application to restore or focus it. The selected style identifies only the focused window; running indicators remain visible for background and minimized applications, including pinned apps. Phone controls use the same manager commands.

Use Left/Right and Home/End to move between taskbar controls. On the desktop, Down opens an application's preview; Escape closes it and restores focus to its taskbar button. Preview actions can switch/restore, minimize, or close the real window even before its thumbnail loads. Context menus skip disabled items during keyboard navigation. Existing pinning and drag ordering are retained.

The monitor-shaped **Show desktop** control minimizes visible windows in the current workspace. **Restore windows** restores that captured set, leaving previously minimized applications alone and restoring the previously focused window last. Closed windows are not reopened. The controller waits for actual workspace-state acknowledgements between commands to avoid overwriting window-manager session updates, cancels pending commands when workspaces change, and recovers from missing acknowledgements after three seconds. Phone and desktop controls share the same snapshot across viewport changes.

## Validation

`yarn lint`, `yarn typecheck`, `yarn test --coverage --maxWorkers=2`, `yarn dedupe:check`, `yarn npm audit --all --recursive --severity high`, `yarn build`, and `yarn export` remain the repository gates. No dependency or runtime version was changed.

`yarn playwright test --config=playwright.portfolio.config.ts` runs the existing production-build suite and the new `taskbar-operating-system.spec.ts` scenarios in Chromium, Firefox, and WebKit. Those tests drive actual launcher/window-manager interactions, not fixture windows, covering focus/minimize/restore, keyboard preview controls, selective Show desktop, phone rotation, and overflow. The browser workflow retains screenshots and traces as evidence. Unit coverage separately verifies command ordering, closed-window handling, workspace isolation, and timeout recovery.

The older downloadable component-test package is not a substitute for these combined repository checks. Consult the pull request's exact-head CI results for executed validation.
