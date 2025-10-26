# Screen Recorder Transcoding Pipeline

The screen recorder app now performs a post-processing step to shrink captures before download. The workflow attempts to use the WebCodecs APIs to downscale and re-encode the capture, and transparently falls back to a classic `MediaRecorder` pass when a browser cannot provide the newer primitives.

## Pipeline overview

1. **WebCodecs track transformer** – When `VideoFrame`, `MediaStreamTrackGenerator`, and `createImageBitmap` are exposed the app streams each captured frame through a dedicated worker. The worker resizes frames on an `OffscreenCanvas`, keeping heavy pixel work off the main thread. The transformed frames are written back into a generator-driven stream which is muxed by `MediaRecorder` at a lower bitrate.
2. **MediaRecorder fallback** – Browsers without WebCodecs replay the capture into a hidden `<canvas>` element, using `MediaRecorder` with reduced bitrates to create a lighter asset.

Both paths report progress, support cancellation, and emit metadata so the UI can surface size savings.

## Browser support

- **Full WebCodecs flow** – Chromium 94+, Edge 94+, and Chrome on Android currently expose the primitives needed for the worker-based transform. Firefox (Nightly behind flags) and Safari (Technology Preview) have partial implementations but the feature will automatically fall back until the API stabilises.
- **Fallback** – Any browser that supports `MediaRecorder` and canvas capture will still provide export functionality. Older Safari builds without `MediaRecorder` are not supported and the UI will display an error when transcoding cannot be attempted.

## Limitations

- Audio passthrough uses the original capture stream; if system audio is blocked during screen capture the exported file will be silent.
- WebCodecs is gated behind powerful feature policies in some enterprise environments. Users may see the fallback path even in modern browsers if administrators disable the API.
- Because the encode pipeline replays the capture in real time, transcoding takes approximately the same duration as the original recording.
- The worker resize pipeline targets a 25% size reduction. Highly compressible content may exceed the goal, but high-motion, high-resolution captures can land slightly above the threshold. The UI surfaces the actual reduction so users can retry with shorter captures if needed.
