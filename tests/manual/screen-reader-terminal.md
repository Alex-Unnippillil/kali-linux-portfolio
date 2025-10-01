# Screen reader announcement QA

These steps verify the new terminal output batching experience.

1. Launch the portfolio locally with `yarn dev` and open `/apps/serial-terminal`.
2. Locate the "Enable screen reader announcements" checkbox under the terminal header.
3. Toggle the checkbox on and press <kbd>Tab</kbd> until the terminal body gains focus. A polite live region should announce that screen reader mode is active.
4. Trigger incoming data by connecting a demo device or using the built-in fixtures so the terminal receives multiple characters. Listen for a single grouped announcement instead of character-by-character output.
5. Toggle the checkbox off and ensure no further announcements are read even as new data arrives.
6. Refresh the page and confirm the checkbox state persists.
7. Toggle the "Show screen reader help" button and read the guidance with the screen reader to validate instructions can be surfaced on demand.
