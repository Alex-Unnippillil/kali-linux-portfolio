import React, { useState } from 'react';
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

const LicenseClassifier: React.FC = () => {
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult>({
    detected: [],
    fuzzy: null,
    conflicts: [],
  });

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

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
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
    </div>
  );
};

export const displayLicenseClassifier = () => <LicenseClassifier />;

export default LicenseClassifier;

