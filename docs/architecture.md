# Architecture

The project is a desktop-style portfolio built with Next.js.

- **pages/** wraps applications using Next.js routing and dynamic imports.
- **components/apps/** contains the individual app implementations.
- **pages/api/** exposes serverless functions for backend features.

For setup instructions, see the [Getting Started](./getting-started.md) guide.

## Layout containment

- Tailwind utilities now expose `.contain-content`, `.contain-layout`, `.contain-layout-paint`, and `.contain-strict` for setting the CSS `contain` property on interactive shells.
- Size fallbacks are available through `.cis-card`, `.cis-card-lg`, `.cis-panel`, and `.cis-panel-lg`, which map to sensible block sizes for cards and panels.
- Apply the containment classes to window panels, dashboards, and modal bodies to isolate their layout and provide intrinsic sizing while content streams in.
- Pair `.contain-layout-paint` with the appropriate `cis-*` helper (for example, `.cis-card` on module tiles or `.cis-panel` on detail panes) to keep cumulative layout shift low as data and icons hydrate.
