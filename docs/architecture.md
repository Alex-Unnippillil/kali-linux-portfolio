# Architecture

The project is a desktop-style portfolio built with Next.js.

## Layered module boundaries
We follow the layered module policy defined in [ADR 0001](./adr/0001-layered-architecture.md) to keep UI chrome, feature
simulations, and data adapters isolated.

### Layers at a glance
- **Presentation**: `app/`, `pages/` (excluding `pages/api/`), `components/`, and `styles/` render the desktop shell and window
  layouts.
- **Feature**: `apps/`, `games/`, `modules/`, `player/`, `plugins/`, `templates/`, `workers/`, and `pages/api/` implement the
  simulations, utilities, and background behaviour that power each window.
- **Data**: `lib/`, `data/`, and `sql/` provide service clients, validation helpers, and bundled datasets.
- **Shared**: `hooks/`, `utils/`, `types/`, and `filters/` expose reusable primitives that stay free of presentation concerns.

The dependency flow between these layers is illustrated in the [layer dependency diagram](./adr/0001-layered-architecture.md#layer-dependency-diagram).
Presentation modules may depend on feature and shared code, features may depend on data and shared code, data modules may depend
on shared helpers, and shared code must avoid importing from higher layers.

### Example compliant imports
```tsx
// components/apps/terminal.tsx — Presentation importing Feature code
import dynamic from "next/dynamic";

const TerminalApp = dynamic(() => import("@/apps/terminal/tabs"), { ssr: false });
```

```tsx
// apps/contact/index.tsx — Feature importing Data and Shared helpers
import { trackEvent } from "@/lib/analytics-client";
import { contactSchema } from "@/utils/contactSchema";
```

For setup instructions, see the [Getting Started](./getting-started.md) guide.
