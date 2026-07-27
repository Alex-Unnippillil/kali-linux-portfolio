# Catalog Polish Checklist

This catalog derives directly from `apps.config.js` and groups every windowed experience so contributors can align UI polish work with the shared desktop plan. It maps each route to its implementation, planned frame abstraction, outstanding UX tasks, acceptance criteria, and downstream dependencies.

## Automation Envelope Format
Use the JSON envelope generated for each entry to seed GitHub issues or automation workflows. Each envelope records the app ID, route, component path, frame contract, outstanding tasks, acceptance criteria, and dependencies. Aggregate envelopes appear at the end of this document for batch processing.

## Media & Embed Apps
### Firefox (`firefox`)

- **Route:** `/apps/firefox`
- **Implementation:** `components/apps/firefox/index.tsx`
- **Frame contract:** `EmbedFrame`
- **Outstanding tasks:**
  - [ ] Wrap existing UI in `<EmbedFrame>` for unified loading, error, and offline states.
  - [ ] Document offline/demo fallback instructions so the window remains functional without network access.
  - [ ] Audit `apps.config.js` metadata for window defaults, resizability, and dock icon alignment.
  - [ ] Replace the legacy Chrome simulation with a single iframe shell that persists the last URL and minimal chrome.
- **Acceptance criteria:**
  - EmbedFrame exposes a skeleton state, offline banner, and retry affordance verified with the Spotify and YouTube embeds.
  - Window opens with tuned default width/height, honors min constraints, and exposes descriptive dock tooltip text.
  - Design tokens power typography and colors (no hard-coded hex values) across nav, buttons, and copy blocks.
- **Dependencies:**
  - EmbedFrame component shipping from desktop shell plan
  - Design token audit from `docs/TASKS_UI_POLISH.md`
  - Dock metadata normalization tracked in `apps.config.js`
- **Task envelope:**
  ```json
  {
    "appId": "firefox",
    "title": "Firefox",
    "route": "/apps/firefox",
    "component": "components/apps/firefox/index.tsx",
    "frame": "EmbedFrame",
    "tasks": [
      "Wrap existing UI in `<EmbedFrame>` for unified loading, error, and offline states.",
      "Document offline/demo fallback instructions so the window remains functional without network access.",
      "Audit `apps.config.js` metadata for window defaults, resizability, and dock icon alignment.",
      "Replace the legacy Chrome simulation with a single iframe shell that persists the last URL and minimal chrome."
    ],
    "acceptanceCriteria": [
      "EmbedFrame exposes a skeleton state, offline banner, and retry affordance verified with the Spotify and YouTube embeds.",
      "Window opens with tuned default width/height, honors min constraints, and exposes descriptive dock tooltip text.",
      "Design tokens power typography and colors (no hard-coded hex values) across nav, buttons, and copy blocks."
    ],
    "dependencies": [
      "EmbedFrame component shipping from desktop shell plan",
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization tracked in `apps.config.js`"
    ]
  }
  ```

### Spotify (`spotify`)

- **Route:** `/apps/spotify`
- **Implementation:** `components/apps/spotify.jsx`
- **Frame contract:** `EmbedFrame`
- **Outstanding tasks:**
  - [ ] Wrap existing UI in `<EmbedFrame>` for unified loading, error, and offline states.
  - [ ] Document offline/demo fallback instructions so the window remains functional without network access.
  - [ ] Audit `apps.config.js` metadata for window defaults, resizability, and dock icon alignment.
  - [ ] Ship playlist editor JSON and mini-player mode in addition to the existing embed layout.
- **Acceptance criteria:**
  - EmbedFrame exposes a skeleton state, offline banner, and retry affordance verified with the Spotify and YouTube embeds.
  - Window opens with tuned default width/height, honors min constraints, and exposes descriptive dock tooltip text.
  - Design tokens power typography and colors (no hard-coded hex values) across nav, buttons, and copy blocks.
- **Dependencies:**
  - EmbedFrame component shipping from desktop shell plan
  - Design token audit from `docs/TASKS_UI_POLISH.md`
  - Dock metadata normalization tracked in `apps.config.js`
- **Task envelope:**
  ```json
  {
    "appId": "spotify",
    "title": "Spotify",
    "route": "/apps/spotify",
    "component": "components/apps/spotify.jsx",
    "frame": "EmbedFrame",
    "tasks": [
      "Wrap existing UI in `<EmbedFrame>` for unified loading, error, and offline states.",
      "Document offline/demo fallback instructions so the window remains functional without network access.",
      "Audit `apps.config.js` metadata for window defaults, resizability, and dock icon alignment.",
      "Ship playlist editor JSON and mini-player mode in addition to the existing embed layout."
    ],
    "acceptanceCriteria": [
      "EmbedFrame exposes a skeleton state, offline banner, and retry affordance verified with the Spotify and YouTube embeds.",
      "Window opens with tuned default width/height, honors min constraints, and exposes descriptive dock tooltip text.",
      "Design tokens power typography and colors (no hard-coded hex values) across nav, buttons, and copy blocks."
    ],
    "dependencies": [
      "EmbedFrame component shipping from desktop shell plan",
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization tracked in `apps.config.js`"
    ]
  }
  ```

### Visual Studio Code (`vscode`)

- **Route:** `/apps/vscode`
- **Implementation:** `components/apps/vscode.jsx`
- **Frame contract:** `EmbedFrame`
- **Outstanding tasks:**
  - [ ] Wrap existing UI in `<EmbedFrame>` for unified loading, error, and offline states.
  - [ ] Document offline/demo fallback instructions so the window remains functional without network access.
  - [ ] Audit `apps.config.js` metadata for window defaults, resizability, and dock icon alignment.
  - [ ] Validate StackBlitz embed permissions and document offline fallback messaging.
- **Acceptance criteria:**
  - EmbedFrame exposes a skeleton state, offline banner, and retry affordance verified with the Spotify and YouTube embeds.
  - Window opens with tuned default width/height, honors min constraints, and exposes descriptive dock tooltip text.
  - Design tokens power typography and colors (no hard-coded hex values) across nav, buttons, and copy blocks.
- **Dependencies:**
  - EmbedFrame component shipping from desktop shell plan
  - Design token audit from `docs/TASKS_UI_POLISH.md`
  - Dock metadata normalization tracked in `apps.config.js`
- **Task envelope:**
  ```json
  {
    "appId": "vscode",
    "title": "Visual Studio Code",
    "route": "/apps/vscode",
    "component": "components/apps/vscode.jsx",
    "frame": "EmbedFrame",
    "tasks": [
      "Wrap existing UI in `<EmbedFrame>` for unified loading, error, and offline states.",
      "Document offline/demo fallback instructions so the window remains functional without network access.",
      "Audit `apps.config.js` metadata for window defaults, resizability, and dock icon alignment.",
      "Validate StackBlitz embed permissions and document offline fallback messaging."
    ],
    "acceptanceCriteria": [
      "EmbedFrame exposes a skeleton state, offline banner, and retry affordance verified with the Spotify and YouTube embeds.",
      "Window opens with tuned default width/height, honors min constraints, and exposes descriptive dock tooltip text.",
      "Design tokens power typography and colors (no hard-coded hex values) across nav, buttons, and copy blocks."
    ],
    "dependencies": [
      "EmbedFrame component shipping from desktop shell plan",
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization tracked in `apps.config.js`"
    ]
  }
  ```

### X (`x`)

- **Route:** `/apps/x`
- **Implementation:** `components/apps/x.js`
- **Frame contract:** `EmbedFrame`
- **Outstanding tasks:**
  - [ ] Wrap existing UI in `<EmbedFrame>` for unified loading, error, and offline states.
  - [ ] Document offline/demo fallback instructions so the window remains functional without network access.
  - [ ] Audit `apps.config.js` metadata for window defaults, resizability, and dock icon alignment.
  - [ ] Keep the timeline embed SSR-disabled with a manual theme toggle and documented fallback.
- **Acceptance criteria:**
  - EmbedFrame exposes a skeleton state, offline banner, and retry affordance verified with the Spotify and YouTube embeds.
  - Window opens with tuned default width/height, honors min constraints, and exposes descriptive dock tooltip text.
  - Design tokens power typography and colors (no hard-coded hex values) across nav, buttons, and copy blocks.
- **Dependencies:**
  - EmbedFrame component shipping from desktop shell plan
  - Design token audit from `docs/TASKS_UI_POLISH.md`
  - Dock metadata normalization tracked in `apps.config.js`
- **Task envelope:**
  ```json
  {
    "appId": "x",
    "title": "X",
    "route": "/apps/x",
    "component": "components/apps/x.js",
    "frame": "EmbedFrame",
    "tasks": [
      "Wrap existing UI in `<EmbedFrame>` for unified loading, error, and offline states.",
      "Document offline/demo fallback instructions so the window remains functional without network access.",
      "Audit `apps.config.js` metadata for window defaults, resizability, and dock icon alignment.",
      "Keep the timeline embed SSR-disabled with a manual theme toggle and documented fallback."
    ],
    "acceptanceCriteria": [
      "EmbedFrame exposes a skeleton state, offline banner, and retry affordance verified with the Spotify and YouTube embeds.",
      "Window opens with tuned default width/height, honors min constraints, and exposes descriptive dock tooltip text.",
      "Design tokens power typography and colors (no hard-coded hex values) across nav, buttons, and copy blocks."
    ],
    "dependencies": [
      "EmbedFrame component shipping from desktop shell plan",
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization tracked in `apps.config.js`"
    ]
  }
  ```

### YouTube (`youtube`)

- **Route:** `/apps/youtube`
- **Implementation:** `components/apps/youtube/index.tsx`
- **Frame contract:** `EmbedFrame`
- **Outstanding tasks:**
  - [ ] Wrap existing UI in `<EmbedFrame>` for unified loading, error, and offline states.
  - [ ] Document offline/demo fallback instructions so the window remains functional without network access.
  - [ ] Audit `apps.config.js` metadata for window defaults, resizability, and dock icon alignment.
  - [ ] Maintain demo catalog, search debouncing, and history controls with offline-first tests.
- **Acceptance criteria:**
  - EmbedFrame exposes a skeleton state, offline banner, and retry affordance verified with the Spotify and YouTube embeds.
  - Window opens with tuned default width/height, honors min constraints, and exposes descriptive dock tooltip text.
  - Design tokens power typography and colors (no hard-coded hex values) across nav, buttons, and copy blocks.
- **Dependencies:**
  - EmbedFrame component shipping from desktop shell plan
  - Design token audit from `docs/TASKS_UI_POLISH.md`
  - Dock metadata normalization tracked in `apps.config.js`
- **Task envelope:**
  ```json
  {
    "appId": "youtube",
    "title": "YouTube",
    "route": "/apps/youtube",
    "component": "components/apps/youtube/index.tsx",
    "frame": "EmbedFrame",
    "tasks": [
      "Wrap existing UI in `<EmbedFrame>` for unified loading, error, and offline states.",
      "Document offline/demo fallback instructions so the window remains functional without network access.",
      "Audit `apps.config.js` metadata for window defaults, resizability, and dock icon alignment.",
      "Maintain demo catalog, search debouncing, and history controls with offline-first tests."
    ],
    "acceptanceCriteria": [
      "EmbedFrame exposes a skeleton state, offline banner, and retry affordance verified with the Spotify and YouTube embeds.",
      "Window opens with tuned default width/height, honors min constraints, and exposes descriptive dock tooltip text.",
      "Design tokens power typography and colors (no hard-coded hex values) across nav, buttons, and copy blocks."
    ],
    "dependencies": [
      "EmbedFrame component shipping from desktop shell plan",
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization tracked in `apps.config.js`"
    ]
  }
  ```

## Core Desktop & Productivity Apps
### About Alex (`about`)

- **Route:** `/apps/about`
- **Implementation:** `components/apps/alex.js`
- **Frame contract:** `DesktopWindow`
- **Outstanding tasks:**
  - [ ] Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.
  - [ ] Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.
  - [ ] Document offline or demo data sources so static export serves the same UX as serverful mode.
- **Acceptance criteria:**
  - Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.
  - UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.
  - All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation.
- **Dependencies:**
  - Design token audit from `docs/TASKS_UI_POLISH.md`
  - Dock metadata normalization
  - Settings/reset wiring for shared preferences
- **Task envelope:**
  ```json
  {
    "appId": "about",
    "title": "About Alex",
    "route": "/apps/about",
    "component": "components/apps/alex.js",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  }
  ```

### Calculator (`calculator`)

- **Route:** `/apps/calculator`
- **Implementation:** `components/apps/calculator.js`
- **Frame contract:** `DesktopWindow`
- **Outstanding tasks:**
  - [ ] Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.
  - [ ] Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.
  - [ ] Document offline or demo data sources so static export serves the same UX as serverful mode.
  - [ ] Wire tokenizer and shunting-yard evaluator plus keyboard support per the Calc backlog.
- **Acceptance criteria:**
  - Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.
  - UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.
  - All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation.
- **Dependencies:**
  - Design token audit from `docs/TASKS_UI_POLISH.md`
  - Dock metadata normalization
  - Settings/reset wiring for shared preferences
- **Task envelope:**
  ```json
  {
    "appId": "calculator",
    "title": "Calculator",
    "route": "/apps/calculator",
    "component": "components/apps/calculator.js",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Wire tokenizer and shunting-yard evaluator plus keyboard support per the Calc backlog."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  }
  ```

### Contact (`contact`)

- **Route:** `/apps/contact`
- **Implementation:** `components/apps/contact/index.tsx`
- **Frame contract:** `DesktopWindow`
- **Outstanding tasks:**
  - [ ] Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.
  - [ ] Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.
  - [ ] Document offline or demo data sources so static export serves the same UX as serverful mode.
  - [ ] Implement client-side validation, privacy note, and dummy submit endpoint.
- **Acceptance criteria:**
  - Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.
  - UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.
  - All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation.
- **Dependencies:**
  - Design token audit from `docs/TASKS_UI_POLISH.md`
  - Dock metadata normalization
  - Settings/reset wiring for shared preferences
- **Task envelope:**
  ```json
  {
    "appId": "contact",
    "title": "Contact",
    "route": "/apps/contact",
    "component": "components/apps/contact/index.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Implement client-side validation, privacy note, and dummy submit endpoint."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  }
  ```

### Contact Me (`gedit`)

- **Route:** `/apps/gedit`
- **Implementation:** `components/apps/gedit.js`
- **Frame contract:** `DesktopWindow`
- **Outstanding tasks:**
  - [ ] Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.
  - [ ] Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.
  - [ ] Document offline or demo data sources so static export serves the same UX as serverful mode.
  - [ ] Keep the contact workflow aligned with EmailJS and document feature flag requirements.
- **Acceptance criteria:**
  - Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.
  - UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.
  - All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation.
- **Dependencies:**
  - Design token audit from `docs/TASKS_UI_POLISH.md`
  - Dock metadata normalization
  - Settings/reset wiring for shared preferences
