# Calamares Welcome & Partition Module Layout

This document captures the structure of the custom Calamares welcome step and its associated partitioning presets so designers
and translators can quickly spot regressions.

## Welcome screen (`modules/welcome.qml`)

The welcome view is a single-page `Page` layout with the following hierarchy:

1. **Header block**
   - `title`: "Welcome to the Kali Linux Installer".
   - `subtitle`: "Choose an installation preset to get started".
   - Secondary helper text clarifies that presets can be adjusted later via Advanced options.
2. **Preset picker**
   - Implemented with a `Repeater` of `RadioDelegate` cards bound to a `ButtonGroup`.
   - Each card exposes a `title`, `summary`, and `details` binding and emits a `presetSelected(presetKey)` signal.
   - Presets currently defined:
     - `guided`: Guided install (default, whole disk, swap file, optional encryption toggle).
     - `dualboot`: Shrink largest partition and install alongside an existing OS.
     - `custom`: Manual partitioning workflow entry.
3. **Advanced expanders**
   - `Expander` labelled "Advanced disk options" containing switches for encryption and LVM, plus a file system combo box.
   - `Expander` labelled "Bootloader settings" with a drop-down for target device and a checkbox for fallback installation.
4. **Footer controls**
   - Highlighted `Button` labelled "Next" and a secondary "Back" button anchored in a `RowLayout` with 44×44 px minimum touch targets.

Signals connect to the Calamares context object to keep preset choice and advanced option selections in sync with the backend
module state.

## Partition defaults (`modules/partition.conf`)

The partition configuration ships three named presets referenced by the welcome screen:

- `guided`: Single `ext4` root with an optional encrypted LUKS layer and automatically sized swap file.
- `dualboot`: Uses `shrinkFromLargest` policy to free 50 GB before creating the Kali root partition.
- `custom`: Pass-through to manual partitioning; no automated actions except verifying that a root mountpoint is defined.

Each preset advertises its mount plan and encryption defaults so the welcome UI can surface concise summaries without duplicating
logic. The Calamares `partition` module consumes the same keys to orchestrate actual disk actions when the installer progresses
past the welcome step.
