# ADR-0005: Graph rendering strategy

- **Status:** Accepted
- **Date:** 2025-02-14
- **Deciders:** Core maintainers
- **Consulted:** UI/UX contributors
- **Tags:** visualization, performance, accessibility

## Context

Several apps (Resource Monitor, Nessus, OpenVAS, currency converter, etc.) visualise simulated metrics. Earlier iterations experimented with heavyweight charting libraries such as Chart.js, but bundler incompatibilities and large payloads forced us to remove them (see the comment in `components/simulator/index.tsx`). We need a clear strategy that balances visual fidelity, bundle size, accessibility, and maintainability across the diverse set of mini-apps.

## Decision

- Prefer **hand-crafted SVG or Canvas primitives** for charts when the design is simple (sparklines, bar charts, bubble charts). Implement them as React components co-located with the owning app.
- When abstractions are useful, share lightweight utilities (scales, axis helpers) inside `components/apps/<feature>/charts/` instead of importing a monolithic charting framework.
- Perform heavy data aggregation or parsing in Web Workers before rendering, following [ADR-0001](./0001-worker-architecture.md), so render components receive precomputed datasets.
- All charts must expose accessible labelling via ARIA roles, `aria-label`, or `<title>/<desc>` elements inside SVGs. Provide textual fallbacks for screen readers.
- Only introduce a third-party visualization library after evaluating bundle impact, tree-shaking support, and ESM compatibility. Such additions require their own ADR.
- Keep chart theming aligned with the existing Ubuntu/Kali palette defined in `styles/index.css` and `tailwind.config.js` to maintain visual cohesion.

## Consequences

- Custom charts keep the bundle small and avoid the regressions that motivated the removal of Chart.js, but they require more engineering effort per visualization.
- Accessibility remains first-class because we control the markup and semantics directly.
- The lack of an off-the-shelf library means complex chart types may need to be simplified or prototyped separately before implementation.

## Implementation Notes

- Place reusable geometry helpers under `components/apps/shared-charts/` if multiple apps need them.
- Write unit tests for data-to-visual transformations to prevent regressions when refactoring chart code.
- Use browser devtools’ performance and accessibility inspectors to validate custom implementations before merging.

## Related ADRs

- [ADR-0001](./0001-worker-architecture.md) – workers prepare datasets before rendering complex charts.
