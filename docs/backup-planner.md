# Backup Planner App

The Backup Planner desktop app simulates snapshot orchestration inside the portfolio. Use it to rehearse how the environment would protect and restore data without touching the real filesystem.

## Preset coverage

Three presets ship with the mock:

- **Home directories** – dotfiles, SSH keys, and personal documents.
- **Settings profiles** – desktop configuration and accessibility tweaks.
- **Workspaces** – project folders, lab captures, and terraform plans.

Each preset includes sample paths, a schedule tip, and recommended cadence pulled from `utils/backupMock.ts`.

## Scheduling

Scheduling preferences (frequency, time, weekday, retention) persist to `localStorage` via `usePersistentState`. Frequency options include manual, hourly, daily, and weekly runs. When weekly is selected the UI enables weekday and time pickers; manual and hourly disable the time picker.

## Restore wizard

The restore wizard walks through four phases: select snapshot, enumerate files, verify checksums, and finalize. Enumeration and verification use the canned data in `utils/backupMock.ts`, producing log entries and an integrity status. The workspaces preset exposes an intentionally mismatched snapshot (`workspaces-2024-05-10-drift`) so regressions surface in tests.

All restore activity stays in memory—no files are touched.
