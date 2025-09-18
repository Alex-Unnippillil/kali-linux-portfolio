# Spotify Simulator Audio QA

This checklist verifies that the desktop Spotify simulator plays a continuous mix when gapless playback and crossfade are enabled.

## Gapless crossfade (3 s)

1. Launch the Spotify app inside the portfolio (`Apps` → `Spotify`).
2. Load the default playlist or paste a short list of MP3 URLs and click **Load Playlist**.
3. Enable **Gapless** and drag the **Crossfade** slider to **3 seconds**.
4. Let the current song play until the progress bar reaches the final 10 seconds.
5. Listen for the next song to start fading in roughly three seconds before the current song ends. There should be no silence between the songs.
6. Repeat the check with headphones to confirm no audible clicks or jumps are introduced when the timer loops.

If you hear a pause or abrupt cut:

- Confirm the browser tab stayed in focus (some browsers throttle background audio).
- Re-load the page and wait for the app to preload tracks before repeating the test.
- Capture the console log and network waterfall for the QA report.
