import React, { useState } from 'react';
import licenseIds from 'spdx-license-ids';

interface Result {
  counts: Record<string, number>;
  unknowns: string[];
}

const LicenseClassifier: React.FC = () => {
  const [treeText, setTreeText] = useState('');
  const [result, setResult] = useState<Result>({ counts: {}, unknowns: [] });
  const [error, setError] = useState('');

  const analyze = () => {
    try {
      const tree = JSON.parse(treeText);
      const counts: Record<string, number> = {};
      const unknowns = new Set<string>();

      const processLicense = (lic: any) => {
        if (typeof lic !== 'string') return;
        const normalized = lic.trim();
        if (licenseIds.includes(normalized)) {
          counts[normalized] = (counts[normalized] || 0) + 1;
        } else if (normalized) {
          unknowns.add(normalized);
        }
      };

      const traverse = (node: any) => {
        if (!node || typeof node !== 'object') return;
        const license = node.license;
        if (license) {
          if (Array.isArray(license)) {
            license.forEach((l) =>
              typeof l === 'string'
                ? processLicense(l)
                : processLicense(l.type)
            );
          } else if (typeof license === 'object') {
            processLicense(license.type);
          } else {
            processLicense(license);
          }
        }
        if (node.dependencies && typeof node.dependencies === 'object') {
          Object.values(node.dependencies).forEach(traverse);
        }
        if (node.packages && typeof node.packages === 'object') {
          Object.values(node.packages).forEach(traverse);
        }
      };

      traverse(tree);
      setResult({ counts, unknowns: Array.from(unknowns).sort() });
      setError('');
    } catch (err) {
      setError('Invalid JSON');
      setResult({ counts: {}, unknowns: [] });
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <textarea
        className="flex-1 text-black p-2"
        placeholder="Paste package tree JSON here..."
        value={treeText}
        onChange={(e) => setTreeText(e.target.value)}
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
      {error && <div className="text-red-500">{error}</div>}
      {Object.keys(result.counts).length > 0 && (
        <div>
          <h3 className="font-bold mb-2">License Counts</h3>
          <ul className="list-disc list-inside">
            {Object.entries(result.counts).map(([lic, count]) => (
              <li key={lic}>{`${lic}: ${count}`}</li>
            ))}
          </ul>
        </div>
      )}
      {result.unknowns.length > 0 && (
        <div>
          <h3 className="font-bold mt-4 mb-2">Unknown Licenses</h3>
          <ul className="list-disc list-inside">
            {result.unknowns.map((lic) => (
              <li key={lic}>{lic}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export const displayLicenseClassifier = () => <LicenseClassifier />;

export default LicenseClassifier;

