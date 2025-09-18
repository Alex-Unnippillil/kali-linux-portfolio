# Screen recorder manual QA checklist

The recorder now supports quality presets, selectable audio sources, and on-screen highlights. Use this checklist after major
changes or before a release to validate video quality, audio capture, and interaction affordances.

## 1. Environment prep

1. Use a Chromium-based browser – Chrome or Edge – to ensure `getDisplayMedia` and the File System Access API are available.
2. Close other recording or conferencing tools that might reserve microphones.
3. Open DevTools > Performance monitor to watch CPU usage while recording.
4. Navigate to **Apps → Screen Recorder** and keep the window visible while testing.

## 2. Preset verification

For each preset (Balanced, Quality, Small File):

1. Select the preset and note the estimated size shown in the header.
2. Start a 60-second recording with screen activity (move windows, switch tabs).
3. Stop the recording and download the WebM file.
4. Inspect the file size and ensure it lands within ±15% of the estimate. Larger deltas suggest bitrate constraints were ignored.
5. Play the file in the browser to confirm smooth playback and the expected frame rate feel (Balanced ≈30 fps, Quality ≈60 fps,
   Small File ≈24 fps).

## 3. Audio input QA

1. Choose **System audio** and share a tab that plays media. Confirm the audio meter responds and the recording captures sound
   cleanly without clipping.
2. Switch to **Microphone (default)**, speak while recording, and ensure the meter reacts to voice input.
3. If multiple microphones are present, cycle through them and confirm the correct input is captured (labels update after granting
   permission).
4. Select **No audio** and verify the meter displays *Disabled* and the recording is silent.

## 4. Highlight behaviour

1. Enable **Cursor highlight** and **Click ripple**.
2. Start recording and move the pointer—observe the halo follow the cursor only while recording.
3. Click around the desktop and confirm ripple animations appear and are visible in the recorded video.
4. Disable each toggle individually and confirm the corresponding indicator chip and on-screen effect switch off immediately.

## 5. Error and recovery states

1. Trigger a cancellation by closing the browser share prompt and verify the app surfaces the *Screen capture was cancelled*
   message without entering a stuck state.
2. Start a recording and unplug or mute the microphone mid-session. Ensure the recorder continues without crashing and the meter
   drops to zero.
3. Refresh the page and confirm settings reset to defaults without stale highlight overlays remaining.

## 6. Performance spot-check

1. During a Quality preset recording, watch the Performance monitor to ensure CPU usage stays reasonable (<40% on a modern laptop).
2. Confirm the UI stays responsive—preset selector, toggles, and stop button should not lag.
3. After stopping, verify media tracks are released (camera/mic indicators disappear) and no lingering highlights remain.

Document outcomes in the release log or PR so regressions can be traced quickly.
