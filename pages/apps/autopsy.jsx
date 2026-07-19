import Head from 'next/head';
import { useEffect, useMemo, useRef, useState } from 'react';

import caseData from '../../apps/autopsy/data/case.json';
import artifactLibrary from '../../components/apps/autopsy/data/sample-artifacts.json';

const IconDocument = ({ className = '' }) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M7 3.75A1.75 1.75 0 0 1 8.75 2h5.086c.465 0 .91.185 1.238.513l3.414 3.414c.328.328.513.773.513 1.238V20.25A1.75 1.75 0 0 1 17.25 22h-8.5A1.75 1.75 0 0 1 7 20.25z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <path
      d="M14.75 2.75V6.5a.75.75 0 0 0 .75.75h3.75"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <path
      d="M9 13h6M9 16.5h6"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

const IconImage = ({ className = '' }) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5.25 4.5h13.5A1.25 1.25 0 0 1 20 5.75v12.5A1.25 1.25 0 0 1 18.75 19.5H5.25A1.25 1.25 0 0 1 4 18.25V5.75A1.25 1.25 0 0 1 5.25 4.5Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <path
      d="M9 10.25a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z"
      fill="currentColor"
    />
    <path
      d="m4.5 16 3.947-3.947a1 1 0 0 1 1.414 0L14 16l2.639-2.639a1 1 0 0 1 1.414 0L20 15.909"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

const IconTerminal = ({ className = '' }) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M4 5.75A1.75 1.75 0 0 1 5.75 4h12.5A1.75 1.75 0 0 1 20 5.75v12.5A1.75 1.75 0 0 1 18.25 20H5.75A1.75 1.75 0 0 1 4 18.25z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <path
      d="m7.75 8.75 3 3-3 3M11.75 15.25h4.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

const IconRegistry = ({ className = '' }) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M4.75 6.75V17.5a1.5 1.5 0 0 0 1.5 1.5H12m7.25-11.5V17.5a1.5 1.5 0 0 1-1.5 1.5H12M12 4.75v14"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <path
      d="M8.25 9.25h7.5M8.25 12h7.5M8.25 14.75h7.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

const artifactIcon = (type) => {
  switch (type) {
    case 'Document':
      return <IconDocument className="h-5 w-5 text-kali-accent" />;
    case 'Image':
      return <IconImage className="h-5 w-5 text-kali-accent" />;
    case 'Registry':
      return <IconRegistry className="h-5 w-5 text-kali-accent" />;
    default:
      return <IconTerminal className="h-5 w-5 text-kali-accent" />;
  }
};

const formatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function AutopsyPage() {
  const [labMode, setLabMode] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(() => new Set());
  const [selectedResult, setSelectedResult] = useState(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const updateStatus = () => setIsOffline(!navigator.onLine);
    updateStatus();
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  useEffect(() => {
    if (!selectedResult || typeof window === 'undefined') return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setSelectedResult(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedResult]);

  useEffect(() => {
    if (selectedResult && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [selectedResult]);

  const datasetCatalog = useMemo(
    () => [
      {
        id: 'documents',
        name: 'Desktop Documents Snapshot',
        summary:
          'Office files captured before imaging. Compare author metadata, hashes, and timezone offsets.',
        tooltip:
          'Lab tip: validate timezone offsets and locale mismatches in the metadata panel.',
        evidence: artifactLibrary.filter((item) => item.type === 'Document'),
        interpretation:
          'Document artifacts retain author, revision count, and last modified timestamps. Investigators should compare the resume.docx metadata against HR records to ensure ownership and verify modification chains.',
      },
      {
        id: 'media',
        name: 'Mobile Media Collection',
        summary:
          'Geo-tagged photos synced from mobile devices. Includes EXIF coordinates and camera firmware notes.',
        tooltip:
          'Hover points on the gallery map to check for off-hours captures.',
        evidence: artifactLibrary.filter((item) => item.type === 'Image'),
        interpretation:
          'Image artifacts reveal after-hours access to the lab. Cross-reference timestamps with badge logs to validate who accessed the workstation when the photo.jpg file appeared.',
      },
      {
        id: 'system-logs',
        name: 'System Event Rollup',
        summary:
          'Consolidated Windows event logs highlighting service installs, privilege escalations, and script blocks.',
        tooltip:
          'Focus on Event ID groupings to trace the persistence chain.',
        evidence: artifactLibrary.filter((item) => item.type === 'Log'),
        interpretation:
          'System log artifacts show the moment the attacker tampered with scheduled tasks. Note the short window between the log entry and the execution of run.exe to time-bound the compromise.',
      },
      {
        id: 'executables',
        name: 'Recovered Executables',
        summary:
          'Suspicious binaries carved from unallocated space with hash lookups available for offline review.',
        tooltip:
          'Check the compiler timestamps for mismatched PE headers.',
        evidence: artifactLibrary.filter((item) => item.type === 'File'),
        interpretation:
          'Executable artifacts illustrate an unsigned dropper that injects into explorer.exe. The hash is unique to the campaign, so escalate to threat intel for correlation.',
      },
      {
        id: 'registry',
        name: 'Registry Persistence Keys',
        summary:
          'Autorun values and shim database entries extracted from the user hive.',
        tooltip:
          'Run the regParser script in lab mode to see sanitized before/after diffs.',
        evidence: artifactLibrary.filter((item) => item.type === 'Registry'),
        interpretation:
          'Registry artifacts confirm persistence via HKCU\\Software\\Example. Recommend disabling the key and confirming there are no sibling entries in HKLM.',
      },
    ],
    [],
  );

  const analysisSteps = useMemo(
    () => [
      {
        id: 'triage',
        title: 'Imaging & Triage',
        details: [
          'Validate disk acquisition hash values against chain-of-custody logs.',
          'Stage forensic workstation profile with network access disabled.',
          'Document BIOS time drift and record it in the case overview.',
        ],
        outcome:
          'Triage confirms no tampering during imaging. Analysts proceed with full timeline construction.',
      },
      {
        id: 'timeline',
        title: 'Timeline Reconstruction',
        details: [
          'Merge logon events with registry additions to chart user activity.',
          'Overlay Autopsy timeline exports with chat retention policies.',
          'Annotate anomalies directly in the incident workbook for review.',
        ],
        outcome:
          'Timeline reconstruction highlights a 90-minute intrusion window with minimal lateral movement.',
      },
      {
        id: 'reporting',
        title: 'Reporting & Handoff',
        details: [
          'Summarize the top three findings and map them to MITRE ATT&CK techniques.',
          'Export sanitized evidence packages for legal review.',
          'Schedule a tabletop session to walk stakeholders through containment steps.',
        ],
        outcome:
          'The report enables leadership to communicate the breach scope and plan remediation within SLA targets.',
      },
    ],
    [],
  );

  const artifactCount = artifactLibrary.length;
  const directoryCount = caseData?.fileTree?.children?.length ?? 0;

  const toggleStep = (id) => {
    setCompletedSteps((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <>
      <Head>
        <title>Autopsy Simulator | Kali Portfolio</title>
      </Head>
      <div className="space-y-6 p-4 text-kali-text sm:p-6">
        <section
          aria-live="polite"
          className={`flex flex-col gap-4 rounded-lg border p-4 shadow-md transition-all sm:flex-row sm:items-center sm:justify-between ${
            labMode
              ? 'border-kali-accent bg-kali-accent/15'
              : 'border-kali-border bg-kali-dark/60'
          }`}
        >
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-kali-accent">
              Lab mode {labMode ? 'enabled' : 'paused'}
            </p>
            <p className="max-w-xl text-sm text-kali-text/80">
              Work through the forensic scenario without network dependencies. Datasets, tooltips, and hints are bundled so the
              simulator stays available offline.
            </p>
            <p className="flex items-center gap-2 text-xs text-kali-text/60">
              <span
                aria-live="polite"
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium ${
                  isOffline ? 'bg-amber-600/20 text-amber-200' : 'bg-emerald-600/20 text-emerald-200'
                }`}
                role="status"
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${isOffline ? 'bg-amber-300' : 'bg-emerald-300'}`}
                />
                {isOffline ? 'Offline cache active' : 'Online fallback available'}
              </span>
              <span className="hidden sm:inline" aria-hidden="true">
                •
              </span>
              <span className="text-xs text-kali-text/70">
                {artifactCount} artifacts • {directoryCount} directories mapped
              </span>
            </p>
          </div>
          <button
            aria-pressed={labMode}
            className="inline-flex items-center justify-center rounded-md border border-kali-accent/60 bg-kali-dark px-4 py-2 text-sm font-semibold text-kali-text shadow-sm transition hover:border-kali-accent hover:bg-kali-dark/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-kali-dark"
            onClick={() => setLabMode((value) => !value)}
            type="button"
          >
            {labMode ? 'Disable lab hints' : 'Enable lab hints'}
          </button>
        </section>

        <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)_22rem]">
          <section
            aria-labelledby="case-overview-heading"
            className="space-y-4 rounded-lg border border-kali-border bg-kali-surface/90 p-4 shadow-sm"
          >
            <div className="space-y-3">
              <header className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="case-overview-heading" className="text-lg font-semibold text-kali-text">
                    Case overview
                  </h2>
                  <p className="text-sm text-kali-text/70">
                    Review the snapshot from the sealed disk image and logbook extracts.
                  </p>
                </div>
                <span className="rounded-full bg-kali-accent/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-kali-accent">
                  Case 23-081
                </span>
              </header>
              <dl className="grid gap-3 text-sm">
                <div className="rounded-md border border-kali-border/60 bg-kali-dark/40 p-3">
                  <dt className="text-xs uppercase tracking-wide text-kali-text/60">Lead examiner</dt>
                  <dd className="font-medium text-kali-text">Alex Rivera</dd>
                </div>
                <div className="rounded-md border border-kali-border/60 bg-kali-dark/40 p-3">
                  <dt className="text-xs uppercase tracking-wide text-kali-text/60">Primary objective</dt>
                  <dd className="font-medium text-kali-text">
                    Confirm whether stolen resumes were staged for exfiltration.
                  </dd>
                </div>
                <div className="rounded-md border border-kali-border/60 bg-kali-dark/40 p-3">
                  <dt className="text-xs uppercase tracking-wide text-kali-text/60">Environment notes</dt>
                  <dd className="font-medium text-kali-text">
                    Windows 11 workstation • BitLocker disabled • Local admin rights observed
                  </dd>
                </div>
              </dl>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-kali-text/70">
                Action timeline
              </h3>
              <ol className="space-y-3" aria-label="Chronological events from the case file">
                {caseData.timeline.map((entry, index) => (
                  <li
                    key={entry.timestamp}
                    className="flex items-start gap-3 rounded-md border border-kali-border/60 bg-kali-dark/40 p-3 shadow-inner"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1 h-2 w-2 rounded-full bg-kali-accent"
                    />
                    <div className="flex-1 space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-kali-text/60">
                        {formatter.format(new Date(entry.timestamp))}
                      </p>
                      <p className="text-sm text-kali-text">{entry.event}</p>
                    </div>
                    <span className="text-xs font-semibold text-kali-text/60">#{index + 1}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section
            aria-labelledby="evidence-gallery-heading"
            className="space-y-4 rounded-lg border border-kali-border bg-kali-surface/90 p-4 shadow-sm"
          >
            <header className="flex items-start justify-between gap-3">
              <div>
                <h2 id="evidence-gallery-heading" className="text-lg font-semibold text-kali-text">
                  Evidence gallery
                </h2>
                <p className="text-sm text-kali-text/70">
                  Expand datasets to explore artifacts bundled with the simulator. Tooltips surface lab-only hints.
                </p>
              </div>
              <span className="rounded-md border border-kali-border/60 bg-kali-dark/40 px-2 py-1 text-xs text-kali-text/70">
                Offline bundle
              </span>
            </header>

            <div className="space-y-4">
              {datasetCatalog.map((dataset) => {
                const tooltipId = `${dataset.id}-tooltip`;
                return (
                  <details
                    key={dataset.id}
                    className="group rounded-md border border-kali-border/60 bg-kali-dark/40 p-4 shadow-inner transition hover:border-kali-accent/60"
                  >
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-kali-dark">
                      <span className="flex flex-1 flex-col gap-2">
                        <span className="flex items-center gap-2">
                          {artifactIcon(dataset.evidence[0]?.type)}
                          <span className="font-semibold text-kali-text">{dataset.name}</span>
                        </span>
                        <span className="text-sm text-kali-text/70">{dataset.summary}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <button
                          aria-label={`Show hints for ${dataset.name}`}
                          aria-describedby={tooltipId}
                          className="relative flex h-7 w-7 items-center justify-center rounded-full border border-kali-border/50 bg-kali-dark/80 text-xs font-semibold text-kali-text/70 transition hover:border-kali-accent/70 hover:text-kali-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-kali-dark"
                          type="button"
                        >
                          <span aria-hidden="true">i</span>
                          <span
                            id={tooltipId}
                            role="tooltip"
                            className={`pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-48 -translate-x-1/2 rounded-md border border-kali-border/60 bg-kali-dark/90 p-3 text-left text-xs leading-relaxed text-kali-text/80 opacity-0 shadow-lg transition-opacity duration-200 ${
                              labMode ? 'group-open:opacity-100' : ''
                            } hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100`}
                          >
                            {labMode ? dataset.tooltip : 'Enable lab hints to view guidance.'}
                          </span>
                        </button>
                        <span className="text-xs font-semibold uppercase tracking-wide text-kali-text/60">
                          {dataset.evidence.length} items
                        </span>
                      </span>
                    </summary>
                    <div className="mt-4 space-y-3 text-sm">
                      {dataset.evidence.map((artifact) => (
                        <div
                          key={`${dataset.id}-${artifact.name}`}
                          className="rounded-md border border-kali-border/50 bg-kali-surface/60 p-3 shadow-sm"
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="text-base font-semibold text-kali-text">{artifact.name}</p>
                            <span className="text-xs uppercase tracking-wide text-kali-text/60">
                              {artifact.plugin}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-kali-text/80">{artifact.description}</p>
                          <dl className="mt-2 grid gap-2 text-xs text-kali-text/70 sm:grid-cols-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-kali-text/80">Size</span>
                              <span>{artifact.size} bytes</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-kali-text/80">Owner</span>
                              <span>{artifact.user}</span>
                            </div>
                            <div className="flex items-center gap-2 sm:col-span-2">
                              <span className="font-semibold text-kali-text/80">Captured</span>
                              <time dateTime={artifact.timestamp}>
                                {formatter.format(new Date(artifact.timestamp))}
                              </time>
                            </div>
                          </dl>
                        </div>
                      ))}
                      <div className="flex justify-end">
                        <button
                          className="inline-flex items-center gap-2 rounded-md border border-kali-accent/60 bg-kali-dark px-3 py-2 text-xs font-semibold uppercase tracking-wide text-kali-accent transition hover:bg-kali-dark/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-kali-dark"
                          onClick={() =>
                            setSelectedResult({
                              title: dataset.name,
                              summary: dataset.summary,
                              interpretation: dataset.interpretation,
                            })
                          }
                          type="button"
                        >
                          Interpret results
                        </button>
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          </section>

          <section
            aria-labelledby="analysis-steps-heading"
            className="space-y-4 rounded-lg border border-kali-border bg-kali-surface/90 p-4 shadow-sm"
          >
            <header>
              <h2 id="analysis-steps-heading" className="text-lg font-semibold text-kali-text">
                Analysis steps
              </h2>
              <p className="text-sm text-kali-text/70">
                Work through the recommended workflow. Toggle each step when complete and open the interpretation modal for
                stakeholder-ready notes.
              </p>
            </header>

            <ul className="space-y-4">
              {analysisSteps.map((step, index) => {
                const isComplete = completedSteps.has(step.id);
                return (
                  <li key={step.id} className="rounded-md border border-kali-border/60 bg-kali-dark/40 p-4 shadow-inner">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-kali-text/60">
                            Step {index + 1}
                          </p>
                          <h3 className="text-base font-semibold text-kali-text">{step.title}</h3>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                            isComplete
                              ? 'bg-emerald-600/20 text-emerald-200'
                              : 'bg-kali-border/60 text-kali-text/60'
                          }`}
                        >
                          {isComplete ? 'Completed' : 'Pending'}
                        </span>
                      </div>
                      <ul className="space-y-2 text-sm text-kali-text/80">
                        {step.details.map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 rounded-full bg-kali-accent" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex flex-wrap gap-2">
                        <button
                          aria-pressed={isComplete}
                          className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-kali-dark ${
                            isComplete
                              ? 'border-emerald-500/50 bg-emerald-600/20 text-emerald-200 hover:bg-emerald-600/30'
                              : 'border-kali-accent/60 bg-kali-dark text-kali-accent hover:bg-kali-dark/70'
                          }`}
                          onClick={() => toggleStep(step.id)}
                          type="button"
                        >
                          {isComplete ? 'Mark as pending' : 'Mark complete'}
                        </button>
                        <button
                          className="inline-flex items-center gap-2 rounded-md border border-kali-border/60 bg-kali-dark px-3 py-2 text-xs font-semibold uppercase tracking-wide text-kali-text/70 transition hover:border-kali-accent/60 hover:text-kali-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-kali-dark"
                          onClick={() =>
                            setSelectedResult({
                              title: `${step.title} summary`,
                              summary: step.details.join(' '),
                              interpretation: step.outcome,
                            })
                          }
                          type="button"
                        >
                          Review interpretation
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>

      {selectedResult ? (
        <div
          aria-labelledby="result-modal-heading"
          aria-modal="true"
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm transition"
          role="dialog"
        >
          <div className="mx-4 w-full max-w-lg rounded-lg border border-kali-border/80 bg-kali-surface/95 p-6 text-kali-text shadow-xl transition-all duration-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-kali-text/60">Result interpretation</p>
                <h3 id="result-modal-heading" className="text-lg font-semibold text-kali-text">
                  {selectedResult.title}
                </h3>
              </div>
              <button
                className="rounded-full border border-kali-border/60 bg-kali-dark/80 p-2 text-xs text-kali-text/70 transition hover:border-kali-accent/60 hover:text-kali-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-kali-dark"
                onClick={() => setSelectedResult(null)}
                ref={closeButtonRef}
                type="button"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <p className="text-kali-text/80">{selectedResult.summary}</p>
              <p className="rounded-md border border-kali-accent/50 bg-kali-accent/10 p-3 text-kali-text">
                {selectedResult.interpretation}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