- **Task envelope:**
  ```json
  {
    "appId": "gedit",
    "title": "Contact Me",
    "route": "/apps/gedit",
    "component": "components/apps/gedit.js",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Keep the contact workflow aligned with EmailJS and document feature flag requirements."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  }
  ```

### Converter (`converter`)

- **Route:** `/apps/converter`
- **Implementation:** `components/apps/converter/index.js`
- **Frame contract:** `DesktopWindow`
- **Outstanding tasks:**
  - [ ] Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.
  - [ ] Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.
  - [ ] Document offline or demo data sources so static export serves the same UX as serverful mode.
- **Acceptance criteria:**
  - Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.
  - UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.
  - All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation.
- **Dependencies:**
  - Design token audit from `docs/TASKS_UI_POLISH.md`
  - Dock metadata normalization
  - Settings/reset wiring for shared preferences
- **Task envelope:**
  ```json
  {
    "appId": "converter",
    "title": "Converter",
    "route": "/apps/converter",
    "component": "components/apps/converter/index.js",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  }
  ```

### Files (`files`)

- **Route:** `/apps/files`
- **Implementation:** `components/apps/file-explorer/index.tsx`
- **Frame contract:** `DesktopWindow`
- **Outstanding tasks:**
  - [ ] Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.
  - [ ] Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.
  - [ ] Document offline or demo data sources so static export serves the same UX as serverful mode.
  - [ ] Align virtual filesystem breadcrumbs, recents, and drag/drop with the shared navigator hook.
- **Acceptance criteria:**
  - Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.
  - UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.
  - All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation.
- **Dependencies:**
  - Design token audit from `docs/TASKS_UI_POLISH.md`
  - Dock metadata normalization
  - Settings/reset wiring for shared preferences
- **Task envelope:**
  ```json
  {
    "appId": "files",
    "title": "Files",
    "route": "/apps/files",
    "component": "components/apps/file-explorer/index.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Align virtual filesystem breadcrumbs, recents, and drag/drop with the shared navigator hook."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  }
  ```

### HTML Rewriter (`html-rewriter`)

- **Route:** `/apps/html-rewriter`
- **Implementation:** `apps/html-rewriter/index.tsx`
- **Frame contract:** `DesktopWindow`
- **Outstanding tasks:**
  - [ ] Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.
  - [ ] Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.
  - [ ] Document offline or demo data sources so static export serves the same UX as serverful mode.
  - [ ] Demonstrate transformations and ensure worker wiring stays mock-friendly.
- **Acceptance criteria:**
  - Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.
  - UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.
  - All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation.
- **Dependencies:**
  - Design token audit from `docs/TASKS_UI_POLISH.md`
  - Dock metadata normalization
  - Settings/reset wiring for shared preferences
- **Task envelope:**
  ```json
  {
    "appId": "html-rewriter",
    "title": "HTML Rewriter",
    "route": "/apps/html-rewriter",
    "component": "apps/html-rewriter/index.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Demonstrate transformations and ensure worker wiring stays mock-friendly."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  }
  ```

### HTTP Builder (`http`)

- **Route:** `/apps/http`
- **Implementation:** `apps/http/index.tsx`
- **Frame contract:** `DesktopWindow`
- **Outstanding tasks:**
  - [ ] Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.
  - [ ] Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.
  - [ ] Document offline or demo data sources so static export serves the same UX as serverful mode.
  - [ ] Add request validation, canned responses, and error states for offline demos.
- **Acceptance criteria:**
  - Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.
  - UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.
  - All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation.
- **Dependencies:**
  - Design token audit from `docs/TASKS_UI_POLISH.md`
  - Dock metadata normalization
  - Settings/reset wiring for shared preferences
- **Task envelope:**
  ```json
  {
    "appId": "http",
    "title": "HTTP Builder",
    "route": "/apps/http",
    "component": "apps/http/index.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Add request validation, canned responses, and error states for offline demos."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  }
  ```

### Resource Monitor (`resource-monitor`)

- **Route:** `/apps/resource-monitor`
- **Implementation:** `apps/resource-monitor/index.tsx`
- **Frame contract:** `DesktopWindow`
- **Outstanding tasks:**
  - [ ] Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.
  - [ ] Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.
  - [ ] Document offline or demo data sources so static export serves the same UX as serverful mode.
  - [ ] Display memory/FPS metrics plus synthetic CPU graph using `requestAnimationFrame` buckets.
- **Acceptance criteria:**
  - Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.
  - UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.
  - All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation.
- **Dependencies:**
  - Design token audit from `docs/TASKS_UI_POLISH.md`
  - Dock metadata normalization
  - Settings/reset wiring for shared preferences
- **Task envelope:**
  ```json
  {
    "appId": "resource-monitor",
    "title": "Resource Monitor",
    "route": "/apps/resource-monitor",
    "component": "apps/resource-monitor/index.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Display memory/FPS metrics plus synthetic CPU graph using `requestAnimationFrame` buckets."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  }
  ```

### Screen Recorder (`screen-recorder`)

- **Route:** `/apps/screen-recorder`
- **Implementation:** `components/apps/screen-recorder.tsx`
- **Frame contract:** `DesktopWindow`
- **Outstanding tasks:**
  - [ ] Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.
  - [ ] Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.
  - [ ] Document offline or demo data sources so static export serves the same UX as serverful mode.
  - [ ] Clarify permission prompts, recording limits, and storage strategy for offline export.
- **Acceptance criteria:**
  - Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.
  - UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.
  - All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation.
- **Dependencies:**
  - Design token audit from `docs/TASKS_UI_POLISH.md`
  - Dock metadata normalization
  - Settings/reset wiring for shared preferences
- **Task envelope:**
  ```json
  {
    "appId": "screen-recorder",
    "title": "Screen Recorder",
    "route": "/apps/screen-recorder",
    "component": "components/apps/screen-recorder.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Clarify permission prompts, recording limits, and storage strategy for offline export."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  }
  ```

### Serial Terminal (`serial-terminal`)

- **Route:** `/apps/serial-terminal`
- **Implementation:** `components/apps/serial-terminal.tsx`
- **Frame contract:** `DesktopWindow`
- **Outstanding tasks:**
  - [ ] Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.
  - [ ] Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.
  - [ ] Document offline or demo data sources so static export serves the same UX as serverful mode.
- **Acceptance criteria:**
  - Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.
  - UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.
  - All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation.
- **Dependencies:**
  - Design token audit from `docs/TASKS_UI_POLISH.md`
  - Dock metadata normalization
  - Settings/reset wiring for shared preferences
- **Task envelope:**
  ```json
  {
    "appId": "serial-terminal",
    "title": "Serial Terminal",
    "route": "/apps/serial-terminal",
    "component": "components/apps/serial-terminal.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  }
  ```

### Settings (`settings`)

- **Route:** `/apps/settings`
- **Implementation:** `components/apps/settings.js`
- **Frame contract:** `DesktopWindow`
- **Outstanding tasks:**
  - [ ] Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.
  - [ ] Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.
  - [ ] Document offline or demo data sources so static export serves the same UX as serverful mode.
- **Acceptance criteria:**
  - Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.
  - UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.
  - All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation.
- **Dependencies:**
  - Design token audit from `docs/TASKS_UI_POLISH.md`
  - Dock metadata normalization
  - Settings/reset wiring for shared preferences
- **Task envelope:**
  ```json
  {
    "appId": "settings",
    "title": "Settings",
    "route": "/apps/settings",
    "component": "components/apps/settings.js",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  }
  ```

### SSH Builder (`ssh`)

- **Route:** `/apps/ssh`
- **Implementation:** `apps/ssh/index.tsx`
- **Frame contract:** `DesktopWindow`
- **Outstanding tasks:**
  - [ ] Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.
  - [ ] Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.
  - [ ] Document offline or demo data sources so static export serves the same UX as serverful mode.
  - [ ] Protect the preset library and validation already marked ready—keep regression coverage in place.
- **Acceptance criteria:**
  - Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.
  - UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.
  - All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation.
- **Dependencies:**
  - Design token audit from `docs/TASKS_UI_POLISH.md`
  - Dock metadata normalization
  - Settings/reset wiring for shared preferences
- **Task envelope:**
  ```json
  {
    "appId": "ssh",
    "title": "SSH Builder",
    "route": "/apps/ssh",
    "component": "apps/ssh/index.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Protect the preset library and validation already marked ready—keep regression coverage in place."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  }
  ```

### Sticky Notes (`sticky_notes`)

- **Route:** `/apps/sticky_notes`
- **Implementation:** `components/apps/sticky_notes/index.tsx`
- **Frame contract:** `DesktopWindow`
- **Outstanding tasks:**
  - [ ] Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.
  - [ ] Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.
  - [ ] Document offline or demo data sources so static export serves the same UX as serverful mode.
  - [ ] Confirm persistence model and draggable handles comply with desktop layout constraints.
- **Acceptance criteria:**
  - Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.
  - UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.
  - All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation.
- **Dependencies:**
  - Design token audit from `docs/TASKS_UI_POLISH.md`
  - Dock metadata normalization
  - Settings/reset wiring for shared preferences
- **Task envelope:**
  ```json
  {
    "appId": "sticky_notes",
    "title": "Sticky Notes",
    "route": "/apps/sticky_notes",
    "component": "components/apps/sticky_notes/index.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Confirm persistence model and draggable handles comply with desktop layout constraints."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  }
  ```

### Terminal (`terminal`)

- **Route:** `/apps/terminal`
- **Implementation:** `components/apps/terminal.tsx`
- **Frame contract:** `DesktopWindow`
- **Outstanding tasks:**
  - [ ] Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.
  - [ ] Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.
  - [ ] Document offline or demo data sources so static export serves the same UX as serverful mode.
  - [ ] Expand the command registry and ensure paste/autocomplete flows respect accessibility guidance.
- **Acceptance criteria:**
  - Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.
  - UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.
  - All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation.
- **Dependencies:**
  - Design token audit from `docs/TASKS_UI_POLISH.md`
  - Dock metadata normalization
  - Settings/reset wiring for shared preferences
- **Task envelope:**
  ```json
  {
    "appId": "terminal",
    "title": "Terminal",
    "route": "/apps/terminal",
    "component": "components/apps/terminal.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Expand the command registry and ensure paste/autocomplete flows respect accessibility guidance."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  }
  ```

### Todoist (`todoist`)

- **Route:** `/apps/todoist`
- **Implementation:** `components/apps/todoist.js`
- **Frame contract:** `DesktopWindow`
- **Outstanding tasks:**
  - [ ] Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.
  - [ ] Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.
  - [ ] Document offline or demo data sources so static export serves the same UX as serverful mode.
  - [ ] Implement sections, due dates, drag-drop ordering, and quick-add persistence.
- **Acceptance criteria:**
  - Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.
  - UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.
  - All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation.
- **Dependencies:**
  - Design token audit from `docs/TASKS_UI_POLISH.md`
  - Dock metadata normalization
  - Settings/reset wiring for shared preferences
- **Task envelope:**
  ```json
  {
    "appId": "todoist",
    "title": "Todoist",
    "route": "/apps/todoist",
    "component": "components/apps/todoist.js",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Implement sections, due dates, drag-drop ordering, and quick-add persistence."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  }
  ```

### Trash (`trash`)

- **Route:** `/apps/trash`
- **Implementation:** `components/apps/trash/index.tsx`
- **Frame contract:** `DesktopWindow`
- **Outstanding tasks:**
  - [ ] Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.
  - [ ] Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.
  - [ ] Document offline or demo data sources so static export serves the same UX as serverful mode.
- **Acceptance criteria:**
  - Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.
  - UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.
  - All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation.
- **Dependencies:**
  - Design token audit from `docs/TASKS_UI_POLISH.md`
  - Dock metadata normalization
  - Settings/reset wiring for shared preferences
- **Task envelope:**
  ```json
  {
    "appId": "trash",
    "title": "Trash",
    "route": "/apps/trash",
    "component": "components/apps/trash/index.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  }
  ```

### Weather (`weather`)

- **Route:** `/apps/weather`
- **Implementation:** `components/apps/weather.js`
- **Frame contract:** `DesktopWindow`
- **Outstanding tasks:**
  - [ ] Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.
  - [ ] Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.
  - [ ] Document offline or demo data sources so static export serves the same UX as serverful mode.
  - [ ] Show fake data with city picker and unit toggle or accept API key via Settings.
- **Acceptance criteria:**
  - Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.
  - UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.
  - All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation.
- **Dependencies:**
  - Design token audit from `docs/TASKS_UI_POLISH.md`
  - Dock metadata normalization
  - Settings/reset wiring for shared preferences
- **Task envelope:**
  ```json
  {
    "appId": "weather",
    "title": "Weather",
    "route": "/apps/weather",
    "component": "components/apps/weather.js",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Show fake data with city picker and unit toggle or accept API key via Settings."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  }
  ```

### Weather Widget (`weather-widget`)

- **Route:** `/apps/weather-widget`
- **Implementation:** `components/apps/weather_widget/index.tsx`
- **Frame contract:** `DesktopWindow`
- **Outstanding tasks:**
  - [ ] Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.
  - [ ] Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.
  - [ ] Document offline or demo data sources so static export serves the same UX as serverful mode.
  - [ ] Ensure widget respects Settings toggles and shares offline data with the Weather app.
- **Acceptance criteria:**
  - Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.
  - UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.
  - All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation.
- **Dependencies:**
  - Design token audit from `docs/TASKS_UI_POLISH.md`
  - Dock metadata normalization
  - Settings/reset wiring for shared preferences
- **Task envelope:**
  ```json
  {
    "appId": "weather-widget",
    "title": "Weather Widget",
    "route": "/apps/weather-widget",
    "component": "components/apps/weather_widget/index.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Ensure widget respects Settings toggles and shares offline data with the Weather app."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  }
  ```

## Utility Drawer Entries
### ASCII Art (`ascii-art`)

- **Route:** `/apps/ascii-art`
- **Implementation:** `apps/ascii-art/index.tsx`
- **Frame contract:** `DesktopWindow`
- **Outstanding tasks:**
  - [ ] Align styles with the design token audit so utilities match the rest of the desktop shell.
  - [ ] Backfill missing help text or tooltips so new users understand the utility at first launch.
  - [ ] Confirm icons and shortcuts in `apps.config.js` match the Utilities desktop folder grouping.
  - [ ] Support text-to-ASCII and image-to-ASCII conversion with hidden canvas sampling.
- **Acceptance criteria:**
  - Each utility exposes inline guidance, keyboard affordances, and copy/clear actions validated via smoke tests.
  - Offline/demo data is bundled locally so static exports behave identically to SSR builds.
  - Launcher metadata keeps shortcuts enabled and respects favorites/dock pinning toggles.
- **Dependencies:**
  - Design token audit
  - Dock metadata normalization
  - Utilities folder metadata in `data/desktopFolders.js`
