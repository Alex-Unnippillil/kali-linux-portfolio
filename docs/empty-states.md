# Empty state inventory

Design and content reviewed the copy below to keep the tone encouraging and action oriented. Each entry mirrors the shared `modules/emptyStates.ts` registry so feature teams can trace UI updates back to the approved language.

| App | Scenario | Primary action | Documentation |
| --- | --- | --- | --- |
| Weather | No saved locations | Add sample city | [Open Open-Meteo quickstart](https://open-meteo.com/en/docs) |
| Resource Monitor | No in-flight network requests | Run demo request | [Review Fetch API docs](https://developer.mozilla.org/docs/Web/API/Fetch_API/Using_Fetch), [Inspect performance entries](https://developer.mozilla.org/docs/Web/API/PerformanceResourceTiming) |
| Resource Monitor | No captured request history | Capture demo request | [Read logging best practices](https://web.dev/monitor-total-page-size/) |
| Quote Studio | Filters exclude all quotes | Reset filters | [Explore Quotable API docs](https://github.com/lukePeavey/quotable), [Browse Type.fit collection](https://type.fit/api/quotes) |

## Usage guidance

* Use the `EmptyState` component from `components/base` so icon, typography, and spacing stay consistent.
* Pull copy, action labels, and links from `modules/emptyStates.ts` rather than hard-coding strings inside apps.
* Keep primary actions anchored in the simulation (e.g., add sample data or reset filters) and surface documentation links as supportive next steps.
* When new apps need empty states, add them to the registry and request a design tone review before shipping.
