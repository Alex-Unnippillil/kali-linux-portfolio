# TypeScript Expect Error Log

This document tracks usages of `@ts-expect-error` and the rationale behind them.

- `jest.setup.ts` – Polyfills DOM APIs missing in the Jest environment.
- `__tests__/hydraStepper.test.tsx` – Stubs `matchMedia` and `requestAnimationFrame` for JSDOM.
- `__tests__/flappyBird.test.tsx` – Provides a `ResizeObserver` mock.
- `__tests__/hydra.test.tsx` – Mocks `FileReader` and `fetch`.
- `__tests__/themePersistence.test.ts` – Mocks `matchMedia` for theme preference tests.
- `__tests__/qr_tool.test.tsx` – Mocks the `Worker` constructor.
- `__tests__/playwright/fallbacks.spec.ts` – Deletes APIs to simulate unsupported features.
- `__tests__/scrollableTimeline.test.tsx` – Mocks `IntersectionObserver`.
- `__tests__/rtl-locale.test.tsx` – Overrides `Intl.DateTimeFormat` for locale testing.
- `__tests__/saveSlots.test.ts` – Polyfills `structuredClone` in Node.
- `__tests__/openvas.test.tsx` – Mocks `Notification` and `URL.createObjectURL`.
- `__tests__/reducedMotion.test.tsx` – Mocks `matchMedia` for reduced-motion preference.
- `__tests__/metasploit.test.tsx` – Mocks `fetch` responses.
- `__tests__/autopsy.test.tsx` – Mocks `FileReader`.
- `__tests__/nmapNse.test.tsx` – Mocks `navigator.clipboard`.
- `__tests__/player.test.ts` – Mocks `AudioContext` implementations.
- `__tests__/sticky-toc.test.tsx` – Mocks `IntersectionObserver`.
- `__tests__/gameAudioNodes.test.ts` – Mocks `AudioContext` implementations.
- `__tests__/passwordGenerator.test.tsx` – Mocks `navigator.clipboard`.