- **Task envelope:**
  ```json
  {
    "appId": "ascii-art",
    "title": "ASCII Art",
    "route": "/apps/ascii-art",
    "component": "apps/ascii-art/index.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Align styles with the design token audit so utilities match the rest of the desktop shell.",
      "Backfill missing help text or tooltips so new users understand the utility at first launch.",
      "Confirm icons and shortcuts in `apps.config.js` match the Utilities desktop folder grouping.",
      "Support text-to-ASCII and image-to-ASCII conversion with hidden canvas sampling."
    ],
    "acceptanceCriteria": [
      "Each utility exposes inline guidance, keyboard affordances, and copy/clear actions validated via smoke tests.",
      "Offline/demo data is bundled locally so static exports behave identically to SSR builds.",
      "Launcher metadata keeps shortcuts enabled and respects favorites/dock pinning toggles."
    ],
    "dependencies": [
      "Design token audit",
      "Dock metadata normalization",
      "Utilities folder metadata in `data/desktopFolders.js`"
    ]
  }
  ```

### Clipboard Manager (`clipboard-manager`)

- **Route:** `/apps/clipboard-manager`
- **Implementation:** `components/apps/ClipboardManager.tsx`
- **Frame contract:** `DesktopWindow`
- **Outstanding tasks:**
  - [ ] Align styles with the design token audit so utilities match the rest of the desktop shell.
  - [ ] Backfill missing help text or tooltips so new users understand the utility at first launch.
  - [ ] Confirm icons and shortcuts in `apps.config.js` match the Utilities desktop folder grouping.
- **Acceptance criteria:**
  - Each utility exposes inline guidance, keyboard affordances, and copy/clear actions validated via smoke tests.
  - Offline/demo data is bundled locally so static exports behave identically to SSR builds.
  - Launcher metadata keeps shortcuts enabled and respects favorites/dock pinning toggles.
- **Dependencies:**
  - Design token audit
  - Dock metadata normalization
  - Utilities folder metadata in `data/desktopFolders.js`
- **Task envelope:**
  ```json
  {
    "appId": "clipboard-manager",
    "title": "Clipboard Manager",
    "route": "/apps/clipboard-manager",
    "component": "components/apps/ClipboardManager.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Align styles with the design token audit so utilities match the rest of the desktop shell.",
      "Backfill missing help text or tooltips so new users understand the utility at first launch.",
      "Confirm icons and shortcuts in `apps.config.js` match the Utilities desktop folder grouping."
    ],
    "acceptanceCriteria": [
      "Each utility exposes inline guidance, keyboard affordances, and copy/clear actions validated via smoke tests.",
      "Offline/demo data is bundled locally so static exports behave identically to SSR builds.",
      "Launcher metadata keeps shortcuts enabled and respects favorites/dock pinning toggles."
    ],
    "dependencies": [
      "Design token audit",
      "Dock metadata normalization",
      "Utilities folder metadata in `data/desktopFolders.js`"
    ]
  }
  ```

### Figlet (`figlet`)

- **Route:** `/apps/figlet`
- **Implementation:** `components/apps/figlet/index.js`
- **Frame contract:** `DesktopWindow`
- **Outstanding tasks:**
  - [ ] Align styles with the design token audit so utilities match the rest of the desktop shell.
  - [ ] Backfill missing help text or tooltips so new users understand the utility at first launch.
  - [ ] Confirm icons and shortcuts in `apps.config.js` match the Utilities desktop folder grouping.
  - [ ] Provide font selector, copy-to-clipboard, and IndexedDB font cache.
- **Acceptance criteria:**
  - Each utility exposes inline guidance, keyboard affordances, and copy/clear actions validated via smoke tests.
  - Offline/demo data is bundled locally so static exports behave identically to SSR builds.
  - Launcher metadata keeps shortcuts enabled and respects favorites/dock pinning toggles.
- **Dependencies:**
  - Design token audit
  - Dock metadata normalization
  - Utilities folder metadata in `data/desktopFolders.js`
- **Task envelope:**
  ```json
  {
    "appId": "figlet",
    "title": "Figlet",
    "route": "/apps/figlet",
    "component": "components/apps/figlet/index.js",
    "frame": "DesktopWindow",
    "tasks": [
      "Align styles with the design token audit so utilities match the rest of the desktop shell.",
      "Backfill missing help text or tooltips so new users understand the utility at first launch.",
      "Confirm icons and shortcuts in `apps.config.js` match the Utilities desktop folder grouping.",
      "Provide font selector, copy-to-clipboard, and IndexedDB font cache."
    ],
    "acceptanceCriteria": [
      "Each utility exposes inline guidance, keyboard affordances, and copy/clear actions validated via smoke tests.",
      "Offline/demo data is bundled locally so static exports behave identically to SSR builds.",
      "Launcher metadata keeps shortcuts enabled and respects favorites/dock pinning toggles."
    ],
    "dependencies": [
      "Design token audit",
      "Dock metadata normalization",
      "Utilities folder metadata in `data/desktopFolders.js`"
    ]
  }
  ```

### Input Lab (`input-lab`)

- **Route:** `/apps/input-lab`
- **Implementation:** `components/apps/input-lab/index.tsx`
- **Frame contract:** `DesktopWindow`
- **Outstanding tasks:**
  - [ ] Align styles with the design token audit so utilities match the rest of the desktop shell.
  - [ ] Backfill missing help text or tooltips so new users understand the utility at first launch.
  - [ ] Confirm icons and shortcuts in `apps.config.js` match the Utilities desktop folder grouping.
  - [ ] Cover keyboard, mouse, and gamepad devices with calibration guidance.
- **Acceptance criteria:**
  - Each utility exposes inline guidance, keyboard affordances, and copy/clear actions validated via smoke tests.
  - Offline/demo data is bundled locally so static exports behave identically to SSR builds.
  - Launcher metadata keeps shortcuts enabled and respects favorites/dock pinning toggles.
- **Dependencies:**
  - Design token audit
  - Dock metadata normalization
  - Utilities folder metadata in `data/desktopFolders.js`
- **Task envelope:**
  ```json
  {
    "appId": "input-lab",
    "title": "Input Lab",
    "route": "/apps/input-lab",
    "component": "components/apps/input-lab/index.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Align styles with the design token audit so utilities match the rest of the desktop shell.",
      "Backfill missing help text or tooltips so new users understand the utility at first launch.",
      "Confirm icons and shortcuts in `apps.config.js` match the Utilities desktop folder grouping.",
      "Cover keyboard, mouse, and gamepad devices with calibration guidance."
    ],
    "acceptanceCriteria": [
      "Each utility exposes inline guidance, keyboard affordances, and copy/clear actions validated via smoke tests.",
      "Offline/demo data is bundled locally so static exports behave identically to SSR builds.",
      "Launcher metadata keeps shortcuts enabled and respects favorites/dock pinning toggles."
    ],
    "dependencies": [
      "Design token audit",
      "Dock metadata normalization",
      "Utilities folder metadata in `data/desktopFolders.js`"
    ]
  }
  ```

### Project Gallery (`project-gallery`)

- **Route:** `/apps/project-gallery`
- **Implementation:** `components/apps/project-gallery.tsx`
- **Frame contract:** `DesktopWindow`
- **Outstanding tasks:**
  - [ ] Align styles with the design token audit so utilities match the rest of the desktop shell.
  - [ ] Backfill missing help text or tooltips so new users understand the utility at first launch.
  - [ ] Confirm icons and shortcuts in `apps.config.js` match the Utilities desktop folder grouping.
  - [ ] Load cards from `projects.json`, add filters, and surface repo/live CTA buttons.
- **Acceptance criteria:**
  - Each utility exposes inline guidance, keyboard affordances, and copy/clear actions validated via smoke tests.
  - Offline/demo data is bundled locally so static exports behave identically to SSR builds.
  - Launcher metadata keeps shortcuts enabled and respects favorites/dock pinning toggles.
- **Dependencies:**
  - Design token audit
  - Dock metadata normalization
  - Utilities folder metadata in `data/desktopFolders.js`
- **Task envelope:**
  ```json
  {
    "appId": "project-gallery",
    "title": "Project Gallery",
    "route": "/apps/project-gallery",
    "component": "components/apps/project-gallery.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Align styles with the design token audit so utilities match the rest of the desktop shell.",
      "Backfill missing help text or tooltips so new users understand the utility at first launch.",
      "Confirm icons and shortcuts in `apps.config.js` match the Utilities desktop folder grouping.",
      "Load cards from `projects.json`, add filters, and surface repo/live CTA buttons."
    ],
    "acceptanceCriteria": [
      "Each utility exposes inline guidance, keyboard affordances, and copy/clear actions validated via smoke tests.",
      "Offline/demo data is bundled locally so static exports behave identically to SSR builds.",
      "Launcher metadata keeps shortcuts enabled and respects favorites/dock pinning toggles."
    ],
    "dependencies": [
      "Design token audit",
      "Dock metadata normalization",
      "Utilities folder metadata in `data/desktopFolders.js`"
    ]
  }
  ```

### QR Tool (`qr`)

- **Route:** `/apps/qr`
- **Implementation:** `components/apps/qr/index.tsx`
- **Frame contract:** `DesktopWindow`
- **Outstanding tasks:**
  - [ ] Align styles with the design token audit so utilities match the rest of the desktop shell.
  - [ ] Backfill missing help text or tooltips so new users understand the utility at first launch.
  - [ ] Confirm icons and shortcuts in `apps.config.js` match the Utilities desktop folder grouping.
  - [ ] Add camera selection and downloadable QR output.
- **Acceptance criteria:**
  - Each utility exposes inline guidance, keyboard affordances, and copy/clear actions validated via smoke tests.
  - Offline/demo data is bundled locally so static exports behave identically to SSR builds.
  - Launcher metadata keeps shortcuts enabled and respects favorites/dock pinning toggles.
- **Dependencies:**
  - Design token audit
  - Dock metadata normalization
  - Utilities folder metadata in `data/desktopFolders.js`
- **Task envelope:**
  ```json
  {
    "appId": "qr",
    "title": "QR Tool",
    "route": "/apps/qr",
    "component": "components/apps/qr/index.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Align styles with the design token audit so utilities match the rest of the desktop shell.",
      "Backfill missing help text or tooltips so new users understand the utility at first launch.",
      "Confirm icons and shortcuts in `apps.config.js` match the Utilities desktop folder grouping.",
      "Add camera selection and downloadable QR output."
    ],
    "acceptanceCriteria": [
      "Each utility exposes inline guidance, keyboard affordances, and copy/clear actions validated via smoke tests.",
      "Offline/demo data is bundled locally so static exports behave identically to SSR builds.",
      "Launcher metadata keeps shortcuts enabled and respects favorites/dock pinning toggles."
    ],
    "dependencies": [
      "Design token audit",
      "Dock metadata normalization",
      "Utilities folder metadata in `data/desktopFolders.js`"
    ]
  }
  ```

### Quote (`quote`)

- **Route:** `/apps/quote`
- **Implementation:** `components/apps/quote/index.tsx`
- **Frame contract:** `DesktopWindow`
- **Outstanding tasks:**
  - [ ] Align styles with the design token audit so utilities match the rest of the desktop shell.
  - [ ] Backfill missing help text or tooltips so new users understand the utility at first launch.
  - [ ] Confirm icons and shortcuts in `apps.config.js` match the Utilities desktop folder grouping.
  - [ ] Use offline JSON quotes with tags and a no-repeat option.
- **Acceptance criteria:**
  - Each utility exposes inline guidance, keyboard affordances, and copy/clear actions validated via smoke tests.
  - Offline/demo data is bundled locally so static exports behave identically to SSR builds.
  - Launcher metadata keeps shortcuts enabled and respects favorites/dock pinning toggles.
- **Dependencies:**
  - Design token audit
  - Dock metadata normalization
  - Utilities folder metadata in `data/desktopFolders.js`
- **Task envelope:**
  ```json
  {
    "appId": "quote",
    "title": "Quote",
    "route": "/apps/quote",
    "component": "components/apps/quote/index.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Align styles with the design token audit so utilities match the rest of the desktop shell.",
      "Backfill missing help text or tooltips so new users understand the utility at first launch.",
      "Confirm icons and shortcuts in `apps.config.js` match the Utilities desktop folder grouping.",
      "Use offline JSON quotes with tags and a no-repeat option."
    ],
    "acceptanceCriteria": [
      "Each utility exposes inline guidance, keyboard affordances, and copy/clear actions validated via smoke tests.",
      "Offline/demo data is bundled locally so static exports behave identically to SSR builds.",
      "Launcher metadata keeps shortcuts enabled and respects favorites/dock pinning toggles."
    ],
    "dependencies": [
      "Design token audit",
      "Dock metadata normalization",
      "Utilities folder metadata in `data/desktopFolders.js`"
    ]
  }
  ```

### Subnet Calculator (`subnet-calculator`)

- **Route:** `/apps/subnet-calculator`
- **Implementation:** `components/apps/subnet-calculator.tsx`
- **Frame contract:** `DesktopWindow`
- **Outstanding tasks:**
  - [ ] Align styles with the design token audit so utilities match the rest of the desktop shell.
  - [ ] Backfill missing help text or tooltips so new users understand the utility at first launch.
  - [ ] Confirm icons and shortcuts in `apps.config.js` match the Utilities desktop folder grouping.
  - [ ] Add validation UX, preset ranges, and inline documentation for CIDR math.
- **Acceptance criteria:**
  - Each utility exposes inline guidance, keyboard affordances, and copy/clear actions validated via smoke tests.
  - Offline/demo data is bundled locally so static exports behave identically to SSR builds.
  - Launcher metadata keeps shortcuts enabled and respects favorites/dock pinning toggles.
- **Dependencies:**
  - Design token audit
  - Dock metadata normalization
  - Utilities folder metadata in `data/desktopFolders.js`
- **Task envelope:**
  ```json
  {
    "appId": "subnet-calculator",
    "title": "Subnet Calculator",
    "route": "/apps/subnet-calculator",
    "component": "components/apps/subnet-calculator.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Align styles with the design token audit so utilities match the rest of the desktop shell.",
      "Backfill missing help text or tooltips so new users understand the utility at first launch.",
      "Confirm icons and shortcuts in `apps.config.js` match the Utilities desktop folder grouping.",
      "Add validation UX, preset ranges, and inline documentation for CIDR math."
    ],
    "acceptanceCriteria": [
      "Each utility exposes inline guidance, keyboard affordances, and copy/clear actions validated via smoke tests.",
      "Offline/demo data is bundled locally so static exports behave identically to SSR builds.",
      "Launcher metadata keeps shortcuts enabled and respects favorites/dock pinning toggles."
    ],
    "dependencies": [
      "Design token audit",
      "Dock metadata normalization",
      "Utilities folder metadata in `data/desktopFolders.js`"
    ]
  }
  ```

## Security Tool Simulators
### Autopsy (`autopsy`)

- **Route:** `/apps/autopsy`
- **Implementation:** `components/apps/autopsy/index.js`
- **Frame contract:** `SimulatedToolFrame`
- **Outstanding tasks:**
  - [ ] Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.
  - [ ] Load canned fixtures for commands/results so static export and offline demos stay deterministic.
  - [ ] Surface "For lab use only" copy, safety instructions, and quickstart steps in the intro panel.
  - [ ] Curate forensic dataset previews and timeline walkthrough scripts.
