# Ghidra Fixture Sources

The Ghidra simulator loads pre-generated data so analysts can explore the UI without importing binaries. This note documents the
fixture inputs, explains how they were produced, and lists verification checks.

## Files

All assets live under `public/demo-data/ghidra/`:

- `project.json` – primary dataset with project metadata, functions, control-flow blocks, pseudocode snippet, strings, and symbol
  table entries used by the UI.
- `disassembly.json` – minimal view of the same control-flow data, retained as a fallback.
- `strings.json` and `pseudocode.json` – extracted slices that keep legacy components functional if the consolidated project file
  is unavailable.

## Source program

Fixtures are derived from a synthetic firmware-style program compiled specifically for the lab experience. The C source mirrors
what ships in the README snippet below and avoids any external network or device interaction.

```c
#include <stdint.h>
#include <stddef.h>

static const char g_license_key[16] = "LAB-LICENSE-000";
static const uint16_t EXPECTED_DIGEST = 0x5ead;

static uint16_t checksum_buffer(const char *key, size_t len) {
    uint32_t rolling = 0x1337c0de;
    for (size_t i = 0; i < len; ++i) {
        rolling = (rolling * 33u) ^ (uint8_t)key[i];
    }
    return (uint16_t)(rolling & 0xffffu);
}

static int validate_license(const char *key) {
    if (!key) {
        return 0;
    }
    return checksum_buffer(key, 16) == EXPECTED_DIGEST;
}

static const char *load_license(void) {
    return g_license_key;
}

static void record_event(const char *message) {
    (void)message; /* Stubbed in lab mode */
}

static void configure_sink(const char *name) {
    if (name) {
        record_event(name);
    }
}

static void init_logging(void) {
    configure_sink("serial");
    configure_sink("file");
}

static void log_status(const char *message) {
    if (message) {
        record_event(message);
    }
}

int main(void) {
    init_logging();
    const char *key = load_license();
    if (!validate_license(key)) {
        log_status("License failure");
        return -1;
    }
    log_status("License accepted");
    return 0;
}
```

The binary was compiled with `clang -O1 -target x86_64-pc-windows-gnu -c lab_firmware_monitor.c` and imported into Ghidra. From
there the dataset was curated manually: addresses, block coordinates, pseudocode, and annotations were exported to JSON so that
the UI stays deterministic in demo mode.

## QA checks

- Unit tests in `__tests__/ghidra-fixtures.test.ts` validate that every function referenced in calls or strings is present and
  that the symbol table covers both code and critical data (`g_license_key`, `EXPECTED_DIGEST`).
- Hex bytes in `project.json` mirror the compiled object code. A worker formats them with base addresses so the hex pane matches
  the decompiler view.
- The lab banner text and documentation explicitly mark the dataset as read-only to keep the simulator aligned with the
  "education-only" policy.

## Updating fixtures

1. Recompile the sample program if you tweak the source, then re-run analysis in Ghidra.
2. Export updated disassembly, pseudocode, and string tables. Keep call graphs and addresses consistent with the JSON structure
   above.
3. Update `project.json` first, then adjust the derived `disassembly.json`, `strings.json`, and `pseudocode.json`.
4. Run `yarn test ghidra` (or `yarn test` for the entire suite) to ensure the coverage checks continue to pass.
5. Refresh `docs/app-ecosystem-roadmap.md` if the readiness status changes.
