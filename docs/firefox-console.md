# Firefox Developer Console Simulation

The Firefox app now includes a self-contained console playground that mirrors how analysts triage
noisy log streams. It lives at the bottom of each Kali documentation simulation page and helps
practitioners rehearse Firefox Developer Tools workflows without leaving the portfolio.

## Key capabilities

- **Multiple sources** – Streams from Browser Runtime, Network Monitor, Extension Sandbox, and
  Security Scanner so learners can see how a single URL visit produces diverse telemetry.
- **Level filters with persistence** – Toggle Info, Warning, Error, and Debug levels. Choices are
  saved to `localStorage`, making it easy to resume a prior practice session.
- **Keyword search** – Narrow results to specific techniques, URLs, or extension names.
- **Clipboard-ready output** – Copy the visible subset or a single entry to build reports and
  after-action notes.
- **High-volume practice** – Generate 50-event bursts, 10,000-entry mega streams, or enable a live
  stream to test sustained triage habits. Rendering uses `rc-virtual-list` so even five-figure event
  sets remain responsive.
- **Keyboard accessibility** – The list behaves like a focusable listbox; use arrow keys, Home/End,
  and Ctrl/Cmd+C to copy the selected entry.

## Usage tips

1. Open the Firefox app and load any Kali simulation (for example, `https://www.kali.org/docs/`).
2. Scroll to the “Practice the Firefox Developer Console” card beneath the learning resources.
3. Use the buttons to simulate common incidents:
   - “Raise security alert” seeds a defensive finding to walk through escalation steps.
   - “Log network request” mirrors request waterfalls for recon exercises.
   - “Burst 50 events” quickly populates the list for filter drills.
   - “Generate 10,000 events” demonstrates how virtualization prevents jank.
4. Adjust the filters to practice spotlighting errors while hiding noise. The filter state persists
   across reloads, matching how Firefox remembers DevTools settings.
5. Copy visible results into your note-taking workflow to rehearse report writing.

## Educational scenarios

- **Red/Blue team labs** – Instructors can stage mock incidents, then ask learners to isolate error
  events, cite impacted extensions, and copy findings for a report.
- **Performance tuning walkthroughs** – Show how warnings about latency or deprecated APIs appear in
  the console and have students document mitigation steps.
- **Secure extension development** – Demonstrate how sandbox violations and permission prompts are
  surfaced, even when 10,000 other messages are in the buffer.
- **Accessibility drills** – Encourage students to navigate entirely via keyboard to reinforce
  inclusive DevTools habits.

Because the console never reaches outside the simulation sandbox, it remains a safe teaching tool
that mirrors real-world workflows without touching production data.