- **Acceptance criteria:**
  - SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.
  - Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.
  - Lab mode toggle defaults to off and gating prevents destructive flows during demos.
- **Dependencies:**
  - SimulatedToolFrame rollout from security tooling plan
  - Fixture JSON stored under `data/` with schema tests
  - Lab mode flag plumbing in settings service
- **Task envelope:**
  ```json
  {
    "appId": "autopsy",
    "title": "Autopsy",
    "route": "/apps/autopsy",
    "component": "components/apps/autopsy/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Curate forensic dataset previews and timeline walkthrough scripts."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  }
  ```

### BeEF (`beef`)

- **Route:** `/apps/beef`
- **Implementation:** `components/apps/beef/index.js`
- **Frame contract:** `SimulatedToolFrame`
- **Outstanding tasks:**
  - [ ] Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.
  - [ ] Load canned fixtures for commands/results so static export and offline demos stay deterministic.
  - [ ] Surface "For lab use only" copy, safety instructions, and quickstart steps in the intro panel.
  - [ ] Bundle browser exploit fixtures and quickstart scenarios that emphasise safe, read-only demos.
- **Acceptance criteria:**
  - SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.
  - Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.
  - Lab mode toggle defaults to off and gating prevents destructive flows during demos.
- **Dependencies:**
  - SimulatedToolFrame rollout from security tooling plan
  - Fixture JSON stored under `data/` with schema tests
  - Lab mode flag plumbing in settings service
- **Task envelope:**
  ```json
  {
    "appId": "beef",
    "title": "BeEF",
    "route": "/apps/beef",
    "component": "components/apps/beef/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Bundle browser exploit fixtures and quickstart scenarios that emphasise safe, read-only demos."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  }
  ```

### BLE Sensor (`ble-sensor`)

- **Route:** `/apps/ble-sensor`
- **Implementation:** `components/apps/ble-sensor.tsx`
- **Frame contract:** `SimulatedToolFrame`
- **Outstanding tasks:**
  - [ ] Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.
  - [ ] Load canned fixtures for commands/results so static export and offline demos stay deterministic.
  - [ ] Surface "For lab use only" copy, safety instructions, and quickstart steps in the intro panel.
  - [ ] Bundle BLE datasets and confirm simulator UX.
- **Acceptance criteria:**
  - SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.
  - Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.
  - Lab mode toggle defaults to off and gating prevents destructive flows during demos.
- **Dependencies:**
  - SimulatedToolFrame rollout from security tooling plan
  - Fixture JSON stored under `data/` with schema tests
  - Lab mode flag plumbing in settings service
- **Task envelope:**
  ```json
  {
    "appId": "ble-sensor",
    "title": "BLE Sensor",
    "route": "/apps/ble-sensor",
    "component": "components/apps/ble-sensor.tsx",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Bundle BLE datasets and confirm simulator UX."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  }
  ```

### dsniff (`dsniff`)

- **Route:** `/apps/dsniff`
- **Implementation:** `components/apps/dsniff/index.js`
- **Frame contract:** `SimulatedToolFrame`
- **Outstanding tasks:**
  - [ ] Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.
  - [ ] Load canned fixtures for commands/results so static export and offline demos stay deterministic.
  - [ ] Surface "For lab use only" copy, safety instructions, and quickstart steps in the intro panel.
  - [ ] Add command builder and sample outputs.
- **Acceptance criteria:**
  - SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.
  - Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.
  - Lab mode toggle defaults to off and gating prevents destructive flows during demos.
- **Dependencies:**
  - SimulatedToolFrame rollout from security tooling plan
  - Fixture JSON stored under `data/` with schema tests
  - Lab mode flag plumbing in settings service
- **Task envelope:**
  ```json
  {
    "appId": "dsniff",
    "title": "dsniff",
    "route": "/apps/dsniff",
    "component": "components/apps/dsniff/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Add command builder and sample outputs."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  }
  ```

### Ettercap (`ettercap`)

- **Route:** `/apps/ettercap`
- **Implementation:** `components/apps/ettercap/index.js`
- **Frame contract:** `SimulatedToolFrame`
- **Outstanding tasks:**
  - [ ] Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.
  - [ ] Load canned fixtures for commands/results so static export and offline demos stay deterministic.
  - [ ] Surface "For lab use only" copy, safety instructions, and quickstart steps in the intro panel.
  - [ ] Add network capture fixtures and MITM walkthrough instructions.
- **Acceptance criteria:**
  - SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.
  - Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.
  - Lab mode toggle defaults to off and gating prevents destructive flows during demos.
- **Dependencies:**
  - SimulatedToolFrame rollout from security tooling plan
  - Fixture JSON stored under `data/` with schema tests
  - Lab mode flag plumbing in settings service
- **Task envelope:**
  ```json
  {
    "appId": "ettercap",
    "title": "Ettercap",
    "route": "/apps/ettercap",
    "component": "components/apps/ettercap/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Add network capture fixtures and MITM walkthrough instructions."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  }
  ```

### Evidence Vault (`evidence-vault`)

- **Route:** `/apps/evidence-vault`
- **Implementation:** `components/apps/evidence-vault/index.js`
- **Frame contract:** `SimulatedToolFrame`
- **Outstanding tasks:**
  - [ ] Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.
  - [ ] Load canned fixtures for commands/results so static export and offline demos stay deterministic.
  - [ ] Surface "For lab use only" copy, safety instructions, and quickstart steps in the intro panel.
  - [ ] Clarify evidence data model, tagging, and offline storage.
- **Acceptance criteria:**
  - SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.
  - Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.
  - Lab mode toggle defaults to off and gating prevents destructive flows during demos.
- **Dependencies:**
  - SimulatedToolFrame rollout from security tooling plan
  - Fixture JSON stored under `data/` with schema tests
  - Lab mode flag plumbing in settings service
- **Task envelope:**
  ```json
  {
    "appId": "evidence-vault",
    "title": "Evidence Vault",
    "route": "/apps/evidence-vault",
    "component": "components/apps/evidence-vault/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Clarify evidence data model, tagging, and offline storage."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  }
  ```

### Ghidra (`ghidra`)

- **Route:** `/apps/ghidra`
- **Implementation:** `components/apps/ghidra/index.js`
- **Frame contract:** `SimulatedToolFrame`
- **Outstanding tasks:**
  - [ ] Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.
  - [ ] Load canned fixtures for commands/results so static export and offline demos stay deterministic.
  - [ ] Surface "For lab use only" copy, safety instructions, and quickstart steps in the intro panel.
  - [ ] Ship reverse-engineering fixtures with guided analysis notes.
- **Acceptance criteria:**
  - SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.
  - Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.
  - Lab mode toggle defaults to off and gating prevents destructive flows during demos.
- **Dependencies:**
  - SimulatedToolFrame rollout from security tooling plan
  - Fixture JSON stored under `data/` with schema tests
  - Lab mode flag plumbing in settings service
- **Task envelope:**
  ```json
  {
    "appId": "ghidra",
    "title": "Ghidra",
    "route": "/apps/ghidra",
    "component": "components/apps/ghidra/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Ship reverse-engineering fixtures with guided analysis notes."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  }
  ```

### Hashcat (`hashcat`)

- **Route:** `/apps/hashcat`
- **Implementation:** `components/apps/hashcat/index.js`
- **Frame contract:** `SimulatedToolFrame`
- **Outstanding tasks:**
  - [ ] Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.
  - [ ] Load canned fixtures for commands/results so static export and offline demos stay deterministic.
  - [ ] Surface "For lab use only" copy, safety instructions, and quickstart steps in the intro panel.
  - [ ] Bundle hash samples and strategy explanations for offline mode.
- **Acceptance criteria:**
  - SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.
  - Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.
  - Lab mode toggle defaults to off and gating prevents destructive flows during demos.
- **Dependencies:**
  - SimulatedToolFrame rollout from security tooling plan
  - Fixture JSON stored under `data/` with schema tests
  - Lab mode flag plumbing in settings service
- **Task envelope:**
  ```json
  {
    "appId": "hashcat",
    "title": "Hashcat",
    "route": "/apps/hashcat",
    "component": "components/apps/hashcat/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Bundle hash samples and strategy explanations for offline mode."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  }
  ```

### Hydra (`hydra`)

- **Route:** `/apps/hydra`
- **Implementation:** `components/apps/hydra/index.js`
- **Frame contract:** `SimulatedToolFrame`
- **Outstanding tasks:**
  - [ ] Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.
  - [ ] Load canned fixtures for commands/results so static export and offline demos stay deterministic.
  - [ ] Surface "For lab use only" copy, safety instructions, and quickstart steps in the intro panel.
  - [ ] Include credential list fixtures and scoring guidance.
- **Acceptance criteria:**
  - SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.
  - Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.
  - Lab mode toggle defaults to off and gating prevents destructive flows during demos.
- **Dependencies:**
  - SimulatedToolFrame rollout from security tooling plan
  - Fixture JSON stored under `data/` with schema tests
  - Lab mode flag plumbing in settings service
- **Task envelope:**
  ```json
  {
    "appId": "hydra",
    "title": "Hydra",
    "route": "/apps/hydra",
    "component": "components/apps/hydra/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Include credential list fixtures and scoring guidance."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  }
  ```

### John the Ripper (`john`)

- **Route:** `/apps/john`
- **Implementation:** `components/apps/john/index.js`
- **Frame contract:** `SimulatedToolFrame`
- **Outstanding tasks:**
  - [ ] Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.
  - [ ] Load canned fixtures for commands/results so static export and offline demos stay deterministic.
  - [ ] Surface "For lab use only" copy, safety instructions, and quickstart steps in the intro panel.
  - [ ] Reference lab fixtures and interpretation cards from `data/john/lab-fixtures.json`.
- **Acceptance criteria:**
  - SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.
  - Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.
  - Lab mode toggle defaults to off and gating prevents destructive flows during demos.
- **Dependencies:**
  - SimulatedToolFrame rollout from security tooling plan
  - Fixture JSON stored under `data/` with schema tests
  - Lab mode flag plumbing in settings service
- **Task envelope:**
  ```json
  {
    "appId": "john",
    "title": "John the Ripper",
    "route": "/apps/john",
    "component": "components/apps/john/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Reference lab fixtures and interpretation cards from `data/john/lab-fixtures.json`."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  }
  ```

### Kismet (`kismet`)

- **Route:** `/apps/kismet`
- **Implementation:** `components/apps/kismet.jsx`
- **Frame contract:** `SimulatedToolFrame`
- **Outstanding tasks:**
  - [ ] Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.
  - [ ] Load canned fixtures for commands/results so static export and offline demos stay deterministic.
  - [ ] Surface "For lab use only" copy, safety instructions, and quickstart steps in the intro panel.
  - [ ] Expose wireless fixtures and lab mode toggle documented in `docs/kismet-fixtures.md`.
- **Acceptance criteria:**
  - SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.
  - Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.
  - Lab mode toggle defaults to off and gating prevents destructive flows during demos.
- **Dependencies:**
  - SimulatedToolFrame rollout from security tooling plan
  - Fixture JSON stored under `data/` with schema tests
  - Lab mode flag plumbing in settings service
- **Task envelope:**
  ```json
  {
    "appId": "kismet",
    "title": "Kismet",
    "route": "/apps/kismet",
    "component": "components/apps/kismet.jsx",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Expose wireless fixtures and lab mode toggle documented in `docs/kismet-fixtures.md`."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  }
  ```

### Metasploit (`metasploit`)

- **Route:** `/apps/metasploit`
- **Implementation:** `components/apps/metasploit/index.js`
- **Frame contract:** `SimulatedToolFrame`
- **Outstanding tasks:**
  - [ ] Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.
  - [ ] Load canned fixtures for commands/results so static export and offline demos stay deterministic.
  - [ ] Surface "For lab use only" copy, safety instructions, and quickstart steps in the intro panel.
  - [ ] Align console simulation with modules JSON and timeline steps.
- **Acceptance criteria:**
  - SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.
  - Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.
  - Lab mode toggle defaults to off and gating prevents destructive flows during demos.
- **Dependencies:**
  - SimulatedToolFrame rollout from security tooling plan
  - Fixture JSON stored under `data/` with schema tests
  - Lab mode flag plumbing in settings service
- **Task envelope:**
  ```json
  {
    "appId": "metasploit",
    "title": "Metasploit",
    "route": "/apps/metasploit",
    "component": "components/apps/metasploit/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Align console simulation with modules JSON and timeline steps."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  }
  ```

### Metasploit Post (`msf-post`)

- **Route:** `/apps/msf-post`
- **Implementation:** `components/apps/msf-post/index.js`
- **Frame contract:** `SimulatedToolFrame`
- **Outstanding tasks:**
  - [ ] Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.
  - [ ] Load canned fixtures for commands/results so static export and offline demos stay deterministic.
  - [ ] Surface "For lab use only" copy, safety instructions, and quickstart steps in the intro panel.
  - [ ] Document post-exploitation module walkthrough and sample transcripts.
- **Acceptance criteria:**
  - SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.
  - Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.
  - Lab mode toggle defaults to off and gating prevents destructive flows during demos.
- **Dependencies:**
  - SimulatedToolFrame rollout from security tooling plan
  - Fixture JSON stored under `data/` with schema tests
  - Lab mode flag plumbing in settings service
- **Task envelope:**
  ```json
  {
    "appId": "msf-post",
    "title": "Metasploit Post",
    "route": "/apps/msf-post",
    "component": "components/apps/msf-post/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Document post-exploitation module walkthrough and sample transcripts."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  }
  ```

### Mimikatz (`mimikatz`)

- **Route:** `/apps/mimikatz`
- **Implementation:** `components/apps/mimikatz/index.js`
- **Frame contract:** `SimulatedToolFrame`
- **Outstanding tasks:**
  - [ ] Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.
  - [ ] Load canned fixtures for commands/results so static export and offline demos stay deterministic.
  - [ ] Surface "For lab use only" copy, safety instructions, and quickstart steps in the intro panel.
  - [ ] Load credential dump fixtures with interpretive cards and lab-mode gating.
- **Acceptance criteria:**
  - SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.
  - Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.
  - Lab mode toggle defaults to off and gating prevents destructive flows during demos.
- **Dependencies:**
  - SimulatedToolFrame rollout from security tooling plan
  - Fixture JSON stored under `data/` with schema tests
  - Lab mode flag plumbing in settings service
- **Task envelope:**
  ```json
  {
    "appId": "mimikatz",
    "title": "Mimikatz",
    "route": "/apps/mimikatz",
    "component": "components/apps/mimikatz/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Load credential dump fixtures with interpretive cards and lab-mode gating."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  }
  ```

### Mimikatz Offline (`mimikatz/offline`)

- **Route:** `/apps/mimikatz/offline`
- **Implementation:** `components/apps/mimikatz/offline/index.js`
- **Frame contract:** `SimulatedToolFrame`
- **Outstanding tasks:**
  - [ ] Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.
  - [ ] Load canned fixtures for commands/results so static export and offline demos stay deterministic.
  - [ ] Surface "For lab use only" copy, safety instructions, and quickstart steps in the intro panel.
  - [ ] Keep offline dataset bundle in sync with lab flows and Jest coverage.
