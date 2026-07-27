import React, { useEffect, useMemo, useState } from 'react';
import LabMode from '../../LabMode';
import { DEFAULT_CHECKLIST, MODULE_CATALOG } from './modules';

const escapeText = (text) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatSegment = (segment) =>
  segment
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const buildTree = (catalog) => {
  const root = {};
  catalog.forEach((mod) => {
    const parts = mod.path.split('/').slice(1);
    let node = root;
    parts.forEach((part, idx) => {
      if (!node[part]) node[part] = {};
      if (idx === parts.length - 1) {
        node[part].module = mod;
      } else {
        node[part].children = node[part].children || {};
        node = node[part].children;
      }
    });
  });
  return root;
};

const getChecklist = (mod) =>
  mod?.checklist?.length ? mod.checklist : DEFAULT_CHECKLIST;

const buildReportText = (mod) => {
  if (!mod?.report) return '';
  const { report } = mod;
  const lines = [
    `# ${mod.displayName || mod.path}`,
  ];

  if (report.scenario) {
    lines.push('', '## Scenario', report.scenario);
  }
  if (report.objective) {
    lines.push('', '## Objective', report.objective);
  }
  if (report.summary) {
    lines.push('', '## Summary', report.summary);
  }
  if (report.highlights?.length) {
    lines.push('', '## Key Findings');
    report.highlights.forEach((item) => lines.push(`- ${item}`));
  }
  if (report.remediation?.length) {
    lines.push('', '## Recommended Actions');
    report.remediation.forEach((item) => lines.push(`- ${item}`));
  }
  if (report.notes?.length) {
    lines.push('', '## Notes');
    report.notes.forEach((item) => lines.push(`- ${item}`));
  }
  if (report.artifacts?.length) {
    lines.push('', '## Artifacts');
    report.artifacts.forEach((artifact) => {
      const line = artifact.description
        ? `- ${artifact.name}: ${artifact.description}`
        : `- ${artifact.name}`;
      lines.push(line);
    });
  }

  return lines.join('\n').trim();
};

const Tree = ({ data, onSelect, depth = 0 }) => (
  <ul className="list-none pl-0">
    {Object.entries(data).map(([name, node]) => (
      <TreeNode
        key={name}
        name={name}
        node={node}
        onSelect={onSelect}
        depth={depth}
      />
    ))}
  </ul>
);

const TreeNode = ({ name, node, onSelect, depth }) => {
  const indent = depth * 6;
  if (node.module) {
    const label = node.module.displayName || formatSegment(name);
    return (
      <li>
        <button
          onClick={() => onSelect(node.module)}
          className="flex h-8 w-full items-center text-left text-sm hover:underline focus:outline-none"
          style={{ paddingLeft: indent }}
        >
          {label}
        </button>
      </li>
    );
  }
  return (
    <li>
      <details>
        <summary
          className="flex h-8 cursor-pointer items-center text-sm font-semibold"
          style={{ paddingLeft: indent }}
        >
          {formatSegment(name)}
        </summary>
        <Tree data={node.children} onSelect={onSelect} depth={depth + 1} />
      </details>
    </li>
  );
};

