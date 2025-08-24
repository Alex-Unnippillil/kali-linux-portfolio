import React, { useEffect, useMemo, useState } from 'react';
import mermaid from 'mermaid';
import {
  readFileChunks,
  parseSbomObject,
  fetchOsv,
  severityRank,
  ParsedSbom,
} from '../../lib/sbom';

const sanitize = (s: string) => s.replace(/[^A-Za-z0-9_]/g, '_');

const SbomViewer: React.FC = () => {
  const [sbom, setSbom] = useState<ParsedSbom | null>(null);
  const [licenseFilter, setLicenseFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileChunks(file);
      const data = JSON.parse(text);
      const parsed = parseSbomObject(data);
      for (const c of parsed.components) {
        await fetchOsv(c);
      }
      setSbom(parsed);
    } catch (err: any) {
      alert(err.message || 'Failed to parse SBOM file');
    }
  };

  const components = useMemo(() => {
    if (!sbom) return [];
    return sbom.components.filter((c) => {
      const licenseOk =
        !licenseFilter ||
        c.licenses.some((l) =>
          l.toLowerCase().includes(licenseFilter.toLowerCase())
        );
      const severityOk =
        !severityFilter ||
        c.vulns.some(
          (v) => severityRank(v.severity) >= severityRank(severityFilter)
        );
      return licenseOk && severityOk;
    });
  }, [sbom, licenseFilter, severityFilter]);

  const graph = useMemo(() => {
    if (!sbom) return {} as Record<string, string[]>;
    const ids = new Set(components.map((c) => c.id));
    const filtered: Record<string, string[]> = {};
    ids.forEach((id) => {
      const deps = sbom.graph[id]?.filter((d) => ids.has(d));
      if (deps && deps.length) filtered[id] = deps;
    });
    return filtered;
  }, [sbom, components]);

  const graphText = useMemo(() => {
    const lines = ['graph LR'];
    Object.entries(graph).forEach(([from, tos]) => {
      tos.forEach((to) => lines.push(`${sanitize(from)}-->${sanitize(to)}`));
    });
    return lines.join('\n');
  }, [graph]);

  useEffect(() => {
    if (!graphText || !sbom) return;
    mermaid.initialize({ startOnLoad: false });
    mermaid.contentLoaded();
  }, [graphText, sbom]);

  const exportFiltered = () => {
    const blob = new Blob(
      [JSON.stringify({ components, dependencies: graph }, null, 2)],
      { type: 'application/json' }
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'filtered-sbom.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <input
        type="file"
        accept=".json,.spdx,.cdx"
        onChange={handleFileUpload}
      />
      <div className="flex space-x-2">
        <input
          type="text"
          placeholder="Filter by license"
          value={licenseFilter}
          onChange={(e) => setLicenseFilter(e.target.value)}
          className="text-black p-1"
        />
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="text-black p-1"
        >
          <option value="">All severities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <button onClick={exportFiltered} className="bg-blue-600 px-2 py-1">
          Export
        </button>
      </div>
      <div className="overflow-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="border-b p-2">Component</th>
              <th className="border-b p-2">Licenses</th>
              <th className="border-b p-2">Vulnerabilities</th>
            </tr>
          </thead>
          <tbody>
            {components.map((c, i) => (
              <tr key={i} className="odd:bg-gray-800">
                <td className="p-2">
                  {c.name}
                  {c.version ? `@${c.version}` : ''}
                </td>
                <td className="p-2">{c.licenses.join(', ') || 'N/A'}</td>
                <td className="p-2">
                  {c.vulns.length
                    ? c.vulns
                        .map((v) =>
                          `${v.id}${v.severity ? ` (${v.severity})` : ''}`
                        )
                        .join(', ')
                    : 'None'}
                </td>
              </tr>
            ))}
            {components.length === 0 && (
              <tr>
                <td colSpan={3} className="p-2 text-center">
                  Upload an SBOM to view components
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {graphText && (
        <div className="mermaid overflow-auto bg-gray-800 p-2 rounded">
          {graphText}
        </div>
      )}
    </div>
  );
};

export default SbomViewer;
