import React, { useState, useCallback, useMemo } from 'react';
import {
  getLicenseInfo,
  matchLicense,
  LicenseInfo,
  LicenseMatchResult,
  parseSpdxExpression,
  detectLicenseConflicts,
  LicenseConflict,
} from '../../lib/licenseMatcher';

interface AnalysisResult {
  detected: LicenseInfo[];
  fuzzy: LicenseMatchResult | null;
  conflicts: LicenseConflict[];
}

type FileCache = Record<string, AnalysisResult>;

const LicenseClassifier: React.FC = () => {
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult>({
    detected: [],
    fuzzy: null,
    conflicts: [],
  });
  const [files, setFiles] = useState<FileCache>({});

  const analyze = () => {
    if (!text.trim()) {
      setAnalysis({ detected: [], fuzzy: null, conflicts: [] });
      return;
    }
    const parsed = parseSpdxExpression(text);
    const detected = parsed.ids.map((id) => getLicenseInfo(id));
    const fuzzy = matchLicense(text);
    const conflicts = detectLicenseConflicts(parsed.ids, parsed.hasAnd && !parsed.hasOr);
    setAnalysis({ detected, fuzzy, conflicts });
  };

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      const cache: FileCache = { ...files };
      for (const file of Array.from(fileList)) {
        if (cache[file.name]) continue;
        const content = await file.text();
        const parsed = parseSpdxExpression(content);
        const detected = parsed.ids.map((id) => getLicenseInfo(id));
        const fuzzy = matchLicense(content);
        const conflicts = detectLicenseConflicts(
          parsed.ids,
          parsed.hasAnd && !parsed.hasOr
        );
        cache[file.name] = { detected, fuzzy, conflicts };
      }
      setFiles(cache);
    },
    [files]
  );

  const repoConflicts = useMemo(() => {
    const ids = Object.values(files).flatMap((r) =>
      r.detected.map((d) => d.spdxId)
    );
    return detectLicenseConflicts([...new Set(ids)], true);
  }, [files]);

  const exportReport = useCallback(() => {
    const payload = {
      files: Object.entries(files).map(([file, res]) => ({
        file,
        licenses: res.detected.map((d) => d.spdxId),
        conflicts: res.conflicts,
      })),
      conflicts: repoConflicts,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'license-report.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [files, repoConflicts]);

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4 overflow-auto">
      <textarea
        className="flex-1 text-black p-2"
        placeholder="Paste text to analyze..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex space-x-2">
        <button
          type="button"
          onClick={analyze}
          className="px-4 py-1 bg-blue-600 rounded"
        >
          Analyze
        </button>
      </div>

      {analysis.detected.length > 0 && (
        <div>
          <h3 className="font-bold mb-2">Detected SPDX Licenses</h3>
          <ul className="list-disc list-inside space-y-1">
            {analysis.detected.map((info) => (
              <li key={info.spdxId}>
                <a
                  href={info.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 underline"
                >
                  {info.spdxId}
                </a>{' '}
                - {info.compatibility}; {info.obligations}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.fuzzy && (
        <div>
          <h3 className="font-bold mt-4 mb-2">Fuzzy Matches</h3>
          {analysis.fuzzy.message && (
            <div className="mb-2 text-yellow-400">{analysis.fuzzy.message}</div>
          )}
          <ul className="list-disc list-inside space-y-1">
            {analysis.fuzzy.matches.map((match) => (
              <li key={match.spdxId}>
                <a
                  href={match.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 underline"
                >
                  {match.spdxId}
                </a>{' '}
                ({Math.round(match.confidence * 100)}%) - {match.compatibility}; {match.obligations}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.conflicts.length > 0 && (
        <div>
          <h3 className="font-bold mt-4 mb-2">Potential Conflicts</h3>
          <ul className="list-disc list-inside space-y-1">
            {analysis.conflicts.map((c) => (
              <li key={c.licenses.join('-')}>
                {c.message} {c.remediation}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        className="mt-4 p-4 border-2 border-dashed border-gray-500 rounded"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
      >
        <p className="mb-2">Drag & drop files or directories here</p>
        <input
          type="file"
          multiple
          webkitdirectory="true"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {Object.keys(files).length > 0 && (
        <div className="mt-4">
          <h3 className="font-bold mb-2">License Report</h3>
          <table className="w-full text-sm text-left">
            <thead>
              <tr>
                <th className="pr-2">File</th>
                <th>Licenses</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(files).map(([file, res]) => (
                <tr key={file}>
                  <td className="pr-2 align-top">{file}</td>
                  <td>{res.detected.map((d) => d.spdxId).join(', ') || 'Unknown'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {repoConflicts.length > 0 && (
            <div className="mt-4">
              <h4 className="font-bold mb-2">Repository Conflicts</h4>
              <ul className="list-disc list-inside space-y-1">
                {repoConflicts.map((c) => (
                  <li key={c.licenses.join('-')}>{c.message}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={exportReport}
            className="mt-4 px-4 py-1 bg-blue-600 rounded"
          >
            Export Report
          </button>
        </div>
      )}
    </div>
  );
};

export const displayLicenseClassifier = () => <LicenseClassifier />;

export default LicenseClassifier;

