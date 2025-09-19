# Todoist

## Purpose
Contains shared assets and domain logic that the Todoist experience depends on across multiple entry points. Exports the kanban components and recurrence parser used by the Todoist-style task manager.

## Entry Points
- `components/KanbanBoard.tsx` — Task board component rendered by the Todoist-style productivity app.
- `utils/recurringParser.ts` — Date parsing utility that powers recurring task scheduling.
- `apps.config.js` — registers the `todoist` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Open `http://localhost:3000` and launch the app from the desktop grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
