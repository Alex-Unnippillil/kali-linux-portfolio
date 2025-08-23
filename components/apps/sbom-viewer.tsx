import React, { useState } from 'react';

interface ComponentInfo {
  name: string;
  version?: string;
  licenses: string[];
  cves: string[];
}

const SbomViewer: React.FC = () => {
  const [components, setComponents] = useState<ComponentInfo[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      setComponents(parseSbom(data));
    } catch (err) {
      alert('Failed to parse SBOM file');
    }
  };

  const parseSbom = (data: any): ComponentInfo[] => {
    if (data?.bomFormat === 'CycloneDX') {
      const vulnMap: Record<string, string[]> = {};
      (data.vulnerabilities || []).forEach((v: any) => {
        (v.affects || []).forEach((aff: any) => {
          const ref = aff.ref || aff.bomRef;
          if (!ref) return;
          if (!vulnMap[ref]) vulnMap[ref] = [];
          vulnMap[ref].push(v.id);
        });
      });
      return (data.components || []).map((c: any) => ({
        name: c.name,
        version: c.version,
        licenses: (c.licenses || []).map((l: any) => l.license?.id || l.license?.name || l.expression || ''),
        cves: vulnMap[c.bomRef] || [],
      }));
    }
    if (data?.spdxVersion) {
      return (data.packages || []).map((p: any) => ({
        name: p.name,
        version: p.versionInfo,
        licenses: [p.licenseDeclared || p.licenseConcluded].filter(Boolean),
        cves: (p.externalRefs || [])
          .filter((r: any) => /CVE/i.test(r.referenceLocator || r.referenceType))
          .map((r: any) => r.referenceLocator),
      }));
    }
    return [];
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col">
      <input
        type="file"
        accept=".json,.spdx,.cdx"
        onChange={handleFileUpload}
        className="mb-4"
      />
      <div className="overflow-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="border-b p-2">Component</th>
              <th className="border-b p-2">Licenses</th>
              <th className="border-b p-2">CVE IDs</th>
            </tr>
          </thead>
          <tbody>
            {components.map((c, i) => (
              <tr key={i} className="odd:bg-gray-800">
                <td className="p-2">{c.name}{c.version ? `@${c.version}` : ''}</td>
                <td className="p-2">{c.licenses.join(', ') || 'N/A'}</td>
                <td className="p-2">{c.cves.join(', ') || 'N/A'}</td>
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
    </div>
  );
};

export default SbomViewer;
