# Radare2 Fixture Library

The Radare2 simulator ships with curated static analysis datasets so the desktop can demonstrate disassembly, string extraction, and control-flow exploration without bundling the actual radare2 toolchain.

## Current capabilities

- **Fixture picker.** Select between multiple demo binaries, each with metadata, documentation links, and analysis notes surfaced directly in the UI.
- **Disassembly browser.** View precomputed instructions side-by-side with a hex dump and jump to any address via seek, search, or the function index.
- **String extraction.** Strings are derived from fixture hex payloads at runtime to mimic the `iz` workflow.
- **Lab-mode features.** Enabling lab mode unlocks bookmarks, local notes, and the interactive control-flow graph while keeping all edits inside browser storage.

## Bundled datasets

| ID | Title | Focus | Entry point |
| --- | --- | --- | --- |
| `hello-stub` | Hello stub (ELF64) | Stack frame scaffolding and baseline notes | `0x401000` |
| `password-check` | Password check (branch demo) | Conditional branching and string references | `0x402000` |
| `rolling-hash` | Rolling hash (loop demo) | Loop-carried state and arithmetic updates | `0x403000` |

Each fixture provides:

- Hex bytes, disassembly, cross-references, and basic blocks.
- Documentation links that open official radare2 resources for further study.
- Instructor notes that surface inside the simulator’s navigation pane.

The source JSON lives at [`apps/radare2/fixtures.json`](../apps/radare2/fixtures.json). Add new entries by supplying an `id`, descriptive metadata, and the disassembly artifacts radare2 users expect (`disasm`, `xrefs`, `blocks`).

## Lab-mode guidance

Advanced capabilities—bookmarks, note taking, and the graph view—are guarded by a lab-mode toggle in the simulator. This keeps powerful flows behind an explicit opt-in while signalling that all operations remain simulated. LocalStorage persists the choice via the `radare2:lab-enabled` flag.

## Extending the catalog

1. Append a new fixture block to the JSON file, ensuring addresses remain unique per fixture.
2. Include at least one learning note and external reference so the navigation pane stays actionable.
3. Update or add Jest coverage mirroring the new fixture to guarantee rendering continues to succeed in CI.
4. Document additions here and update the roadmap entry to reflect new scope when appropriate.
