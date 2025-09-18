# Package Manager Usability Notes

## Session Overview
- **Format:** Moderated 1:1 walkthroughs of the simulated package manager with remote participants using desktop browsers.
- **Participants:** 6 security-focused engineers (3 red team, 2 detection engineers, 1 SOC analyst) with varying familiarity with Linux desktop metaphors.
- **Scenario:** Install ten investigation-focused packages from the catalog, review the install queue, and export a report of the final state.

## What Worked Well
- **Predictable install queue:** Participants appreciated the linear queue with explicit status labels and the way completed items folded into the "Installed" section without page refreshes.
- **Sandbox warnings:** The copy explaining that installs run in a sandbox reassured testers that nothing would touch their host OS.
- **Run-after-install affordance:** Surfacing the "Run" button inline with each row made it obvious what to do next; nobody hunted for a separate launcher.
- **CSV export clarity:** Export controls were immediately discoverable, and the downloaded files opened cleanly in both Excel and LibreOffice during the sessions.

## Pain Points & Confusion
- **Progress feedback gaps:** During multi-package installs the only signal is the button text changing to "Installed." Participants wanted a lightweight spinner or percent indicator while work is in flight.
- **Error visibility:** When an install failed (simulated network drop) there was no inline messaging—only a console error. Users asked for toast-style feedback so they could retry.
- **Catalog density:** Ten-item batches required noticeable scrolling on smaller laptops. Two participants requested sticky headers or filters to keep context.
- **Telemetry opt-in clarity:** Advanced users questioned what analytics were captured, suggesting we surface a privacy toggle in settings or link to documentation.

## Recommendations
- Add transient loading indicators to install buttons and surface an inline alert on failure so users understand when to retry.
- Document telemetry (events for success, abort, timing) in the settings/privacy section and consider a client-side opt-out toggle.
- Explore compact row density or table virtualization for long catalogs so ten-item installs remain manageable on 13" displays.
- Investigate grouping installs into "Queued" and "Completed" sections to shorten scan time during long sessions.

## Follow-Up Questions for Future Studies
- Would power users prefer keyboard shortcuts (e.g., select all, install) to speed bulk operations?
- How should uninstall flows behave—per row controls or bulk actions?
- Do users want richer package details (permissions, changelog) before installing, or is the current summary enough?
- What level of telemetry disclosure satisfies compliance teams without overwhelming casual visitors?

## Session Artifacts
- Annotated recordings and heatmaps stored in the internal research drive (`Research/2024-05/package-manager-guides`).
- Raw feedback notes synced to Notion (Project → Desktop UX → Package Manager). Access limited to the product and research teams.