const ReportList = ({ title, items }) => {
  if (!items?.length) return null;
  return (
    <div>
      <h5 className="text-sm font-semibold text-blue-300">{title}</h5>
      <ul className="ml-5 list-disc space-y-1 text-xs text-gray-200 md:text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

const ReportArtifacts = ({ artifacts }) => {
  if (!artifacts?.length) return null;
  return (
    <div>
      <h5 className="text-sm font-semibold text-blue-300">Artifacts</h5>
      <ul className="ml-5 list-disc space-y-1 text-xs text-gray-200 md:text-sm">
        {artifacts.map((artifact) => (
          <li key={artifact.name}>
            <span className="font-semibold text-white">{artifact.name}</span>
            {artifact.description ? ` – ${artifact.description}` : null}
          </li>
        ))}
      </ul>
    </div>
  );
};

const MsfPostApp = () => {
  const [selectedModule, setSelectedModule] = useState(null);
  const [params, setParams] = useState({});
  const [toggleState, setToggleState] = useState({});
  const [output, setOutput] = useState('');
  const [steps, setSteps] = useState(
    DEFAULT_CHECKLIST.map((label) => ({ label, done: false }))
  );
  const [liveMessage, setLiveMessage] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReduceMotion(mq.matches);
    handleChange();
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const treeData = useMemo(() => buildTree(MODULE_CATALOG), []);

  const selectModule = (mod) => {
    setSelectedModule(mod);
    const initialParams = {};
    mod.options?.forEach((opt) => {
      initialParams[opt.name] = opt.value || '';
    });
    setParams(initialParams);

    const initialToggles = {};
    mod.toggles?.forEach((toggle) => {
      initialToggles[toggle.name] = Boolean(toggle.default);
    });
    setToggleState(initialToggles);

    setSteps(getChecklist(mod).map((label) => ({ label, done: false })));
    setOutput('');
    setLiveMessage('');
  };

  const handleParamChange = (name, value) => {
    setParams((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleChange = (name) => (event) => {
    const checked = event.target.checked;
    setToggleState((prev) => ({ ...prev, [name]: checked }));
  };

  const animateSteps = (labels) => {
    if (!labels.length) return;
    setSteps(labels.map((label) => ({ label, done: false })));
    const stepLabels = [...labels];
    let index = 0;

    const markNext = () => {
      setSteps((prev) =>
        prev.map((step, stepIndex) =>
          stepIndex === index ? { ...step, done: true } : step
        )
      );
      setLiveMessage(`${stepLabels[index]} completed`);
      index += 1;
      if (index < stepLabels.length) {
        if (reduceMotion) {
          setTimeout(markNext, 0);
        } else if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(markNext);
        } else {
          setTimeout(markNext, 16);
        }
      }
    };

    markNext();
  };

  const runModule = () => {
    if (!selectedModule) return;
    const transcript = selectedModule.sampleOutput?.trim();
    if (!transcript) return;
    const lines = transcript.split('\n');
    setOutput('');
    let idx = 0;

    const append = () => {
      setOutput((prev) => prev + (idx > 0 ? '\n' : '') + lines[idx]);
      idx += 1;
      if (idx < lines.length) {
        setTimeout(append, 500);
      }
    };

    append();
    animateSteps(getChecklist(selectedModule));
  };

  const commandPreview = useMemo(() => {
    if (!selectedModule) return '';
    const lines = [`use ${selectedModule.path}`];

    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        lines.push(`set ${key} ${value}`);
      }
    });

    Object.entries(toggleState).forEach(([name, enabled]) => {
      if (!enabled) return;
      const toggle = selectedModule.toggles?.find((t) => t.name === name);
      if (!toggle) return;
      lines.push(`set ${name} ${toggle.value}`);
    });

    lines.push('run');
    return lines.join('\n');
  }, [selectedModule, params, toggleState]);

  const copyCommand = async () => {
    if (!commandPreview) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(commandPreview);
      } catch {
        /* ignore clipboard errors */
      }
    }
  };

  const copyAsCode = async () => {
    if (!output) return;
    const escaped = escapeText(output);
    const codeBlock = '```\n' + escaped + '\n```';
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(codeBlock);
      } catch {
        /* ignore clipboard errors */
      }
    }
  };

  const copyReport = async () => {
    if (!selectedModule) return;
    const reportText = buildReportText(selectedModule);
    if (!reportText) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(reportText);
      } catch {
        /* ignore clipboard errors */
      }
    }
  };

  return (
    <LabMode>
      <div className="flex h-full w-full flex-col bg-gray-900 p-4 text-white">
        <header className="mb-3">
          <h2 className="text-lg font-semibold">Metasploit Post Modules</h2>
          <p className="text-xs text-gray-300">
            Build safe command snippets, review canned reports, and run transcripts entirely in lab mode.
          </p>
        </header>
        <div className="flex flex-1 overflow-hidden rounded border border-gray-800 bg-black/30">
          <div className="w-1/3 overflow-y-auto border-r border-gray-800 p-3 pr-2">
            <h3 className="mb-2 text-sm font-semibold text-gray-200">Module catalog</h3>
            <Tree data={treeData} onSelect={selectModule} />
          </div>
          <div className="flex w-2/3 flex-col overflow-hidden p-3 pl-4">
            {selectedModule ? (
              <div className="flex-1 overflow-y-auto pr-1">
                <section className="mb-4 space-y-1" aria-labelledby="module-overview-heading">
                  <h3 id="module-overview-heading" className="text-xl font-semibold">
                    {selectedModule.displayName || formatSegment(selectedModule.path.split('/').pop() || '')}
                  </h3>
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    {selectedModule.path}
                  </p>
                  <p className="text-sm text-gray-200">{selectedModule.description}</p>
                </section>

                <section className="mb-4 space-y-3 rounded border border-gray-800 bg-black/40 p-3" aria-labelledby="command-builder-heading">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h4 id="command-builder-heading" className="text-base font-semibold">
                        Command builder
                      </h4>
                      <p className="text-xs text-gray-300">
                        Adjust runtime values to stage an msfconsole snippet before executing the simulation.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={runModule}
                        className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold"
                        type="button"
                      >
                        Run simulation
                      </button>
                      <button
                        onClick={copyCommand}
                        className="rounded bg-green-600 px-3 py-1 text-xs font-semibold"
                        type="button"
                      >
                        Copy command
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {selectedModule.options?.map((opt) => (
                      <label key={opt.name} className="flex flex-col text-sm">
                        <span className="text-xs font-semibold text-gray-200">{opt.label}</span>
                        <input
                          className="mt-1 rounded border border-gray-700 bg-gray-800 p-2 text-sm text-white"
                          value={params[opt.name] || ''}
                          onChange={(e) => handleParamChange(opt.name, e.target.value)}
                          aria-label={opt.label}
                        />
                        {opt.helper ? (
                          <span className="mt-1 text-xs text-gray-400">{opt.helper}</span>
                        ) : null}
                      </label>
                    ))}
                  </div>
                  {selectedModule.toggles?.length ? (
                    <div className="space-y-2">
                      <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Module options
                      </h5>
                      {selectedModule.toggles.map((toggle) => (
                        <label
                          key={toggle.name}
                          className="flex items-start gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(toggleState[toggle.name])}
                            onChange={handleToggleChange(toggle.name)}
                            className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-900 text-green-500"
                            aria-label={toggle.label}
                          />
                          <span>
                            <span className="block font-semibold text-gray-100">{toggle.label}</span>
                            {toggle.description ? (
                              <span className="text-xs text-gray-400">{toggle.description}</span>
                            ) : null}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                  <div>
                    <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Command preview
                    </h5>
                    <pre
                      className="mt-2 max-h-48 overflow-auto rounded border border-gray-800 bg-black/60 p-3 text-xs text-green-300"
                      aria-label="command preview"
                    >
                      {commandPreview || 'Select a module to build the command sequence.'}
                    </pre>
                  </div>
                </section>

                <section className="mb-4 rounded border border-gray-800 bg-black/40 p-3" aria-labelledby="transcript-heading">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <h4 id="transcript-heading" className="text-base font-semibold">
                      Simulation transcript
                    </h4>
                    <button
                      onClick={copyAsCode}
                      className="rounded bg-green-600 px-3 py-1 text-xs font-semibold"
                      type="button"
                    >
                      Copy as code
                    </button>
                  </div>
                  <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded border border-gray-800 bg-black/70 p-3 text-xs text-gray-100">
                    {output || 'Run the simulation to generate a canned transcript.'}
                  </pre>
                </section>

                <section className="mb-4 space-y-3 rounded border border-gray-800 bg-black/40 p-3" aria-labelledby="report-heading">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h4 id="report-heading" className="text-base font-semibold">
                        Canned post-exploitation report
                      </h4>
                      <p className="text-xs text-gray-300">
                        Summaries are for tabletop exercises and help the blue team plan remediation.
                      </p>
                    </div>
                    <button
                      onClick={copyReport}
                      className="rounded bg-purple-600 px-3 py-1 text-xs font-semibold"
                      type="button"
                    >
                      Copy report summary
                    </button>
                  </div>
                  {selectedModule.report?.scenario ? (
                    <p className="text-sm text-gray-200">
                      <span className="font-semibold text-white">Scenario:</span>{' '}
                      {selectedModule.report.scenario}
                    </p>
                  ) : null}
                  {selectedModule.report?.objective ? (
                    <p className="text-sm text-gray-200">
                      <span className="font-semibold text-white">Objective:</span>{' '}
                      {selectedModule.report.objective}
                    </p>
                  ) : null}
                  {selectedModule.report?.summary ? (
                    <p className="text-sm text-gray-200">
                      <span className="font-semibold text-white">Summary:</span>{' '}
                      {selectedModule.report.summary}
                    </p>
                  ) : null}
                  <ReportList title="Key findings" items={selectedModule.report?.highlights} />
                  <ReportList title="Recommended actions" items={selectedModule.report?.remediation} />
                  <ReportList title="Notes" items={selectedModule.report?.notes} />
                  <ReportArtifacts artifacts={selectedModule.report?.artifacts} />
                </section>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center text-center text-sm text-gray-300">
                Select a module to view builder options, run a simulated transcript, and review canned reports.
              </div>
            )}
          </div>
        </div>
        <div className="sr-only" aria-live="polite" role="status">
          {liveMessage}
        </div>
        <ul
          className="mt-4 space-y-2"
          role="list"
          aria-label="Post-exploitation checklist"
        >
          {steps.map((step) => (
            <li key={step.label} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={step.done}
                readOnly
                className="h-4 w-4 rounded border border-gray-700 text-green-500"
                aria-label={step.label}
              />
              <span className={step.done ? 'text-green-400' : 'text-gray-300'}>
                {step.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </LabMode>
  );
};

export default MsfPostApp;