- **Acceptance criteria:**
  - SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.
  - Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.
  - Lab mode toggle defaults to off and gating prevents destructive flows during demos.
- **Dependencies:**
  - SimulatedToolFrame rollout from security tooling plan
  - Fixture JSON stored under `data/` with schema tests
  - Lab mode flag plumbing in settings service
- **Task envelope:**
  ```json
  {
    "appId": "mimikatz/offline",
    "title": "Mimikatz Offline",
    "route": "/apps/mimikatz/offline",
    "component": "components/apps/mimikatz/offline/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Keep offline dataset bundle in sync with lab flows and Jest coverage."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  }
  ```

### Nessus (`nessus`)

- **Route:** `/apps/nessus`
- **Implementation:** `components/apps/nessus/index.js`
- **Frame contract:** `SimulatedToolFrame`
- **Outstanding tasks:**
  - [ ] Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.
  - [ ] Load canned fixtures for commands/results so static export and offline demos stay deterministic.
  - [ ] Surface "For lab use only" copy, safety instructions, and quickstart steps in the intro panel.
  - [ ] Surface scan report fixtures with severity filtering.
- **Acceptance criteria:**
  - SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.
  - Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.
  - Lab mode toggle defaults to off and gating prevents destructive flows during demos.
- **Dependencies:**
  - SimulatedToolFrame rollout from security tooling plan
  - Fixture JSON stored under `data/` with schema tests
  - Lab mode flag plumbing in settings service
- **Task envelope:**
  ```json
  {
    "appId": "nessus",
    "title": "Nessus",
    "route": "/apps/nessus",
    "component": "components/apps/nessus/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Surface scan report fixtures with severity filtering."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  }
  ```

### Nikto (`nikto`)

- **Route:** `/apps/nikto`
- **Implementation:** `components/apps/nikto/index.js`
- **Frame contract:** `SimulatedToolFrame`
- **Outstanding tasks:**
  - [ ] Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.
  - [ ] Load canned fixtures for commands/results so static export and offline demos stay deterministic.
  - [ ] Surface "For lab use only" copy, safety instructions, and quickstart steps in the intro panel.
  - [ ] Load canned outputs and lab banner.
- **Acceptance criteria:**
  - SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.
  - Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.
  - Lab mode toggle defaults to off and gating prevents destructive flows during demos.
- **Dependencies:**
  - SimulatedToolFrame rollout from security tooling plan
  - Fixture JSON stored under `data/` with schema tests
  - Lab mode flag plumbing in settings service
- **Task envelope:**
  ```json
  {
    "appId": "nikto",
    "title": "Nikto",
    "route": "/apps/nikto",
    "component": "components/apps/nikto/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Load canned outputs and lab banner."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  }
  ```

### Nmap NSE (`nmap-nse`)

- **Route:** `/apps/nmap-nse`
- **Implementation:** `components/apps/nmap-nse/index.js`
- **Frame contract:** `SimulatedToolFrame`
- **Outstanding tasks:**
  - [ ] Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.
  - [ ] Load canned fixtures for commands/results so static export and offline demos stay deterministic.
  - [ ] Surface "For lab use only" copy, safety instructions, and quickstart steps in the intro panel.
  - [ ] Load script output fixtures and highlight safe automation flows.
- **Acceptance criteria:**
  - SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.
  - Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.
  - Lab mode toggle defaults to off and gating prevents destructive flows during demos.
- **Dependencies:**
  - SimulatedToolFrame rollout from security tooling plan
  - Fixture JSON stored under `data/` with schema tests
  - Lab mode flag plumbing in settings service
- **Task envelope:**
  ```json
  {
    "appId": "nmap-nse",
    "title": "Nmap NSE",
    "route": "/apps/nmap-nse",
    "component": "components/apps/nmap-nse/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Load script output fixtures and highlight safe automation flows."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  }
  ```

### OpenVAS (`openvas`)

- **Route:** `/apps/openvas`
- **Implementation:** `components/apps/openvas/index.js`
- **Frame contract:** `SimulatedToolFrame`
- **Outstanding tasks:**
  - [ ] Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.
  - [ ] Load canned fixtures for commands/results so static export and offline demos stay deterministic.
  - [ ] Surface "For lab use only" copy, safety instructions, and quickstart steps in the intro panel.
  - [ ] Bundle scan report fixtures and gating copy.
- **Acceptance criteria:**
  - SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.
  - Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.
  - Lab mode toggle defaults to off and gating prevents destructive flows during demos.
- **Dependencies:**
  - SimulatedToolFrame rollout from security tooling plan
  - Fixture JSON stored under `data/` with schema tests
  - Lab mode flag plumbing in settings service
- **Task envelope:**
  ```json
  {
    "appId": "openvas",
    "title": "OpenVAS",
    "route": "/apps/openvas",
    "component": "components/apps/openvas/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Bundle scan report fixtures and gating copy."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  }
  ```

### Plugin Manager (`plugin-manager`)

- **Route:** `/apps/plugin-manager`
- **Implementation:** `components/apps/plugin-manager/index.tsx`
- **Frame contract:** `SimulatedToolFrame`
- **Outstanding tasks:**
  - [ ] Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.
  - [ ] Load canned fixtures for commands/results so static export and offline demos stay deterministic.
  - [ ] Surface "For lab use only" copy, safety instructions, and quickstart steps in the intro panel.
  - [ ] Document plugin scope and dependencies before surfacing controls.
- **Acceptance criteria:**
  - SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.
  - Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.
  - Lab mode toggle defaults to off and gating prevents destructive flows during demos.
- **Dependencies:**
  - SimulatedToolFrame rollout from security tooling plan
  - Fixture JSON stored under `data/` with schema tests
  - Lab mode flag plumbing in settings service
- **Task envelope:**
  ```json
  {
    "appId": "plugin-manager",
    "title": "Plugin Manager",
    "route": "/apps/plugin-manager",
    "component": "components/apps/plugin-manager/index.tsx",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Document plugin scope and dependencies before surfacing controls."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  }
  ```

### Radare2 (`radare2`)

- **Route:** `/apps/radare2`
- **Implementation:** `components/apps/radare2.jsx`
- **Frame contract:** `SimulatedToolFrame`
- **Outstanding tasks:**
  - [ ] Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.
  - [ ] Load canned fixtures for commands/results so static export and offline demos stay deterministic.
  - [ ] Surface "For lab use only" copy, safety instructions, and quickstart steps in the intro panel.
  - [ ] Provide static analysis fixture library with interpretive copy.
- **Acceptance criteria:**
  - SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.
  - Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.
  - Lab mode toggle defaults to off and gating prevents destructive flows during demos.
- **Dependencies:**
  - SimulatedToolFrame rollout from security tooling plan
  - Fixture JSON stored under `data/` with schema tests
  - Lab mode flag plumbing in settings service
- **Task envelope:**
  ```json
  {
    "appId": "radare2",
    "title": "Radare2",
    "route": "/apps/radare2",
    "component": "components/apps/radare2.jsx",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Provide static analysis fixture library with interpretive copy."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  }
  ```

### Reaver (`reaver`)

- **Route:** `/apps/reaver`
- **Implementation:** `components/apps/reaver/index.js`
- **Frame contract:** `SimulatedToolFrame`
- **Outstanding tasks:**
  - [ ] Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.
  - [ ] Load canned fixtures for commands/results so static export and offline demos stay deterministic.
  - [ ] Surface "For lab use only" copy, safety instructions, and quickstart steps in the intro panel.
  - [ ] Provide Wi-Fi fixture library plus safety disclaimers.
- **Acceptance criteria:**
  - SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.
  - Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.
  - Lab mode toggle defaults to off and gating prevents destructive flows during demos.
- **Dependencies:**
  - SimulatedToolFrame rollout from security tooling plan
  - Fixture JSON stored under `data/` with schema tests
  - Lab mode flag plumbing in settings service
- **Task envelope:**
  ```json
  {
    "appId": "reaver",
    "title": "Reaver",
    "route": "/apps/reaver",
    "component": "components/apps/reaver/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Provide Wi-Fi fixture library plus safety disclaimers."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  }
  ```

### Recon-ng (`recon-ng`)

- **Route:** `/apps/recon-ng`
- **Implementation:** `components/apps/reconng/index.tsx`
- **Frame contract:** `SimulatedToolFrame`
- **Outstanding tasks:**
  - [ ] Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.
  - [ ] Load canned fixtures for commands/results so static export and offline demos stay deterministic.
  - [ ] Surface "For lab use only" copy, safety instructions, and quickstart steps in the intro panel.
  - [ ] Ship recon dataset with module-by-module instructions.
- **Acceptance criteria:**
  - SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.
  - Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.
  - Lab mode toggle defaults to off and gating prevents destructive flows during demos.
- **Dependencies:**
  - SimulatedToolFrame rollout from security tooling plan
  - Fixture JSON stored under `data/` with schema tests
  - Lab mode flag plumbing in settings service
- **Task envelope:**
  ```json
  {
    "appId": "recon-ng",
    "title": "Recon-ng",
    "route": "/apps/recon-ng",
    "component": "components/apps/reconng/index.tsx",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Ship recon dataset with module-by-module instructions."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  }
  ```

### Security Tools (`security-tools`)

- **Route:** `/apps/security-tools`
- **Implementation:** `components/apps/security-tools/index.js`
- **Frame contract:** `SimulatedToolFrame`
- **Outstanding tasks:**
  - [ ] Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.
  - [ ] Load canned fixtures for commands/results so static export and offline demos stay deterministic.
  - [ ] Surface "For lab use only" copy, safety instructions, and quickstart steps in the intro panel.
  - [ ] Ensure category browser lists every simulator with lab-mode gating.
- **Acceptance criteria:**
  - SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.
  - Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.
  - Lab mode toggle defaults to off and gating prevents destructive flows during demos.
- **Dependencies:**
  - SimulatedToolFrame rollout from security tooling plan
  - Fixture JSON stored under `data/` with schema tests
  - Lab mode flag plumbing in settings service
- **Task envelope:**
  ```json
  {
    "appId": "security-tools",
    "title": "Security Tools",
    "route": "/apps/security-tools",
    "component": "components/apps/security-tools/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Ensure category browser lists every simulator with lab-mode gating."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  }
  ```

### Volatility (`volatility`)

- **Route:** `/apps/volatility`
- **Implementation:** `components/apps/volatility/index.js`
- **Frame contract:** `SimulatedToolFrame`
- **Outstanding tasks:**
  - [ ] Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.
  - [ ] Load canned fixtures for commands/results so static export and offline demos stay deterministic.
  - [ ] Surface "For lab use only" copy, safety instructions, and quickstart steps in the intro panel.
- **Acceptance criteria:**
  - SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.
  - Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.
  - Lab mode toggle defaults to off and gating prevents destructive flows during demos.
- **Dependencies:**
  - SimulatedToolFrame rollout from security tooling plan
  - Fixture JSON stored under `data/` with schema tests
  - Lab mode flag plumbing in settings service
- **Task envelope:**
  ```json
  {
    "appId": "volatility",
    "title": "Volatility",
    "route": "/apps/volatility",
    "component": "components/apps/volatility/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  }
  ```

### Wireshark (`wireshark`)

- **Route:** `/apps/wireshark`
- **Implementation:** `components/apps/wireshark/index.js`
- **Frame contract:** `SimulatedToolFrame`
- **Outstanding tasks:**
  - [ ] Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.
  - [ ] Load canned fixtures for commands/results so static export and offline demos stay deterministic.
  - [ ] Surface "For lab use only" copy, safety instructions, and quickstart steps in the intro panel.
  - [ ] Finalize simulator backlog with packet capture fixtures.
- **Acceptance criteria:**
  - SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.
  - Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.
  - Lab mode toggle defaults to off and gating prevents destructive flows during demos.
- **Dependencies:**
  - SimulatedToolFrame rollout from security tooling plan
  - Fixture JSON stored under `data/` with schema tests
  - Lab mode flag plumbing in settings service
- **Task envelope:**
  ```json
  {
    "appId": "wireshark",
    "title": "Wireshark",
    "route": "/apps/wireshark",
    "component": "components/apps/wireshark/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Finalize simulator backlog with packet capture fixtures."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  }
  ```

## Game Arcade
### 2048 (`2048`)

- **Route:** `/apps/2048`
- **Implementation:** `components/apps/2048.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "2048",
    "title": "2048",
    "route": "/apps/2048",
    "component": "components/apps/2048.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Asteroids (`asteroids`)

- **Route:** `/apps/asteroids`
- **Implementation:** `components/apps/asteroids.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "asteroids",
    "title": "Asteroids",
    "route": "/apps/asteroids",
    "component": "components/apps/asteroids.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Battleship (`battleship`)

- **Route:** `/apps/battleship`
- **Implementation:** `components/apps/battleship.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "battleship",
    "title": "Battleship",
    "route": "/apps/battleship",
    "component": "components/apps/battleship.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Blackjack (`blackjack`)

- **Route:** `/apps/blackjack`
- **Implementation:** `components/apps/blackjack.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "blackjack",
    "title": "Blackjack",
    "route": "/apps/blackjack",
    "component": "components/apps/blackjack.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Breakout (`breakout`)

- **Route:** `/apps/breakout`
- **Implementation:** `components/apps/breakout.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "breakout",
    "title": "Breakout",
    "route": "/apps/breakout",
    "component": "components/apps/breakout.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Candy Crush (`candy-crush`)

- **Route:** `/apps/candy-crush`
- **Implementation:** `components/apps/candy-crush.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
  - [ ] Keep boosters and persistent stats aligned with the QA-ready baseline.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "candy-crush",
    "title": "Candy Crush",
    "route": "/apps/candy-crush",
    "component": "components/apps/candy-crush.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.",
      "Keep boosters and persistent stats aligned with the QA-ready baseline."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Car Racer (`car-racer`)

- **Route:** `/apps/car-racer`
- **Implementation:** `components/apps/car-racer.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "car-racer",
    "title": "Car Racer",
    "route": "/apps/car-racer",
    "component": "components/apps/car-racer.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Checkers (`checkers`)

- **Route:** `/apps/checkers`
- **Implementation:** `components/apps/checkers.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "checkers",
    "title": "Checkers",
    "route": "/apps/checkers",
    "component": "components/apps/checkers.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Chess (`chess`)

- **Route:** `/apps/chess`
- **Implementation:** `components/apps/chess.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "chess",
    "title": "Chess",
    "route": "/apps/chess",
    "component": "components/apps/chess.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Connect Four (`connect-four`)

- **Route:** `/apps/connect-four`
- **Implementation:** `components/apps/connect-four.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "connect-four",
    "title": "Connect Four",
    "route": "/apps/connect-four",
    "component": "components/apps/connect-four.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Flappy Bird (`flappy-bird`)

