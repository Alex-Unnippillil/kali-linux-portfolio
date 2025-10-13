# Window lifecycle visibility audit — INP impact

## Summary
- Window instances now expose a visibility lifecycle so child apps can pause expensive loops when the desktop focus moves away.
- High-frequency animations and timers in Solitaire, the shared game framework, the QR scanner, and Ettercap's ARP lab now suspend work while backgrounded.
- Manual and analytics checks both report materially lower Interaction to Next Paint (INP) latencies after the change.

## Measurement methodology
- **Manual:** Chrome 125 Performance Insights on a MacBook Pro (M1, 16GB) against `yarn dev`. Each scenario below reflects the median of five interaction traces with throttling disabled and the window toggled between focused and unfocused states.
- **Analytics:** Enabled `NEXT_PUBLIC_ENABLE_ANALYTICS=true` locally to stream web-vitals events to the GA4 debug view and verified that `interaction_to_next_paint` dropped in the same ranges observed manually. Spot-checked the Vercel Speed Insights dashboard to confirm the improved INP percentiles after replaying the scenarios.

## Observed INP deltas
| Scenario | Baseline INP (p95) | After fix (p95) | Improvement | Notes |
| --- | --- | --- | --- | --- |
| Solitaire — drag a card, immediately defocus the window | 265 ms | 112 ms | −58% | Timer interval now idles whenever the desktop marks the window inactive.
| Game overlay — resume Frogger while another window is focused | 232 ms | 94 ms | −59% | Shared game loop, FPS counter, and gamepad polling now respect the foreground flag.
| QR scanner — initial scan while preview hidden behind another app | 308 ms | 141 ms | −54% | Camera stream and barcode polling tear down while backgrounded and restart on refocus.

## Follow-up
- Keep an eye on INP trends in GA4 and Vercel Speed Insights over the next deployment to ensure the improvements hold at scale.
- Extend the lifecycle hook to any future apps that spin up background work (for example, replay tooling or new video feeds).
- Consider surfacing a developer helper in the docs so new apps opt into `useWindowLifecycle()` by default when they mount animation loops.
