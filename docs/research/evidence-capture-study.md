# Evidence Capture QA Checklist – 10-User Trial

This checklist coordinates a 10-participant formative test of the evidence capture workflow. It focuses on verifying reliability of capture inputs, manifest exports, and downstream handling of collected data.

## 1. Pre-Session Setup
- [ ] Enable the latest build with analytics and evidence store logging in the staging environment.
- [ ] Confirm feature flags or environment variables for analytics are set (`NEXT_PUBLIC_ENABLE_ANALYTICS=true`).
- [ ] Populate the evidence store with sample data to validate export pipelines before participants arrive.
- [ ] Prepare sanitized demo files (PNG screenshot, JSON log, PDF report) so all participants start from the same baseline.
- [ ] Verify `EvidenceStore` hashing and manifest unit tests pass locally (`yarn test evidenceStore`).
- [ ] Provision secure storage (encrypted folder or access-controlled bucket) for collected manifests and exports.

## 2. Participant Onboarding
- [ ] Brief participants on the simulated nature of the tools; no real offensive actions will run.
- [ ] Obtain consent for analytics tracking and explain what event data is captured (counts only, no raw payloads).
- [ ] Issue anonymized participant IDs; avoid collecting personally identifiable information alongside captures.
- [ ] Demonstrate how to capture a note, upload a file, and export/download artifacts before starting timed tasks.

## 3. Session Tasks
For each participant, observe and note the following:
- [ ] Capture a text note summarizing findings (verify prompt flow, stored metadata, and rendered timestamp).
- [ ] Upload at least two files (binary + text) and confirm hash computation succeeds without blocking the UI.
- [ ] Tag one capture with a hierarchical tag (e.g., `case/alpha/host-1`) and ensure tag tree updates correctly.
- [ ] Export/download one captured artifact and record whether the analytics `evidence_export` event fires.
- [ ] Trigger a manifest export (if available) and inspect the downloaded JSON for:
  - Correct schema version (`1.0`).
  - Accurate `capturedAt` ISO timestamp and formatted timestamp.
  - SHA-256 hashes matching the stored files (spot-check using CLI `sha256sum`).
- [ ] Note any latency or error messaging during capture or export flows.

## 4. Data Handling During Sessions
- [ ] Store exported manifests in the prepared secure location immediately after each participant finishes.
- [ ] Do **not** retain raw uploaded files outside the sandbox; delete temporary files once hashes are verified.
- [ ] Log analytics event IDs or timestamps to cross-reference with manifest generation times.
- [ ] Document any failures (hash mismatch, timestamp drift, missing entries) with reproduction steps.

## 5. Post-Session Wrap-Up
- [ ] Aggregate analytics to confirm 10 `evidence_capture` and 10 `evidence_export` events were generated (one set per participant).
- [ ] Compare manifest totals against observed captures to ensure no data loss (counts and tag breakdowns match).
- [ ] Review secure storage and remove artifacts older than necessary, following retention policy.
- [ ] Summarize participant feedback on usability, reliability, and any confusing prompts.
- [ ] File issues for defects discovered (hash mismatches, export failures, analytics gaps) with manifest samples attached.

## 6. Hand-off Checklist
- [ ] Deliver sanitized manifests and aggregated feedback to engineering.
- [ ] Share analytics summary highlighting failure points or drop-offs.
- [ ] Archive this checklist with session notes for audit traceability.
