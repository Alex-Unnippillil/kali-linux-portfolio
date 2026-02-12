# Update Center Pilot Script

This script supports a **30-participant** study validating the new Update Center experience. The
focus is on comprehension of release channels, confidence in the staged update flow, and resilience
of the restart deferral mechanic.

## 1. Participant Profile & Logistics

- **Recruiting mix:**
  - 10 returning visitors familiar with the desktop metaphor
  - 10 security hobbyists who routinely try beta features
  - 10 first-time visitors with minimal context
- **Devices:** Desktop or laptop, Chrome or Firefox latest stable
- **Session length:** 20 minutes moderated remote call, screen sharing required
- **Pre-session survey:** Prior experience with OS update flows, comfort switching release
  channels, expectation of restart behaviour

## 2. Environment Checklist

1. Provide each participant with a disposable user profile (browser guest session or clean profile).
2. Ensure `/apps/update-center` is reachable on the staging environment seeded with pilot telemetry
   flags disabled.
3. Confirm analytics sampling is off and console logging of pilot markers is enabled.
4. Prepare fallback instructions in case the service worker cache holds stale assets.

## 3. Session Outline

### 3.1 Introduction (2 minutes)

- Welcome participant, confirm recording consent, remind them no task is graded.
- Outline objectives: explore the Update Center, compare channels, and apply an update.

### 3.2 Channel Discovery (5 minutes)

1. Ask the participant to read the Stable channel description aloud.
2. Prompt them to switch to Beta and Nightly; note how quickly they find changelog context.
3. Probe understanding: "Who would benefit from Nightly?" Capture whether messaging resonates.

**Observation goals:**
- Time-to-first switch between channels (<30 seconds target)
- Ability to restate the value prop of each channel without assistance

### 3.3 Changelog Interpretation (4 minutes)

1. Direct the participant to scan the changelog for the currently selected channel.
2. Ask them to call out one highlight that excites them and one that raises a question.
3. Gauge whether the list structure is scannable (headings vs. bullet density).

**Observation goals:**
- Highlight recall accuracy (target ≥80% recall of one bullet)
- Perceived completeness of the changelog section on a 1–5 Likert scale

### 3.4 Update & Restart Flow (7 minutes)

1. Instruct participant to click **Check for updates** and describe the status messaging.
2. Have them install the update and pause before restarting.
3. Toggle browser offline mode (moderator action) and ask the participant to press **Restart now**.
4. Once deferral appears, restore connectivity and observe if they retry restart unprompted.

**Observation goals:**
- Comprehension of the deferral message (participant explains why restart paused)
- Latency to retry restart after connection returns (<15 seconds target)
- Confidence rating for the overall flow (1–5)

### 3.5 Wrap-up & Survey (2 minutes)

- Collect open feedback on wording, perceived risk, and visual hierarchy.
- Post-session survey (embedded form):
  - Confidence applying updates via Update Center (1–5)
  - Preference ranking of channels (Stable/Beta/Nightly)
  - Perceived clarity of deferral messaging (1–5)

## 4. Success Criteria

A pilot run is considered successful when the following thresholds are met:

- ≥26/30 participants complete the flow without moderator intervention.
- ≥80% correctly articulate the difference between Stable and Beta descriptions.
- ≥75% recall one changelog highlight after the scan task.
- ≥85% understand the restart deferral message and can resume without prompt.
- Mean confidence score ≥4.0 for the update process.
- Qualitative feedback surfaces ≤3 critical blockers requiring redesign before public launch.

## 5. Data Capture & Reporting

- Use timestamped notes template capturing key quotes, hesitation moments, and status message
  comprehension.
- Record console logs tagged with `update-center-pilot` for correlation with observed events.
- Summarize findings in a debrief deck with heatmaps of successful vs. assisted steps.
