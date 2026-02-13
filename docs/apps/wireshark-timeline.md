# Wireshark Packet Timeline

The Wireshark simulator now includes a high-density packet timeline designed for multi-thousand packet captures.

## Timeline Overview

- **Rendering** – packets are plotted to a WebCanvas surface with adaptive sampling so 10k+ events render instantly.
- **Window overlay** – the active time range is represented by a blue band. Drag within the chart to brush a custom range.
- **Controls** – `Zoom In`, `Zoom Out`, and `Reset` operate on the current window without re-parsing rows.

## Interaction Model

1. Load a PCAP/PCAP-NG file or sample capture.
2. Use the brush to select a time range. Packets outside the window are skipped before virtualization, so row rendering remains O(visible).
3. Zooming preserves the window centre, clamping to capture bounds via the shared timeline store.
4. Reset returns to the full capture domain.

The viewer virtualizes rows with a fixed-height window and throttled scroll updates, keeping initial render and subsequent zooms well under two seconds on a 10k packet benchmark.

## Developer Notes

- Shared state lives in `apps/wireshark/components/timelineStore.tsx`; use `useTimelineSelector` to observe the active domain/window without forcing table re-renders.
- The table renders only the visible window slice plus overscan padding. Row counts grow sublinearly with dataset size.
- Regression tests in `__tests__/wireshark.timeline.test.tsx` cover virtualization and brush behaviour. Update them when adjusting row height or timeline semantics.
