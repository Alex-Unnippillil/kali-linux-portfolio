"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DownloadMetadata,
  DownloadRuleConfig,
  formatDownloadPreview,
  getRuleDefinitions,
  loadDownloadRules,
  resolveDownloadPath,
  saveDownloadRules,
} from "../../../utils/files/downloadRules";

const DEFAULT_SAMPLE: DownloadMetadata = {
  name: "threat-report.pdf",
  size: 2.5 * 1024 * 1024,
  mimeType: "application/pdf",
  sourceUrl: "https://example.com/research",
};

const PRESET_FILES: DownloadMetadata[] = [
  {
    name: "packet-capture.pcap",
    size: 48 * 1024 * 1024,
    mimeType: "application/vnd.tcpdump.pcap",
    sourceUrl: "https://downloads.kali.org/networking",
  },
  {
    name: "disk-image.iso",
    size: 700 * 1024 * 1024,
    mimeType: "application/octet-stream",
    sourceUrl: "https://mirror.example.org/images",
  },
  {
    name: "screenshots.zip",
    size: 12 * 1024 * 1024,
    mimeType: "application/zip",
    sourceUrl: "https://evidence.corp.local/case",
  },
];

const formatSizeLabel = (size: number): string => {
  if (!size) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / Math.pow(1024, index);
  const rounded = index === 0 ? Math.round(value) : value.toFixed(1);
  return `${rounded} ${units[index]}`;
};

export default function DownloadAutomationSettings() {
  const [rules, setRules] = useState<DownloadRuleConfig[]>([]);
  const [sample, setSample] = useState<DownloadMetadata>(DEFAULT_SAMPLE);
  const [sizeInput, setSizeInput] = useState<string>((DEFAULT_SAMPLE.size / (1024 * 1024)).toFixed(1));
  const definitions = useMemo(() => getRuleDefinitions(), []);

  useEffect(() => {
    const loaded = loadDownloadRules();
    setRules(loaded);
  }, []);

  const updateRules = (next: DownloadRuleConfig[]) => {
    setRules(next);
    saveDownloadRules(next);
  };

  const toggleRule = (id: string) => {
    const next = rules.map((rule) =>
      rule.id === id ? { ...rule, enabled: !rule.enabled } : rule,
    );
    updateRules(next);
  };

  const moveRule = (index: number, direction: -1 | 1) => {
    const next = [...rules];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [rule] = next.splice(index, 1);
    next.splice(target, 0, rule);
    updateRules(next);
  };

  const handleSampleName = (name: string) => {
    setSample((prev) => ({ ...prev, name }));
  };

  const handleSampleSize = (value: string) => {
    setSizeInput(value);
    const numeric = parseFloat(value);
    if (!Number.isNaN(numeric) && numeric >= 0) {
      setSample((prev) => ({ ...prev, size: numeric * 1024 * 1024 }));
    }
  };

  const handleSampleSource = (sourceUrl: string) => {
    setSample((prev) => ({ ...prev, sourceUrl }));
  };

  const samplePreview = useMemo(
    () => formatDownloadPreview(sample, rules),
    [sample, rules],
  );

  const previewSegments = useMemo(() => {
    const applied = resolveDownloadPath(sample, rules);
    return applied.segments;
  }, [sample, rules]);

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-ub-cool-grey p-6 text-white">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Download automation</h1>
        <p className="mt-2 text-sm text-ubt-grey">
          Choose how new files in Downloads are organised. Enabled rules run from top to bottom
          creating nested folders to keep investigative work tidy.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="text-lg font-semibold">Automation rules</h2>
        <p className="mb-4 text-sm text-ubt-grey">
          Drag-style controls let you prioritise rules. The earlier a rule appears, the higher up it sits in
          the folder structure.
        </p>
        <ul className="space-y-3">
          {rules.map((rule, index) => {
            const definition = definitions.find((def) => def.id === rule.id);
            if (!definition) return null;
            return (
              <li key={rule.id} className="rounded border border-gray-700 bg-black bg-opacity-40 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold">{definition.label}</h3>
                    <p className="mt-1 text-sm text-gray-300">{definition.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => toggleRule(rule.id)}
                        aria-label={`Toggle ${definition.label}`}
                      />
                      <span>{rule.enabled ? "Enabled" : "Disabled"}</span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => moveRule(index, -1)}
                        disabled={index === 0}
                        className="rounded bg-black bg-opacity-50 px-2 py-1 text-xs disabled:opacity-40"
                      >
                        Move up
                      </button>
                      <button
                        onClick={() => moveRule(index, 1)}
                        disabled={index === rules.length - 1}
                        className="rounded bg-black bg-opacity-50 px-2 py-1 text-xs disabled:opacity-40"
                      >
                        Move down
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold">Preview a download</h2>
        <p className="mb-4 text-sm text-ubt-grey">
          Adjust the sample download to see how the watcher will file it. Size is in megabytes.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-gray-300">File name</span>
            <input
              value={sample.name}
              onChange={(e) => handleSampleName(e.target.value)}
              className="rounded border border-gray-700 bg-black bg-opacity-40 px-2 py-1 text-white"
              placeholder="investigation-notes.txt"
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-gray-300">Size (MB)</span>
            <input
              value={sizeInput}
              onChange={(e) => handleSampleSize(e.target.value)}
              className="rounded border border-gray-700 bg-black bg-opacity-40 px-2 py-1 text-white"
              inputMode="decimal"
            />
          </label>
          <label className="md:col-span-2 flex flex-col text-sm">
            <span className="mb-1 text-gray-300">Source URL</span>
            <input
              value={sample.sourceUrl || ""}
              onChange={(e) => handleSampleSource(e.target.value)}
              className="rounded border border-gray-700 bg-black bg-opacity-40 px-2 py-1 text-white"
              placeholder="https://vendor.example.com/download"
            />
          </label>
        </div>
        <div className="mt-4 rounded border border-blue-900 bg-blue-900 bg-opacity-20 p-4 text-sm">
          <div className="text-xs uppercase tracking-wide text-blue-200">Resulting location</div>
          <div className="mt-2 font-mono text-base">{samplePreview}</div>
          {previewSegments.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-300">
              {previewSegments.map((segment) => (
                <span key={segment} className="rounded bg-black bg-opacity-50 px-2 py-0.5">
                  {segment}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-gray-400">No rules active — files will remain in Downloads.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Example outcomes</h2>
        <p className="mb-4 text-sm text-ubt-grey">
          The table shows how current rules organise typical findings. Tweak the order above and watch
          the path update live.
        </p>
        <div className="overflow-auto rounded border border-gray-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-black bg-opacity-40 text-xs uppercase tracking-wide text-gray-300">
              <tr>
                <th className="px-3 py-2">File</th>
                <th className="px-3 py-2">Size</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Would be filed under</th>
              </tr>
            </thead>
            <tbody>
              {PRESET_FILES.map((file) => (
                <tr key={file.name} className="odd:bg-black odd:bg-opacity-30">
                  <td className="px-3 py-2 font-mono">{file.name}</td>
                  <td className="px-3 py-2">{formatSizeLabel(file.size)}</td>
                  <td className="px-3 py-2 truncate" title={file.sourceUrl}>
                    {file.sourceUrl?.replace(/^https?:\/\//, "") || "Unknown"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {formatDownloadPreview(file, rules)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