- **Route:** `/apps/flappy-bird`
- **Implementation:** `components/apps/flappy-bird.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "flappy-bird",
    "title": "Flappy Bird",
    "route": "/apps/flappy-bird",
    "component": "components/apps/flappy-bird.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Frogger (`frogger`)

- **Route:** `/apps/frogger`
- **Implementation:** `components/apps/frogger.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "frogger",
    "title": "Frogger",
    "route": "/apps/frogger",
    "component": "components/apps/frogger.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Gomoku (`gomoku`)

- **Route:** `/apps/gomoku`
- **Implementation:** `components/apps/gomoku.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "gomoku",
    "title": "Gomoku",
    "route": "/apps/gomoku",
    "component": "components/apps/gomoku.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Hangman (`hangman`)

- **Route:** `/apps/hangman`
- **Implementation:** `components/apps/hangman.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
  - [ ] Add word list, timer, and difficulty settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "hangman",
    "title": "Hangman",
    "route": "/apps/hangman",
    "component": "components/apps/hangman.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.",
      "Add word list, timer, and difficulty settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Lane Runner (`lane-runner`)

- **Route:** `/apps/lane-runner`
- **Implementation:** `components/apps/lane-runner.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "lane-runner",
    "title": "Lane Runner",
    "route": "/apps/lane-runner",
    "component": "components/apps/lane-runner.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Memory (`memory`)

- **Route:** `/apps/memory`
- **Implementation:** `components/apps/memory.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "memory",
    "title": "Memory",
    "route": "/apps/memory",
    "component": "components/apps/memory.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Minesweeper (`minesweeper`)

- **Route:** `/apps/minesweeper`
- **Implementation:** `components/apps/minesweeper.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "minesweeper",
    "title": "Minesweeper",
    "route": "/apps/minesweeper",
    "component": "components/apps/minesweeper.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Nonogram (`nonogram`)

- **Route:** `/apps/nonogram`
- **Implementation:** `components/apps/nonogram.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "nonogram",
    "title": "Nonogram",
    "route": "/apps/nonogram",
    "component": "components/apps/nonogram.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Pacman (`pacman`)

- **Route:** `/apps/pacman`
- **Implementation:** `components/apps/pacman.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "pacman",
    "title": "Pacman",
    "route": "/apps/pacman",
    "component": "components/apps/pacman.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Pinball (`pinball`)

- **Route:** `/apps/pinball`
- **Implementation:** `components/apps/pinball.tsx`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "pinball",
    "title": "Pinball",
    "route": "/apps/pinball",
    "component": "components/apps/pinball.tsx",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Platformer (`platformer`)

- **Route:** `/apps/platformer`
- **Implementation:** `components/apps/platformer.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "platformer",
    "title": "Platformer",
    "route": "/apps/platformer",
    "component": "components/apps/platformer.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Pong (`pong`)

- **Route:** `/apps/pong`
- **Implementation:** `components/apps/pong.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "pong",
    "title": "Pong",
    "route": "/apps/pong",
    "component": "components/apps/pong.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Reversi (`reversi`)

- **Route:** `/apps/reversi`
- **Implementation:** `components/apps/reversi.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "reversi",
    "title": "Reversi",
    "route": "/apps/reversi",
    "component": "components/apps/reversi.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Simon (`simon`)

- **Route:** `/apps/simon`
- **Implementation:** `components/apps/simon.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "simon",
    "title": "Simon",
    "route": "/apps/simon",
    "component": "components/apps/simon.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Snake (`snake`)

- **Route:** `/apps/snake`
- **Implementation:** `components/apps/snake.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "snake",
    "title": "Snake",
    "route": "/apps/snake",
    "component": "components/apps/snake.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Sokoban (`sokoban`)

- **Route:** `/apps/sokoban`
- **Implementation:** `components/apps/sokoban.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "sokoban",
    "title": "Sokoban",
    "route": "/apps/sokoban",
    "component": "components/apps/sokoban.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Solitaire (`solitaire`)

- **Route:** `/apps/solitaire`
- **Implementation:** `components/apps/solitaire/index.tsx`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "solitaire",
    "title": "Solitaire",
    "route": "/apps/solitaire",
    "component": "components/apps/solitaire/index.tsx",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Space Invaders (`space-invaders`)

- **Route:** `/apps/space-invaders`
- **Implementation:** `components/apps/space-invaders.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "space-invaders",
    "title": "Space Invaders",
    "route": "/apps/space-invaders",
    "component": "components/apps/space-invaders.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Sudoku (`sudoku`)

- **Route:** `/apps/sudoku`
- **Implementation:** `components/apps/sudoku.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "sudoku",
    "title": "Sudoku",
    "route": "/apps/sudoku",
    "component": "components/apps/sudoku.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Tetris (`tetris`)

- **Route:** `/apps/tetris`
- **Implementation:** `components/apps/tetris.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "tetris",
    "title": "Tetris",
    "route": "/apps/tetris",
    "component": "components/apps/tetris.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Tic Tac Toe (`tictactoe`)

- **Route:** `/apps/tictactoe`
- **Implementation:** `components/apps/tictactoe.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "tictactoe",
    "title": "Tic Tac Toe",
    "route": "/apps/tictactoe",
    "component": "components/apps/tictactoe.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Tower Defense (`tower-defense`)

- **Route:** `/apps/tower-defense`
- **Implementation:** `components/apps/tower-defense.tsx`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "tower-defense",
    "title": "Tower Defense",
    "route": "/apps/tower-defense",
    "component": "components/apps/tower-defense.tsx",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Word Search (`word-search`)

- **Route:** `/apps/word-search`
- **Implementation:** `components/apps/word-search.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
  - [ ] Add timer, difficulty selector, and found words list.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "word-search",
    "title": "Word Search",
    "route": "/apps/word-search",
    "component": "components/apps/word-search.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.",
      "Add timer, difficulty selector, and found words list."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

### Wordle (`wordle`)

- **Route:** `/apps/wordle`
- **Implementation:** `components/apps/wordle.js`
- **Frame contract:** `GameShell`
- **Outstanding tasks:**
  - [ ] Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.
  - [ ] Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.
  - [ ] Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.
- **Acceptance criteria:**
  - GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.
  - High scores persist between sessions (or offer fallback instructions when storage is unavailable).
  - Window defaults prevent overflow and align to the games folder icon/dock metadata.
- **Dependencies:**
  - GameShell feature parity (controls + settings) from games plan
  - Shared game settings context
  - Dock metadata audit for games folder
- **Task envelope:**
  ```json
  {
    "appId": "wordle",
    "title": "Wordle",
    "route": "/apps/wordle",
    "component": "components/apps/wordle.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  }
  ```

## Desktop Folder Launchers
### Workspace & Media (`desktop-folder-workspace`)

- **Route:** `/apps/desktop-folder-workspace`
- **Implementation:** `data/desktopFolders.js`
- **Frame contract:** `DesktopFolder`
- **Outstanding tasks:**
  - [ ] Confirm folder icons, titles, and item lists stay in sync with `apps.config.js` registrations.
  - [ ] Provide onboarding copy for each folder describing what contributors should polish first.
  - [ ] Verify folder window defaults avoid overlapping the dock/taskbar when opened.
- **Acceptance criteria:**
  - Folder windows list all registered apps with accurate icons and open the correct route on activation.
  - Descriptions reference the catalog polish checklist so assignees can find scoped tasks quickly.
  - Folder metadata updates whenever new apps land or categories shift.
- **Dependencies:**
  - Desktop folder renderer
  - Catalog polish checklist upkeep
  - Dock metadata audit
- **Task envelope:**
  ```json
  {
    "appId": "desktop-folder-workspace",
    "title": "Workspace & Media",
    "route": "/apps/desktop-folder-workspace",
    "component": "data/desktopFolders.js",
    "frame": "DesktopFolder",
    "tasks": [
      "Confirm folder icons, titles, and item lists stay in sync with `apps.config.js` registrations.",
      "Provide onboarding copy for each folder describing what contributors should polish first.",
      "Verify folder window defaults avoid overlapping the dock/taskbar when opened."
    ],
    "acceptanceCriteria": [
      "Folder windows list all registered apps with accurate icons and open the correct route on activation.",
      "Descriptions reference the catalog polish checklist so assignees can find scoped tasks quickly.",
      "Folder metadata updates whenever new apps land or categories shift."
    ],
    "dependencies": [
      "Desktop folder renderer",
      "Catalog polish checklist upkeep",
      "Dock metadata audit"
    ]
  }
  ```

### Utilities & Widgets (`desktop-folder-utilities`)

- **Route:** `/apps/desktop-folder-utilities`
- **Implementation:** `data/desktopFolders.js`
- **Frame contract:** `DesktopFolder`
- **Outstanding tasks:**
  - [ ] Confirm folder icons, titles, and item lists stay in sync with `apps.config.js` registrations.
  - [ ] Provide onboarding copy for each folder describing what contributors should polish first.
  - [ ] Verify folder window defaults avoid overlapping the dock/taskbar when opened.
- **Acceptance criteria:**
  - Folder windows list all registered apps with accurate icons and open the correct route on activation.
  - Descriptions reference the catalog polish checklist so assignees can find scoped tasks quickly.
  - Folder metadata updates whenever new apps land or categories shift.
- **Dependencies:**
  - Desktop folder renderer
  - Catalog polish checklist upkeep
  - Dock metadata audit
- **Task envelope:**
  ```json
  {
    "appId": "desktop-folder-utilities",
    "title": "Utilities & Widgets",
    "route": "/apps/desktop-folder-utilities",
    "component": "data/desktopFolders.js",
    "frame": "DesktopFolder",
    "tasks": [
      "Confirm folder icons, titles, and item lists stay in sync with `apps.config.js` registrations.",
      "Provide onboarding copy for each folder describing what contributors should polish first.",
      "Verify folder window defaults avoid overlapping the dock/taskbar when opened."
    ],
    "acceptanceCriteria": [
      "Folder windows list all registered apps with accurate icons and open the correct route on activation.",
      "Descriptions reference the catalog polish checklist so assignees can find scoped tasks quickly.",
      "Folder metadata updates whenever new apps land or categories shift."
    ],
    "dependencies": [
      "Desktop folder renderer",
      "Catalog polish checklist upkeep",
      "Dock metadata audit"
    ]
  }
  ```

### Security Simulations (`desktop-folder-security`)

- **Route:** `/apps/desktop-folder-security`
- **Implementation:** `data/desktopFolders.js`
- **Frame contract:** `DesktopFolder`
- **Outstanding tasks:**
  - [ ] Confirm folder icons, titles, and item lists stay in sync with `apps.config.js` registrations.
  - [ ] Provide onboarding copy for each folder describing what contributors should polish first.
  - [ ] Verify folder window defaults avoid overlapping the dock/taskbar when opened.
- **Acceptance criteria:**
  - Folder windows list all registered apps with accurate icons and open the correct route on activation.
  - Descriptions reference the catalog polish checklist so assignees can find scoped tasks quickly.
  - Folder metadata updates whenever new apps land or categories shift.
- **Dependencies:**
  - Desktop folder renderer
  - Catalog polish checklist upkeep
  - Dock metadata audit
- **Task envelope:**
  ```json
  {
    "appId": "desktop-folder-security",
    "title": "Security Simulations",
    "route": "/apps/desktop-folder-security",
    "component": "data/desktopFolders.js",
    "frame": "DesktopFolder",
    "tasks": [
      "Confirm folder icons, titles, and item lists stay in sync with `apps.config.js` registrations.",
      "Provide onboarding copy for each folder describing what contributors should polish first.",
      "Verify folder window defaults avoid overlapping the dock/taskbar when opened."
    ],
    "acceptanceCriteria": [
      "Folder windows list all registered apps with accurate icons and open the correct route on activation.",
      "Descriptions reference the catalog polish checklist so assignees can find scoped tasks quickly.",
      "Folder metadata updates whenever new apps land or categories shift."
    ],
    "dependencies": [
      "Desktop folder renderer",
      "Catalog polish checklist upkeep",
      "Dock metadata audit"
    ]
  }
  ```

### Games Arcade (`desktop-folder-games`)

- **Route:** `/apps/desktop-folder-games`
- **Implementation:** `data/desktopFolders.js`
- **Frame contract:** `DesktopFolder`
- **Outstanding tasks:**
  - [ ] Confirm folder icons, titles, and item lists stay in sync with `apps.config.js` registrations.
  - [ ] Provide onboarding copy for each folder describing what contributors should polish first.
  - [ ] Verify folder window defaults avoid overlapping the dock/taskbar when opened.
- **Acceptance criteria:**
  - Folder windows list all registered apps with accurate icons and open the correct route on activation.
  - Descriptions reference the catalog polish checklist so assignees can find scoped tasks quickly.
  - Folder metadata updates whenever new apps land or categories shift.
- **Dependencies:**
  - Desktop folder renderer
  - Catalog polish checklist upkeep
  - Dock metadata audit
- **Task envelope:**
  ```json
  {
    "appId": "desktop-folder-games",
    "title": "Games Arcade",
    "route": "/apps/desktop-folder-games",
    "component": "data/desktopFolders.js",
    "frame": "DesktopFolder",
    "tasks": [
      "Confirm folder icons, titles, and item lists stay in sync with `apps.config.js` registrations.",
      "Provide onboarding copy for each folder describing what contributors should polish first.",
      "Verify folder window defaults avoid overlapping the dock/taskbar when opened."
    ],
    "acceptanceCriteria": [
      "Folder windows list all registered apps with accurate icons and open the correct route on activation.",
      "Descriptions reference the catalog polish checklist so assignees can find scoped tasks quickly.",
      "Folder metadata updates whenever new apps land or categories shift."
    ],
    "dependencies": [
      "Desktop folder renderer",
      "Catalog polish checklist upkeep",
      "Dock metadata audit"
    ]
  }
  ```

