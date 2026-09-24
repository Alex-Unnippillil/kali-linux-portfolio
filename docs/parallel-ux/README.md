# Parallel desktop UX improvement plan

Reviewed September 22, 2026 against `dd264b1a8c0f0ae6292ec209504a8d8caa510058`.

**Status: planning document, not installed enforcement or running agents.** No application code, production deployment settings, branch protections or existing instructions are changed by this document.

## Recommendation

Use one coordinator, one serialized shared-desktop owner, and small batches of independent application owners. Each application owner handles mouse, keyboard, touch, narrow windows, lifecycle and error states for that app. Do not assign overlapping repository-wide mobile, desktop and visual-polish agents.

Preserve the Kali/Ubuntu OS-clone identity and direct desktop entry. Keep the native Monaco repository editor, saved real X feed, launch-triggered YouTube library retrieval without an enable-network dialog, the playlist from PR #10688 and the released Settings center. Do not add autoplay. Keep drafts/progress and storage schemas compatible. Security applications remain offline/deterministic simulations; no real scans, exploitation, credential attacks or arbitrary-target traffic.

## Audit provenance and limits

Main CI run [35758676361](https://github.com/Alex-Unnippillil/kali-linux-portfolio/actions/runs/35758676361) reported success. Vercel production deployment `dpl_5NFdJ4AdHvtNps4NvPjRNRg8uo9n` was READY at the same SHA, with `www.unnippillil.com` and `unnippillil.com` aliases.

The current CI static-export artifact contained the native-editor repository source snapshot. Its revision matched the reviewed SHA. 1,438 text files were indexed, with 382 omitted files reported by the snapshot. Key source blobs were checked against GitHub. Relevant shell/app/test sources were inspected; indexing is not a claim every application was behaviorally tested.

Static extraction identified 91 literal app registrations plus four generated desktop folders. Notepad has a display binding but no literal active registry entry; folder registrations are generated. A coordinator must validate the complete runnable registry, standalone routes and omitted files using a full checkout before assigning ownership.

Local Chromium navigation was blocked by environment policy (`ERR_BLOCKED_BY_ADMINISTRATOR`). No bypass was attempted. There are no new rendered screenshots, physical-device tests, live embed playback observations or measured browser performance baselines from this audit. Current remote CI success is not a claim the application suite ran locally.

A separately delivered task pack includes 16 task briefs, a 91-entry inventory, a proposed ownership manifest and a Python scope checker. The checker passed 13 tests in synthetic Git repositories, including rename/deletion and worktree checks. It is not installed or required by this docs-only PR.

## Code findings

### Shared shell is the main collision hotspot

`components/screen/desktop.js` has 6,160 lines and `components/base/window.js` has 2,615. Desktop, BaseWindow, `components/desktop/Window.tsx` and `components/desktop/zIndexManager.tsx` participate in window/focus/geometry state.

Treat this as architectural coupling, not proof every interaction is broken. One owner should freeze the current `windowMeta`/openApp/context contract, add behavior tests and extract small pure helpers. Do not make a wholesale class-to-hooks or framework migration a prerequisite for app improvements.

### Compact-mode policy can disagree between shell surfaces

BaseWindow uses `getViewportMetrics()` and `(pointer: coarse)` at [window.js:237–264](../../components/base/window.js#L237-L264). MobileTaskbar uses `innerWidth/innerHeight` and `(any-pointer: coarse)` at [MobileTaskbar.tsx:31–55](../../components/desktop/MobileTaskbar.tsx#L31-L55).

Both call the same compact helper with different inputs. A source-level comparison shows disagreement for a 900×450 hybrid with fine primary/coarse secondary input, and for a 900×650 layout with a keyboard-reduced 900×400 visual viewport. These are policy reproductions, not observed physical-device bugs.

Use one presentation-mode policy, separate visual-work-area/keyboard occlusion metrics, and hybrid input capability support. Preserve saved desktop bounds. BaseWindow already listens to visualViewport resize/scroll; blindly adding more listeners is not the fix.

### Firefox keyboard ownership is unscoped

[components/apps/firefox/index.tsx:95–108](../../components/apps/firefox/index.tsx#L95-L108) attaches a window-level Ctrl/Cmd+L handler, prevents default and selects its own address field without checking active app, visibility or event ownership.

Scope this behavior to app-owned interaction; preserve the real browser shortcut outside that scope and provide a touch-accessible address action. Test while Firefox is mounted and another window owns focus.

### Files needs keyboard semantics and a non-drag move action

[components/apps/file-explorer.js:580–632](../../components/apps/file-explorer.js#L580-L632) renders clickable Recent/Directory/File divs without keyboard activation/tab stops. Demo file movement uses draggable rows/drop targets. The navigation column is fixed `w-40`.

Provide semantic focusable controls, predictable keyboard navigation, a Move-to destination action and a collapsible narrow-window navigation layout. Preserve dirty buffers and permission states. Also test picker cancellation: the fallback open-file helper currently resolves through onchange only.

### Existing cross-browser QA must include new tests explicitly

[playwright.portfolio.config.ts](../../playwright.portfolio.config.ts) already defines Chromium, WebKit and Firefox; existing specs include phone/touch contexts. Do not claim this coverage is absent.

However WebKit/Firefox filename filters only select named Settings, YouTube, app-polish, X, repository-editor and taskbar suites. New `ux-files.spec.ts` or `ux-firefox.spec.ts` files will not automatically run there. Governance must expand selection and verify test discovery.

Preserve the [portfolio browser workflow](../../.github/workflows/portfolio-browser.yml), which already records requested head/base and tested commit/tree. Main push CI success does not establish that the separate PR-triggered browser suite ran on the final main commit.

### Instructions, stale implementations and old PRs need triage

AGENTS.md has duplicated sections 13/14 and overlapping queues. Blanket network-disabled-default wording needs to distinguish privileged services from explicitly allowed curated media retrieval. apps.config.js still describes VS Code as a Stack iframe although its active wrapper loads the native editor.

The first 30 open-PR search results contained overlapping shell/config/shared-game work and older media/editor changes. This was a partial listing, not the total open-PR count. Review all result pages against current code before merging or assigning work. Do not merge old branches simply because GitHub says mergeable.

The main branch response reported unprotected, and the repository rulesets endpoint returned an empty list. Verify and configure effective integration/main protections through actual administrative access before broad agent writes. No protection settings were changed in this audit.

## UX contract

- Desktop retains movable/resizable windows, clear focus, consistent minimize/restore, keyboard-accessible launcher/taskbar actions and app-scoped shortcuts. Do not rely on intercepting OS-reserved shortcuts.
- Phone retains OS identity but uses a stable compact content area, reachable app switching, safe-area handling and non-obscured text entry.
- Tablet/hybrid supports touch and mouse simultaneously; touch capability alone must not force phone presentation. Content scrolling/text selection must not initiate window dragging.
- Every app responds to its container width, not only screen width. Core actions have visible keyboard/tap alternatives to hover, right-click and dragging.
- Prefer 44×44 CSS px important touch targets. This is a project target, not the WCAG AA minimum: WCAG 2.2 AA target size is 24×24 with exceptions. Nonessential dragging requires a non-drag pointer alternative.
- Measure performance before optimizing. Existing lazy loading, container queries and recent taskbar/native-app improvements should be refined, not reimplemented blindly.

## Ownership and dispatch sequence

This table routes tasks; it is not a file lock. Before dispatch, expand each lane into exact file/prefix allowlists and check pairwise overlap. Everything else is read-only.

| Stage / owner | Main scope | Specific objective |
| --- | --- | --- |
| 0 — governance | AGENTS.md, agent.md, registry, root configs, CI, ownership rules | Triage old PRs; consolidate instructions; freeze contracts; add trusted scope checks and actual branch gates. |
| 1 — platform | desktop.js, BaseWindow, components/desktop, taskbar/navbar, shared menus/input/layout/tokens/EmbedFrame | Unify compact mode, work-area metrics, focus, input ownership and consistent chrome. |
| 2 — Firefox | components/apps/firefox, apps/firefox, its route/tests | Fix keyboard stealing; make navigation and embed failure states usable. |
| 2 — Files | file-explorer.js, fileExplorer services, its navigator/worker/tests | Keyboard-complete rows, Move-to action, narrow layout and draft/picker safety. |
| 2 — Terminal | apps/terminal, registered wrapper and app tests | Touch command affordances, session fit, focus isolation and cleanup. |
| 2 — Calculator | apps/calculator, registered wrapper and app tests | Container-responsive keypad/tape and scoped keyboard input. |
| 3 — YouTube | components/apps/youtube, apps/youtube, useYouTubeLibrary, youtube utilities/API/tests | Refine current curated layout, queue/focus and retrieval failure cases; preserve direct load and API contracts. |
| 3 — editor | apps/vscode, wrapper, useRepositoryWorkspace, workspace utility/tests | Native source browsing, phone drawer/tabs, local draft continuity; no StackBlitz regression. |
| 3 — X | apps/x, wrapper, profile-specific utility/server/API/tests | Readable saved feed, touch/media/focus and truthful provenance. |
| 3 — Settings | components/apps/settings, apps/settings, wrapper/route/tests | Refine current center; test keyboard/phone and reset isolation. Shared settings model stays frozen. |
| 4 — Sticky Notes | apps/sticky_notes, registered wrapper/lifecycle tests | Editing/navigation/undo and resilient storage/reopen. Not dormant Notepad. |
| 4 — Spotify | Spotify app/wrapper/route/tests | Host-window fit and truthful embed fallback; preserve current playlist and shared security policy. |
| 4 — portfolio | About/project-gallery, components/portfolio, existing About/Projects routes/tests | Native-window hierarchy, touch cards, source-backed content and back/focus restoration. |
| 4 — Contact | apps/contact, wrapper/route/tests | Draft-safe form validation, touch attachments and duplicate-submit prevention; no real test messages. |
| 5 — shared games | GameLayout, useGameControls, game input/common helpers | Stable focused/visible lifecycle before individual game workers. |
| 5 — shared simulations | SimulationBanner, SimulationReportExport | Consistent simulation labeling/report interactions before individual security-app workers. |

Start with four app workers in stage 2 after the foundation is validated. Four is a recommended reviewable batch size, not an account/product limit. Continue in later batches. For the remaining active apps, derive one narrow task from each actual entrypoint, routes, local dependency graph and tests. Group or serialize overlapping variants, such as an app and its nested offline implementation. Shared files always have one named owner.

## Coordinator prompt — copy into a separate Codex Cloud task

You are the release coordinator for Alex-Unnippillil/kali-linux-portfolio. Read docs/parallel-ux/README.md, current main, all applicable AGENTS.md instructions, the complete open-PR listing, CI and deployment state. The audit SHA is dd264b1a8c0f0ae6292ec209504a8d8caa510058; revalidate current state rather than assuming that remains latest.

Preserve the OS-first desktop, current native apps, saved data and simulation-only security boundaries. Do not replace the site with a landing page or undertake an unrelated framework/dependency migration.

Complete governance first, then the shared platform task with one owner. Freeze tested app identity, focus/lifecycle, viewport, settings/storage, route and API contracts. Build disjoint exact file/prefix allowlists and fail closed for unassigned paths. Configure actual branch checks/protections; documentation alone is not enforcement.

Freeze the validated foundation SHA as BATCH_BASE_SHA. Create an immutable ux/base-b1 and a coordinator-owned ux/integration-b1 from it. Every worker starts from that same SHA in a separate task/workspace and unique codex/ux-b1-<lane> branch. No worker edits main/integration, merges another worker, changes production, force-pushes, rewrites dependencies or expands scope.

Dispatch at most four initial implementation tasks: Firefox, Files, Terminal, Calculator. Each task owns all touch/mouse/keyboard/lifecycle/error-state improvements for its application. Provide the specific objective, exact allowlist, frozen contracts, relevant tests and acceptance criteria. Read-only QA may inspect the whole repository without patching worker-owned files.

A shared dependency request goes in the worker PR body and its unique docs/ux-handoffs/<lane>.md, naming the exact symbol/file, requested change, dependants and tests. Reassign through the named owner; do not let two workers independently patch a shared helper. Stop only the blocked portion, not unrelated progress.

Use a trusted scope checker/manifest from the approved base, not a worker-modifiable PR head. Check additions, modifications, deletions and both sides of renames. Treat AGENTS.md/CODEOWNERS as guidance/routing rather than actual file locks. Restrict merge and production credentials to the release owner.

Each worker returns a draft PR against integration, exact SHA, changed-file list, screenshots or clips, actual command output, compatibility notes, blockers and validation limitations. Keep CSS app-local. Verify newly named test specs are selected in all intended browser projects. Missing tests or browser access are missing checks, not passes. Distinguish mocks/touch emulation from real-provider/real-device validation.

Merge reviewed PRs into integration one at a time. Revalidate the exact combined tree after every change, and incorporate any intervening main updates before final validation. Only the release owner merges main/promotes production, after checking final source/tree and Vercel preview provenance. Then verify production SHA/aliases, key routes and runtime health with authorized access; preserve deployment security and identify a prior known-good deployment.

Create actual Cloud tasks only through available authorized dispatch tools. An issue, PR, task brief or the words 'launch agents' do not launch isolated workers. Report actual task IDs when creation succeeds; otherwise return separate ready-to-submit prompts and say no tasks were launched. Do not pretend one broad prompt automatically orchestrates a working fleet.

## Worker prompt template

You own ONLY <LANE> in Alex-Unnippillil/kali-linux-portfolio.
BATCH_BASE_SHA: <verified full SHA>.
INTEGRATION_BRANCH: <coordinator branch>.
WORKER_BRANCH: codex/ux-<batch>-<lane>.

Read applicable AGENTS.md and the coordinator-approved exact write allowlist. Read anywhere; write only the assigned paths. Verify starting SHA and follow the registered app to its active implementation. Implement the assigned objective for touch, mouse, keyboard, container width, lifecycle and failure states. Preserve existing identity, data, dependencies and shared contracts.

Do not change shared files to solve local issues. Request exact shared changes in the PR body and docs/ux-handoffs/<lane>.md. No broad formatting, disabled tests, branch merging or deployment. Add lane-specific regression tests and record what actually ran. Return a draft PR with source SHA, evidence, changed paths, compatibility notes, risks and missing checks. Do not claim production-ready before combined-tree validation.

## Environment and release gates

Use Node 24 and Yarn 4.9.2. Pin runtime versions in Cloud settings and recheck in each task. Use immutable installation; provide required browser dependencies in setup. Do not assume setup-shell exports persist into the agent session.

Typical repository gates: `yarn lint`, `yarn typecheck`, appropriate/full `yarn test --runInBand`, `yarn build`, `yarn playwright test --config=playwright.portfolio.config.ts`, and `yarn export` where affected. Run static export separately; rebuild the serverful output before retesting serverful routes afterward.

Test phone portrait/landscape, tablet/hybrid input, small windows inside wide screens, virtual keyboard occlusion, focus restoration and rapid close/reopen. Cross-app keyboard isolation and state preservation are release gates, not optional visual polish. Measure performance honestly. Verify allowed real embeds separately from deterministic mock tests; do not bypass provider/Vercel/browser restrictions or send real contact messages.

## References

- [Codex Cloud](https://learn.chatgpt.com/docs/cloud)
- [Cloud environment setup and branch/commit selection](https://learn.chatgpt.com/docs/environments/cloud-environment)
- [AGENTS.md guidance](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [W3C target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [W3C dragging movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)

Isolated task containers reduce workspace interference; they do not remove semantic integration risk. File ownership plus stable contracts plus exact combined-tree testing is the intended method.
