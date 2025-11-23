# Todoist Simulation Overview

The Todoist-inspired productivity app ships as a fully client-side simulation that mirrors core task-management flows while remaining offline-friendly. This document summarizes the key modules so QA, docs, and future contributors can trace where each feature lives.

## Component map

| File | Responsibility |
| --- | --- |
| `components/apps/todoist.js` | React UI for the windowed app: quick-add input, task form, Kanban columns, keyboard interactions, and drag-and-drop wiring. |
| `apps/todoist/utils/taskStore.ts` | Pure data helpers that model sections and tasks, enforce ordering, and serialize/deserialise localStorage state. |
| `components/apps/todoist.worker.js` | Web Worker that recalculates ordering when drag-and-drop moves a task between sections. |
| `apps/todoist/components/KanbanBoard.tsx` | Presentation component that persists column ordering in `localStorage` and provides accessible drag handles. |

## Features

- **Sections and ordering** – Sections are stored with ordered `taskIds`, ensuring a Kanban-style layout across sessions. Users can add new sections and rearrange tasks by dragging. Worker responses update the shared state so the UI re-renders smoothly.【F:components/apps/todoist.js†L176-L264】【F:components/apps/todoist.worker.js†L1-L76】
- **Task lifecycle** – Tasks capture title, due date, section, completion state, and timestamps. CRUD helpers in the store keep lists immutably updated and normalise persisted data coming back from storage.【F:apps/todoist/utils/taskStore.ts†L1-L248】
- **Persistence** – The UI hydrates from `localStorage` via `deserializeState` and writes back after every mutation, keeping the simulation functional offline.【F:components/apps/todoist.js†L93-L126】
- **Quick add** – Natural-language quick add parses dates with `chrono-node` and optional `#section` tags so users can file tasks rapidly.【F:components/apps/todoist.js†L19-L70】【F:components/apps/todoist.js†L148-L170】
- **Keyboard support** – `q` focuses the quick-add box globally, `Space` toggles completion on a focused card, and `Delete` removes the task. Drag targets stay keyboard accessible through focusable drop zones.【F:components/apps/todoist.js†L128-L172】【F:components/apps/todoist.js†L55-L86】

## Keyboard shortcuts

| Shortcut | Context | Action |
| --- | --- | --- |
| `q` | Anywhere (unless an input is focused) | Focus the quick-add textbox. |
| `Space` | Focused task card | Toggle completion. |
| `Delete` / `Backspace` | Focused task card | Delete the task. |

## Testing

Unit tests in `__tests__/todoistStore.test.ts` validate task creation, updates, deletions, cross-section moves, and ordering so data regressions surface quickly during CI.【F:__tests__/todoistStore.test.ts†L1-L71】