## Batch Task Envelopes
```json
[
  {
    "appId": "firefox",
    "title": "Firefox",
    "route": "/apps/firefox",
    "component": "components/apps/firefox/index.tsx",
    "frame": "EmbedFrame",
    "tasks": [
      "Wrap existing UI in `<EmbedFrame>` for unified loading, error, and offline states.",
      "Document offline/demo fallback instructions so the window remains functional without network access.",
      "Audit `apps.config.js` metadata for window defaults, resizability, and dock icon alignment.",
      "Replace the legacy Chrome simulation with a single iframe shell that persists the last URL and minimal chrome."
    ],
    "acceptanceCriteria": [
      "EmbedFrame exposes a skeleton state, offline banner, and retry affordance verified with the Spotify and YouTube embeds.",
      "Window opens with tuned default width/height, honors min constraints, and exposes descriptive dock tooltip text.",
      "Design tokens power typography and colors (no hard-coded hex values) across nav, buttons, and copy blocks."
    ],
    "dependencies": [
      "EmbedFrame component shipping from desktop shell plan",
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization tracked in `apps.config.js`"
    ]
  },
  {
    "appId": "spotify",
    "title": "Spotify",
    "route": "/apps/spotify",
    "component": "components/apps/spotify.jsx",
    "frame": "EmbedFrame",
    "tasks": [
      "Wrap existing UI in `<EmbedFrame>` for unified loading, error, and offline states.",
      "Document offline/demo fallback instructions so the window remains functional without network access.",
      "Audit `apps.config.js` metadata for window defaults, resizability, and dock icon alignment.",
      "Ship playlist editor JSON and mini-player mode in addition to the existing embed layout."
    ],
    "acceptanceCriteria": [
      "EmbedFrame exposes a skeleton state, offline banner, and retry affordance verified with the Spotify and YouTube embeds.",
      "Window opens with tuned default width/height, honors min constraints, and exposes descriptive dock tooltip text.",
      "Design tokens power typography and colors (no hard-coded hex values) across nav, buttons, and copy blocks."
    ],
    "dependencies": [
      "EmbedFrame component shipping from desktop shell plan",
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization tracked in `apps.config.js`"
    ]
  },
  {
    "appId": "vscode",
    "title": "Visual Studio Code",
    "route": "/apps/vscode",
    "component": "components/apps/vscode.jsx",
    "frame": "EmbedFrame",
    "tasks": [
      "Wrap existing UI in `<EmbedFrame>` for unified loading, error, and offline states.",
      "Document offline/demo fallback instructions so the window remains functional without network access.",
      "Audit `apps.config.js` metadata for window defaults, resizability, and dock icon alignment.",
      "Validate StackBlitz embed permissions and document offline fallback messaging."
    ],
    "acceptanceCriteria": [
      "EmbedFrame exposes a skeleton state, offline banner, and retry affordance verified with the Spotify and YouTube embeds.",
      "Window opens with tuned default width/height, honors min constraints, and exposes descriptive dock tooltip text.",
      "Design tokens power typography and colors (no hard-coded hex values) across nav, buttons, and copy blocks."
    ],
    "dependencies": [
      "EmbedFrame component shipping from desktop shell plan",
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization tracked in `apps.config.js`"
    ]
  },
  {
    "appId": "x",
    "title": "X",
    "route": "/apps/x",
    "component": "components/apps/x.js",
    "frame": "EmbedFrame",
    "tasks": [
      "Wrap existing UI in `<EmbedFrame>` for unified loading, error, and offline states.",
      "Document offline/demo fallback instructions so the window remains functional without network access.",
      "Audit `apps.config.js` metadata for window defaults, resizability, and dock icon alignment.",
      "Keep the timeline embed SSR-disabled with a manual theme toggle and documented fallback."
    ],
    "acceptanceCriteria": [
      "EmbedFrame exposes a skeleton state, offline banner, and retry affordance verified with the Spotify and YouTube embeds.",
      "Window opens with tuned default width/height, honors min constraints, and exposes descriptive dock tooltip text.",
      "Design tokens power typography and colors (no hard-coded hex values) across nav, buttons, and copy blocks."
    ],
    "dependencies": [
      "EmbedFrame component shipping from desktop shell plan",
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization tracked in `apps.config.js`"
    ]
  },
  {
    "appId": "youtube",
    "title": "YouTube",
    "route": "/apps/youtube",
    "component": "components/apps/youtube/index.tsx",
    "frame": "EmbedFrame",
    "tasks": [
      "Wrap existing UI in `<EmbedFrame>` for unified loading, error, and offline states.",
      "Document offline/demo fallback instructions so the window remains functional without network access.",
      "Audit `apps.config.js` metadata for window defaults, resizability, and dock icon alignment.",
      "Maintain demo catalog, search debouncing, and history controls with offline-first tests."
    ],
    "acceptanceCriteria": [
      "EmbedFrame exposes a skeleton state, offline banner, and retry affordance verified with the Spotify and YouTube embeds.",
      "Window opens with tuned default width/height, honors min constraints, and exposes descriptive dock tooltip text.",
      "Design tokens power typography and colors (no hard-coded hex values) across nav, buttons, and copy blocks."
    ],
    "dependencies": [
      "EmbedFrame component shipping from desktop shell plan",
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization tracked in `apps.config.js`"
    ]
  },
  {
    "appId": "about",
    "title": "About Alex",
    "route": "/apps/about",
    "component": "components/apps/alex.js",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  },
  {
    "appId": "calculator",
    "title": "Calculator",
    "route": "/apps/calculator",
    "component": "components/apps/calculator.js",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Wire tokenizer and shunting-yard evaluator plus keyboard support per the Calc backlog."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  },
  {
    "appId": "contact",
    "title": "Contact",
    "route": "/apps/contact",
    "component": "components/apps/contact/index.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Implement client-side validation, privacy note, and dummy submit endpoint."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  },
  {
    "appId": "gedit",
    "title": "Contact Me",
    "route": "/apps/gedit",
    "component": "components/apps/gedit.js",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Keep the contact workflow aligned with EmailJS and document feature flag requirements."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  },
  {
    "appId": "converter",
    "title": "Converter",
    "route": "/apps/converter",
    "component": "components/apps/converter/index.js",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  },
  {
    "appId": "files",
    "title": "Files",
    "route": "/apps/files",
    "component": "components/apps/file-explorer/index.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Align virtual filesystem breadcrumbs, recents, and drag/drop with the shared navigator hook."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  },
  {
    "appId": "html-rewriter",
    "title": "HTML Rewriter",
    "route": "/apps/html-rewriter",
    "component": "apps/html-rewriter/index.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Demonstrate transformations and ensure worker wiring stays mock-friendly."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  },
  {
    "appId": "http",
    "title": "HTTP Builder",
    "route": "/apps/http",
    "component": "apps/http/index.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Add request validation, canned responses, and error states for offline demos."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  },
  {
    "appId": "resource-monitor",
    "title": "Resource Monitor",
    "route": "/apps/resource-monitor",
    "component": "apps/resource-monitor/index.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Display memory/FPS metrics plus synthetic CPU graph using `requestAnimationFrame` buckets."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  },
  {
    "appId": "screen-recorder",
    "title": "Screen Recorder",
    "route": "/apps/screen-recorder",
    "component": "components/apps/screen-recorder.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Clarify permission prompts, recording limits, and storage strategy for offline export."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  },
  {
    "appId": "serial-terminal",
    "title": "Serial Terminal",
    "route": "/apps/serial-terminal",
    "component": "components/apps/serial-terminal.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  },
  {
    "appId": "settings",
    "title": "Settings",
    "route": "/apps/settings",
    "component": "components/apps/settings.js",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  },
  {
    "appId": "ssh",
    "title": "SSH Builder",
    "route": "/apps/ssh",
    "component": "apps/ssh/index.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Protect the preset library and validation already marked ready—keep regression coverage in place."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  },
  {
    "appId": "sticky_notes",
    "title": "Sticky Notes",
    "route": "/apps/sticky_notes",
    "component": "components/apps/sticky_notes/index.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Confirm persistence model and draggable handles comply with desktop layout constraints."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  },
  {
    "appId": "terminal",
    "title": "Terminal",
    "route": "/apps/terminal",
    "component": "components/apps/terminal.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Expand the command registry and ensure paste/autocomplete flows respect accessibility guidance."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  },
  {
    "appId": "todoist",
    "title": "Todoist",
    "route": "/apps/todoist",
    "component": "components/apps/todoist.js",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Implement sections, due dates, drag-drop ordering, and quick-add persistence."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  },
  {
    "appId": "trash",
    "title": "Trash",
    "route": "/apps/trash",
    "component": "components/apps/trash/index.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  },
  {
    "appId": "weather",
    "title": "Weather",
    "route": "/apps/weather",
    "component": "components/apps/weather.js",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Show fake data with city picker and unit toggle or accept API key via Settings."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  },
  {
    "appId": "weather-widget",
    "title": "Weather Widget",
    "route": "/apps/weather-widget",
    "component": "components/apps/weather_widget/index.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.",
      "Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.",
      "Document offline or demo data sources so static export serves the same UX as serverful mode.",
      "Ensure widget respects Settings toggles and shares offline data with the Weather app."
    ],
    "acceptanceCriteria": [
      "Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.",
      "UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.",
      "All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation."
    ],
    "dependencies": [
      "Design token audit from `docs/TASKS_UI_POLISH.md`",
      "Dock metadata normalization",
      "Settings/reset wiring for shared preferences"
    ]
  },
  {
    "appId": "ascii-art",
    "title": "ASCII Art",
    "route": "/apps/ascii-art",
    "component": "apps/ascii-art/index.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Align styles with the design token audit so utilities match the rest of the desktop shell.",
      "Backfill missing help text or tooltips so new users understand the utility at first launch.",
      "Confirm icons and shortcuts in `apps.config.js` match the Utilities desktop folder grouping.",
      "Support text-to-ASCII and image-to-ASCII conversion with hidden canvas sampling."
    ],
    "acceptanceCriteria": [
      "Each utility exposes inline guidance, keyboard affordances, and copy/clear actions validated via smoke tests.",
      "Offline/demo data is bundled locally so static exports behave identically to SSR builds.",
      "Launcher metadata keeps shortcuts enabled and respects favorites/dock pinning toggles."
    ],
    "dependencies": [
      "Design token audit",
      "Dock metadata normalization",
      "Utilities folder metadata in `data/desktopFolders.js`"
    ]
  },
  {
    "appId": "clipboard-manager",
    "title": "Clipboard Manager",
    "route": "/apps/clipboard-manager",
    "component": "components/apps/ClipboardManager.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Align styles with the design token audit so utilities match the rest of the desktop shell.",
      "Backfill missing help text or tooltips so new users understand the utility at first launch.",
      "Confirm icons and shortcuts in `apps.config.js` match the Utilities desktop folder grouping."
    ],
    "acceptanceCriteria": [
      "Each utility exposes inline guidance, keyboard affordances, and copy/clear actions validated via smoke tests.",
      "Offline/demo data is bundled locally so static exports behave identically to SSR builds.",
      "Launcher metadata keeps shortcuts enabled and respects favorites/dock pinning toggles."
    ],
    "dependencies": [
      "Design token audit",
      "Dock metadata normalization",
      "Utilities folder metadata in `data/desktopFolders.js`"
    ]
  },
  {
    "appId": "figlet",
    "title": "Figlet",
    "route": "/apps/figlet",
    "component": "components/apps/figlet/index.js",
    "frame": "DesktopWindow",
    "tasks": [
      "Align styles with the design token audit so utilities match the rest of the desktop shell.",
      "Backfill missing help text or tooltips so new users understand the utility at first launch.",
      "Confirm icons and shortcuts in `apps.config.js` match the Utilities desktop folder grouping.",
      "Provide font selector, copy-to-clipboard, and IndexedDB font cache."
    ],
    "acceptanceCriteria": [
      "Each utility exposes inline guidance, keyboard affordances, and copy/clear actions validated via smoke tests.",
      "Offline/demo data is bundled locally so static exports behave identically to SSR builds.",
      "Launcher metadata keeps shortcuts enabled and respects favorites/dock pinning toggles."
    ],
    "dependencies": [
      "Design token audit",
      "Dock metadata normalization",
      "Utilities folder metadata in `data/desktopFolders.js`"
    ]
  },
  {
    "appId": "input-lab",
    "title": "Input Lab",
    "route": "/apps/input-lab",
    "component": "components/apps/input-lab/index.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Align styles with the design token audit so utilities match the rest of the desktop shell.",
      "Backfill missing help text or tooltips so new users understand the utility at first launch.",
      "Confirm icons and shortcuts in `apps.config.js` match the Utilities desktop folder grouping.",
      "Cover keyboard, mouse, and gamepad devices with calibration guidance."
    ],
    "acceptanceCriteria": [
      "Each utility exposes inline guidance, keyboard affordances, and copy/clear actions validated via smoke tests.",
      "Offline/demo data is bundled locally so static exports behave identically to SSR builds.",
      "Launcher metadata keeps shortcuts enabled and respects favorites/dock pinning toggles."
    ],
    "dependencies": [
      "Design token audit",
      "Dock metadata normalization",
      "Utilities folder metadata in `data/desktopFolders.js`"
    ]
  },
  {
    "appId": "project-gallery",
    "title": "Project Gallery",
    "route": "/apps/project-gallery",
    "component": "components/apps/project-gallery.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Align styles with the design token audit so utilities match the rest of the desktop shell.",
      "Backfill missing help text or tooltips so new users understand the utility at first launch.",
      "Confirm icons and shortcuts in `apps.config.js` match the Utilities desktop folder grouping.",
      "Load cards from `projects.json`, add filters, and surface repo/live CTA buttons."
    ],
    "acceptanceCriteria": [
      "Each utility exposes inline guidance, keyboard affordances, and copy/clear actions validated via smoke tests.",
      "Offline/demo data is bundled locally so static exports behave identically to SSR builds.",
      "Launcher metadata keeps shortcuts enabled and respects favorites/dock pinning toggles."
    ],
    "dependencies": [
      "Design token audit",
      "Dock metadata normalization",
      "Utilities folder metadata in `data/desktopFolders.js`"
    ]
  },
  {
    "appId": "qr",
    "title": "QR Tool",
    "route": "/apps/qr",
    "component": "components/apps/qr/index.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Align styles with the design token audit so utilities match the rest of the desktop shell.",
      "Backfill missing help text or tooltips so new users understand the utility at first launch.",
      "Confirm icons and shortcuts in `apps.config.js` match the Utilities desktop folder grouping.",
      "Add camera selection and downloadable QR output."
    ],
    "acceptanceCriteria": [
      "Each utility exposes inline guidance, keyboard affordances, and copy/clear actions validated via smoke tests.",
      "Offline/demo data is bundled locally so static exports behave identically to SSR builds.",
      "Launcher metadata keeps shortcuts enabled and respects favorites/dock pinning toggles."
    ],
    "dependencies": [
      "Design token audit",
      "Dock metadata normalization",
      "Utilities folder metadata in `data/desktopFolders.js`"
    ]
  },
  {
    "appId": "quote",
    "title": "Quote",
    "route": "/apps/quote",
    "component": "components/apps/quote/index.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Align styles with the design token audit so utilities match the rest of the desktop shell.",
      "Backfill missing help text or tooltips so new users understand the utility at first launch.",
      "Confirm icons and shortcuts in `apps.config.js` match the Utilities desktop folder grouping.",
      "Use offline JSON quotes with tags and a no-repeat option."
    ],
    "acceptanceCriteria": [
      "Each utility exposes inline guidance, keyboard affordances, and copy/clear actions validated via smoke tests.",
      "Offline/demo data is bundled locally so static exports behave identically to SSR builds.",
      "Launcher metadata keeps shortcuts enabled and respects favorites/dock pinning toggles."
    ],
    "dependencies": [
      "Design token audit",
      "Dock metadata normalization",
      "Utilities folder metadata in `data/desktopFolders.js`"
    ]
  },
  {
    "appId": "subnet-calculator",
    "title": "Subnet Calculator",
    "route": "/apps/subnet-calculator",
    "component": "components/apps/subnet-calculator.tsx",
    "frame": "DesktopWindow",
    "tasks": [
      "Align styles with the design token audit so utilities match the rest of the desktop shell.",
      "Backfill missing help text or tooltips so new users understand the utility at first launch.",
      "Confirm icons and shortcuts in `apps.config.js` match the Utilities desktop folder grouping.",
      "Add validation UX, preset ranges, and inline documentation for CIDR math."
    ],
    "acceptanceCriteria": [
      "Each utility exposes inline guidance, keyboard affordances, and copy/clear actions validated via smoke tests.",
      "Offline/demo data is bundled locally so static exports behave identically to SSR builds.",
      "Launcher metadata keeps shortcuts enabled and respects favorites/dock pinning toggles."
    ],
    "dependencies": [
      "Design token audit",
      "Dock metadata normalization",
      "Utilities folder metadata in `data/desktopFolders.js`"
    ]
  },
  {
    "appId": "autopsy",
    "title": "Autopsy",
    "route": "/apps/autopsy",
    "component": "components/apps/autopsy/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Curate forensic dataset previews and timeline walkthrough scripts."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  },
  {
    "appId": "beef",
    "title": "BeEF",
    "route": "/apps/beef",
    "component": "components/apps/beef/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Bundle browser exploit fixtures and quickstart scenarios that emphasise safe, read-only demos."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  },
  {
    "appId": "ble-sensor",
    "title": "BLE Sensor",
    "route": "/apps/ble-sensor",
    "component": "components/apps/ble-sensor.tsx",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Bundle BLE datasets and confirm simulator UX."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  },
  {
    "appId": "dsniff",
    "title": "dsniff",
    "route": "/apps/dsniff",
    "component": "components/apps/dsniff/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Add command builder and sample outputs."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  },
  {
    "appId": "ettercap",
    "title": "Ettercap",
    "route": "/apps/ettercap",
    "component": "components/apps/ettercap/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Add network capture fixtures and MITM walkthrough instructions."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  },
  {
    "appId": "evidence-vault",
    "title": "Evidence Vault",
    "route": "/apps/evidence-vault",
    "component": "components/apps/evidence-vault/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Clarify evidence data model, tagging, and offline storage."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  },
  {
    "appId": "ghidra",
    "title": "Ghidra",
    "route": "/apps/ghidra",
    "component": "components/apps/ghidra/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Ship reverse-engineering fixtures with guided analysis notes."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  },
  {
    "appId": "hashcat",
    "title": "Hashcat",
    "route": "/apps/hashcat",
    "component": "components/apps/hashcat/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Bundle hash samples and strategy explanations for offline mode."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  },
  {
    "appId": "hydra",
    "title": "Hydra",
    "route": "/apps/hydra",
    "component": "components/apps/hydra/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Include credential list fixtures and scoring guidance."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  },
  {
    "appId": "john",
    "title": "John the Ripper",
    "route": "/apps/john",
    "component": "components/apps/john/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Reference lab fixtures and interpretation cards from `data/john/lab-fixtures.json`."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  },
  {
    "appId": "kismet",
    "title": "Kismet",
    "route": "/apps/kismet",
    "component": "components/apps/kismet.jsx",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Expose wireless fixtures and lab mode toggle documented in `docs/kismet-fixtures.md`."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  },
  {
    "appId": "metasploit",
    "title": "Metasploit",
    "route": "/apps/metasploit",
    "component": "components/apps/metasploit/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Align console simulation with modules JSON and timeline steps."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  },
  {
    "appId": "msf-post",
    "title": "Metasploit Post",
    "route": "/apps/msf-post",
    "component": "components/apps/msf-post/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Document post-exploitation module walkthrough and sample transcripts."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  },
  {
    "appId": "mimikatz",
    "title": "Mimikatz",
    "route": "/apps/mimikatz",
    "component": "components/apps/mimikatz/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Load credential dump fixtures with interpretive cards and lab-mode gating."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  },
  {
    "appId": "mimikatz/offline",
    "title": "Mimikatz Offline",
    "route": "/apps/mimikatz/offline",
    "component": "components/apps/mimikatz/offline/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Keep offline dataset bundle in sync with lab flows and Jest coverage."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  },
  {
    "appId": "nessus",
    "title": "Nessus",
    "route": "/apps/nessus",
    "component": "components/apps/nessus/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Surface scan report fixtures with severity filtering."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  },
  {
    "appId": "nikto",
    "title": "Nikto",
    "route": "/apps/nikto",
    "component": "components/apps/nikto/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Load canned outputs and lab banner."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  },
  {
    "appId": "nmap-nse",
    "title": "Nmap NSE",
    "route": "/apps/nmap-nse",
    "component": "components/apps/nmap-nse/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Load script output fixtures and highlight safe automation flows."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  },
  {
    "appId": "openvas",
    "title": "OpenVAS",
    "route": "/apps/openvas",
    "component": "components/apps/openvas/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Bundle scan report fixtures and gating copy."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  },
  {
    "appId": "plugin-manager",
    "title": "Plugin Manager",
    "route": "/apps/plugin-manager",
    "component": "components/apps/plugin-manager/index.tsx",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Document plugin scope and dependencies before surfacing controls."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  },
  {
    "appId": "radare2",
    "title": "Radare2",
    "route": "/apps/radare2",
    "component": "components/apps/radare2.jsx",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Provide static analysis fixture library with interpretive copy."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  },
  {
    "appId": "reaver",
    "title": "Reaver",
    "route": "/apps/reaver",
    "component": "components/apps/reaver/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Provide Wi-Fi fixture library plus safety disclaimers."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  },
  {
    "appId": "recon-ng",
    "title": "Recon-ng",
    "route": "/apps/recon-ng",
    "component": "components/apps/reconng/index.tsx",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Ship recon dataset with module-by-module instructions."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  },
  {
    "appId": "security-tools",
    "title": "Security Tools",
    "route": "/apps/security-tools",
    "component": "components/apps/security-tools/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Ensure category browser lists every simulator with lab-mode gating."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  },
  {
    "appId": "volatility",
    "title": "Volatility",
    "route": "/apps/volatility",
    "component": "components/apps/volatility/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  },
  {
    "appId": "wireshark",
    "title": "Wireshark",
    "route": "/apps/wireshark",
    "component": "components/apps/wireshark/index.js",
    "frame": "SimulatedToolFrame",
    "tasks": [
      "Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.",
      "Load canned fixtures for commands/results so static export and offline demos stay deterministic.",
      "Surface \"For lab use only\" copy, safety instructions, and quickstart steps in the intro panel.",
      "Finalize simulator backlog with packet capture fixtures."
    ],
    "acceptanceCriteria": [
      "SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.",
      "Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.",
      "Lab mode toggle defaults to off and gating prevents destructive flows during demos."
    ],
    "dependencies": [
      "SimulatedToolFrame rollout from security tooling plan",
      "Fixture JSON stored under `data/` with schema tests",
      "Lab mode flag plumbing in settings service"
    ]
  },
  {
    "appId": "2048",
    "title": "2048",
    "route": "/apps/2048",
    "component": "components/apps/2048.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "asteroids",
    "title": "Asteroids",
    "route": "/apps/asteroids",
    "component": "components/apps/asteroids.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "battleship",
    "title": "Battleship",
    "route": "/apps/battleship",
    "component": "components/apps/battleship.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "blackjack",
    "title": "Blackjack",
    "route": "/apps/blackjack",
    "component": "components/apps/blackjack.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "breakout",
    "title": "Breakout",
    "route": "/apps/breakout",
    "component": "components/apps/breakout.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "candy-crush",
    "title": "Candy Crush",
    "route": "/apps/candy-crush",
    "component": "components/apps/candy-crush.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.",
      "Keep boosters and persistent stats aligned with the QA-ready baseline."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "car-racer",
    "title": "Car Racer",
    "route": "/apps/car-racer",
    "component": "components/apps/car-racer.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "checkers",
    "title": "Checkers",
    "route": "/apps/checkers",
    "component": "components/apps/checkers.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "chess",
    "title": "Chess",
    "route": "/apps/chess",
    "component": "components/apps/chess.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "connect-four",
    "title": "Connect Four",
    "route": "/apps/connect-four",
    "component": "components/apps/connect-four.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "flappy-bird",
    "title": "Flappy Bird",
    "route": "/apps/flappy-bird",
    "component": "components/apps/flappy-bird.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "frogger",
    "title": "Frogger",
    "route": "/apps/frogger",
    "component": "components/apps/frogger.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "gomoku",
    "title": "Gomoku",
    "route": "/apps/gomoku",
    "component": "components/apps/gomoku.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "hangman",
    "title": "Hangman",
    "route": "/apps/hangman",
    "component": "components/apps/hangman.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.",
      "Add word list, timer, and difficulty settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "lane-runner",
    "title": "Lane Runner",
    "route": "/apps/lane-runner",
    "component": "components/apps/lane-runner.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "memory",
    "title": "Memory",
    "route": "/apps/memory",
    "component": "components/apps/memory.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "minesweeper",
    "title": "Minesweeper",
    "route": "/apps/minesweeper",
    "component": "components/apps/minesweeper.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "nonogram",
    "title": "Nonogram",
    "route": "/apps/nonogram",
    "component": "components/apps/nonogram.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "pacman",
    "title": "Pacman",
    "route": "/apps/pacman",
    "component": "components/apps/pacman.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "pinball",
    "title": "Pinball",
    "route": "/apps/pinball",
    "component": "components/apps/pinball.tsx",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "platformer",
    "title": "Platformer",
    "route": "/apps/platformer",
    "component": "components/apps/platformer.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "pong",
    "title": "Pong",
    "route": "/apps/pong",
    "component": "components/apps/pong.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "reversi",
    "title": "Reversi",
    "route": "/apps/reversi",
    "component": "components/apps/reversi.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "simon",
    "title": "Simon",
    "route": "/apps/simon",
    "component": "components/apps/simon.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "snake",
    "title": "Snake",
    "route": "/apps/snake",
    "component": "components/apps/snake.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "sokoban",
    "title": "Sokoban",
    "route": "/apps/sokoban",
    "component": "components/apps/sokoban.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "solitaire",
    "title": "Solitaire",
    "route": "/apps/solitaire",
    "component": "components/apps/solitaire/index.tsx",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "space-invaders",
    "title": "Space Invaders",
    "route": "/apps/space-invaders",
    "component": "components/apps/space-invaders.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "sudoku",
    "title": "Sudoku",
    "route": "/apps/sudoku",
    "component": "components/apps/sudoku.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "tetris",
    "title": "Tetris",
    "route": "/apps/tetris",
    "component": "components/apps/tetris.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "tictactoe",
    "title": "Tic Tac Toe",
    "route": "/apps/tictactoe",
    "component": "components/apps/tictactoe.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "tower-defense",
    "title": "Tower Defense",
    "route": "/apps/tower-defense",
    "component": "components/apps/tower-defense.tsx",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "word-search",
    "title": "Word Search",
    "route": "/apps/word-search",
    "component": "components/apps/word-search.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.",
      "Add timer, difficulty selector, and found words list."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "wordle",
    "title": "Wordle",
    "route": "/apps/wordle",
    "component": "components/apps/wordle.js",
    "frame": "GameShell",
    "tasks": [
      "Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.",
      "Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.",
      "Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings."
    ],
    "acceptanceCriteria": [
      "GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.",
      "High scores persist between sessions (or offer fallback instructions when storage is unavailable).",
      "Window defaults prevent overflow and align to the games folder icon/dock metadata."
    ],
    "dependencies": [
      "GameShell feature parity (controls + settings) from games plan",
      "Shared game settings context",
      "Dock metadata audit for games folder"
    ]
  },
  {
    "appId": "desktop-folder-workspace",
    "title": "Workspace & Media",
    "route": "/apps/desktop-folder-workspace",
    "component": "data/desktopFolders.js",
    "frame": "DesktopFolder",
    "tasks": [
      "Confirm folder icons, titles, and item lists stay in sync with `apps.config.js` registrations.",
      "Provide onboarding copy for each folder describing what contributors should polish first.",
      "Verify folder window defaults avoid overlapping the dock/taskbar when opened."
    ],
    "acceptanceCriteria": [
      "Folder windows list all registered apps with accurate icons and open the correct route on activation.",
      "Descriptions reference the catalog polish checklist so assignees can find scoped tasks quickly.",
      "Folder metadata updates whenever new apps land or categories shift."
    ],
    "dependencies": [
      "Desktop folder renderer",
      "Catalog polish checklist upkeep",
      "Dock metadata audit"
    ]
  },
  {
    "appId": "desktop-folder-utilities",
    "title": "Utilities & Widgets",
    "route": "/apps/desktop-folder-utilities",
    "component": "data/desktopFolders.js",
    "frame": "DesktopFolder",
    "tasks": [
      "Confirm folder icons, titles, and item lists stay in sync with `apps.config.js` registrations.",
      "Provide onboarding copy for each folder describing what contributors should polish first.",
      "Verify folder window defaults avoid overlapping the dock/taskbar when opened."
    ],
    "acceptanceCriteria": [
      "Folder windows list all registered apps with accurate icons and open the correct route on activation.",
      "Descriptions reference the catalog polish checklist so assignees can find scoped tasks quickly.",
      "Folder metadata updates whenever new apps land or categories shift."
    ],
    "dependencies": [
      "Desktop folder renderer",
      "Catalog polish checklist upkeep",
      "Dock metadata audit"
    ]
  },
  {
    "appId": "desktop-folder-security",
    "title": "Security Simulations",
    "route": "/apps/desktop-folder-security",
    "component": "data/desktopFolders.js",
    "frame": "DesktopFolder",
    "tasks": [
      "Confirm folder icons, titles, and item lists stay in sync with `apps.config.js` registrations.",
      "Provide onboarding copy for each folder describing what contributors should polish first.",
      "Verify folder window defaults avoid overlapping the dock/taskbar when opened."
    ],
    "acceptanceCriteria": [
      "Folder windows list all registered apps with accurate icons and open the correct route on activation.",
      "Descriptions reference the catalog polish checklist so assignees can find scoped tasks quickly.",
      "Folder metadata updates whenever new apps land or categories shift."
    ],
    "dependencies": [
      "Desktop folder renderer",
      "Catalog polish checklist upkeep",
      "Dock metadata audit"
    ]
  },
  {
    "appId": "desktop-folder-games",
    "title": "Games Arcade",
    "route": "/apps/desktop-folder-games",
    "component": "data/desktopFolders.js",
    "frame": "DesktopFolder",
    "tasks": [
      "Confirm folder icons, titles, and item lists stay in sync with `apps.config.js` registrations.",
      "Provide onboarding copy for each folder describing what contributors should polish first.",
      "Verify folder window defaults avoid overlapping the dock/taskbar when opened."
    ],
    "acceptanceCriteria": [
      "Folder windows list all registered apps with accurate icons and open the correct route on activation.",
      "Descriptions reference the catalog polish checklist so assignees can find scoped tasks quickly.",
      "Folder metadata updates whenever new apps land or categories shift."
    ],
    "dependencies": [
      "Desktop folder renderer",
      "Catalog polish checklist upkeep",
      "Dock metadata audit"
    ]
  }
]
```
