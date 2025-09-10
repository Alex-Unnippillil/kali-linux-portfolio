# Type Suppression Debt

Each entry tracks a `@ts-expect-error` added to work around missing or incomplete type definitions. These should be revisited and removed once proper types are available.

| File | Reason | Owner | Planned Removal |
| --- | --- | --- | --- |
| jest.setup.ts | Web API stubs for Jest (TextEncoder, localStorage, IntersectionObserver, matchMedia, fetch, Canvas) | @kali-maintainers | 2025-01-01 |
| __tests__/autopsy.test.tsx | FileReader not defined in Node tests | @kali-maintainers | 2025-01-01 |
| __tests__/reducedMotion.test.tsx | matchMedia missing in JSDOM | @kali-maintainers | 2025-01-01 |
| __tests__/saveSlots.test.ts | structuredClone polyfill lacks types | @kali-maintainers | 2025-01-01 |
| components/apps/chrome/index.tsx | CSP attribute not typed in React | @kali-maintainers | 2025-01-01 |
| components/apps/project-gallery.tsx | OPFS APIs not in TypeScript libs | @kali-maintainers | 2025-01-01 |
| __tests__/player.test.ts | Web Audio API missing in JSDOM | @kali-maintainers | 2025-01-01 |
| __tests__/openvas.test.tsx | Notification and URL APIs missing in Node | @kali-maintainers | 2025-01-01 |
| __tests__/qr_tool.test.tsx | Worker not defined in Node tests | @kali-maintainers | 2025-01-01 |
| __tests__/playwright/fallbacks.spec.ts | OffscreenCanvas and PiP APIs not typed | @kali-maintainers | 2025-01-01 |
| __tests__/passwordGenerator.test.tsx | Clipboard API not available in tests | @kali-maintainers | 2025-01-01 |
| __tests__/rtl-locale.test.tsx | Override of Intl.DateTimeFormat | @kali-maintainers | 2025-01-01 |
| components/pwa/InstallPrompt.tsx | navigator.standalone not in Navigator types | @kali-maintainers | 2025-01-01 |
| __tests__/gameAudioNodes.test.ts | Web Audio API missing in JSDOM | @kali-maintainers | 2025-01-01 |
| hooks/useLocale.ts | Intl.Locale not yet in libs | @kali-maintainers | 2025-01-01 |
| __tests__/hydraStepper.test.tsx | matchMedia and requestAnimationFrame missing | @kali-maintainers | 2025-01-01 |
| __tests__/sticky-toc.test.tsx | IntersectionObserver missing in Node | @kali-maintainers | 2025-01-01 |
| __tests__/themePersistence.test.ts | matchMedia missing in JSDOM | @kali-maintainers | 2025-01-01 |
| __tests__/nmapNse.test.tsx | Clipboard API not available in tests | @kali-maintainers | 2025-01-01 |
| __tests__/metasploit.test.tsx | fetch not defined in Node tests | @kali-maintainers | 2025-01-01 |
| __tests__/scrollableTimeline.test.tsx | IntersectionObserver missing in Node | @kali-maintainers | 2025-01-01 |
| __tests__/flappyBird.test.tsx | ResizeObserver not in JSDOM | @kali-maintainers | 2025-01-01 |
| __tests__/hydra.test.tsx | FileReader and fetch not defined in Node tests | @kali-maintainers | 2025-01-01 |
