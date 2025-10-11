# Nikto Lab Usage Guide

Nikto ships as a **simulation-only** tool inside the Kali Linux Portfolio. The UI provides education around command construction and report review without launching a real scan.

## Lab Mode Flag

- The banner at the top of the desktop window and app view shows "Lab mode enforced". The accompanying checkbox is locked on to emphasise that the simulator cannot be disabled.
- Lab mode appends `# simulation only` to every command preview using `utils/nikto/buildCommand.ts`, and the "Run scan" button is permanently disabled. Copy/paste the command into your own authorised lab if you want to exercise a real Nikto instance.

## Command Builder Workflow

1. **Select the target** – Start with the pre-filled host/port data from `data/nikto/sample-target.json`, or enable "Use targets file" to simulate batch scans (`-i file.txt`).
2. **Tune the scan** – Choose tuning categories, toggle plugin modules, and switch output formats. These options update the preview in real time without sending any traffic.
3. **Review lab guardrails** – The preview always includes the simulation comment, and user agent randomisation adds a `[randomized]` suffix to clarify it is synthetic.

## Working With Fixtures

- Findings and raw log lines load from `data/nikto/sample-findings.json` and `data/nikto/sample-log.json`. The same fixtures feed both `components/apps/nikto` and `apps/nikto`, guaranteeing a consistent walkthrough whether you open the floating window or navigate to `/apps/nikto`.
- Drag-and-drop parsing still accepts TXT/XML Nikto exports so you can compare your own lab runs with the canned dataset. CSV export remains available for offline study.

Always restrict real execution to environments where you have explicit permission. The simulator is designed to teach Nikto ergonomics without touching external hosts.
