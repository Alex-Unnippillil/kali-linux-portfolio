import React, { useEffect, useState } from 'react';
import { XMLParser } from 'fast-xml-parser';

interface PackageInfo {
  name: string;
  version: string;
  licenses: string[];
  vulns?: { id: string; summary: string }[];
}

const parseCycloneDxJson = (data: any): PackageInfo[] => {
  const comps = data.components || [];
  return comps.map((c: any) => ({
    name: c.name,
    version: c.version || '',
    licenses:
      (c.licenses || []).map((l: any) => l.license?.id || l.license?.name || l.expression).filter(Boolean),
  }));
};

const parseCycloneDxXml = (data: any): PackageInfo[] => {
  let comps = data.bom?.components?.component;
  if (!comps) return [];
  if (!Array.isArray(comps)) comps = [comps];
  return comps.map((c: any) => {
    const licNode = c.licenses?.license;
    let licenses: string[] = [];
    if (Array.isArray(licNode)) {
      licenses = licNode.map((l: any) => l.id || l.name).filter(Boolean);
    } else if (licNode) {
      licenses = [licNode.id || licNode.name].filter(Boolean);
    }
    return { name: c.name, version: c.version || '', licenses };
  });
};

const parseSpdxJson = (data: any): PackageInfo[] => {
  return (data.packages || []).map((p: any) => ({
    name: p.name,
    version: p.versionInfo || '',
    licenses: [p.licenseConcluded, p.licenseDeclared].filter(Boolean),
  }));
};

const parseSbom = (text: string): PackageInfo[] => {
  try {
    const json = JSON.parse(text);
    if (json.bomFormat === 'CycloneDX') return parseCycloneDxJson(json);
    if (json.spdxVersion) return parseSpdxJson(json);
  } catch {
    try {
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
      const obj = parser.parse(text);
      if (obj.bom) return parseCycloneDxXml(obj);
    } catch {
      return [];
    }
  }
  return [];
};

const fetchVulns = async (pkgs: PackageInfo[]) => {
  return Promise.all(
    pkgs.map(async (p) => {
      try {
        const res = await fetch('https://api.osv.dev/v1/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ package: { name: p.name, ecosystem: 'npm' }, version: p.version }),
        });
        const data = await res.json();
        p.vulns = data.vulns || [];
      } catch {
        p.vulns = [];
      }
      return p;
    })
  );
};

const SbomViewer: React.FC = () => {
  const [pkgsA, setPkgsA] = useState<PackageInfo[]>([]);
  const [pkgsB, setPkgsB] = useState<PackageInfo[]>([]);
  const [diff, setDiff] = useState<{ added: PackageInfo[]; removed: PackageInfo[] }>({ added: [], removed: [] });

  const loadFile = async (e: React.ChangeEvent<HTMLInputElement>, which: 'A' | 'B') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const pkgs = parseSbom(text);
    if (which === 'A') setPkgsA(pkgs);
    else setPkgsB(pkgs);
  };

  useEffect(() => {
    if (pkgsA.length) fetchVulns(pkgsA).then(setPkgsA);
  }, [pkgsA.length]);

  useEffect(() => {
    if (pkgsB.length) fetchVulns(pkgsB).then(setPkgsB);
  }, [pkgsB.length]);

  useEffect(() => {
    const mapA = new Map(pkgsA.map((p) => [p.name + '@' + p.version, p]));
    const mapB = new Map(pkgsB.map((p) => [p.name + '@' + p.version, p]));
    const added: PackageInfo[] = [];
    const removed: PackageInfo[] = [];
    for (const [k, v] of mapB) if (!mapA.has(k)) added.push(v);
    for (const [k, v] of mapA) if (!mapB.has(k)) removed.push(v);
    setDiff({ added, removed });
  }, [pkgsA, pkgsB]);

  return (
    <div className="p-4 text-white bg-ub-cool-grey h-full w-full overflow-auto text-xs">
      <div className="mb-4 space-y-2">
        <div>
          <label className="font-bold">SBOM A: </label>
          <input type="file" onChange={(e) => loadFile(e, 'A')} />
        </div>
        <div>
          <label className="font-bold">SBOM B: </label>
          <input type="file" onChange={(e) => loadFile(e, 'B')} />
        </div>
      </div>
      <table className="mb-4 w-full table-auto border text-xs">
        <thead>
          <tr>
            <th className="border px-1">Package</th>
            <th className="border px-1">Version</th>
            <th className="border px-1">Licenses</th>
            <th className="border px-1">Vulnerabilities</th>
          </tr>
        </thead>
        <tbody>
          {pkgsA.map((p, i) => (
            <tr key={i}>
              <td className="border px-1">{p.name}</td>
              <td className="border px-1">{p.version}</td>
              <td className="border px-1">{p.licenses.join(', ')}</td>
              <td className="border px-1">
                {p.vulns && p.vulns.length > 0
                  ? p.vulns.map((v) => v.id).join(', ')
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {(diff.added.length > 0 || diff.removed.length > 0) && (
        <div className="mb-4">
          <h3 className="font-bold mb-2">SBOM Diff</h3>
          {diff.added.length > 0 && (
            <div className="mb-2">
              <h4 className="font-semibold">Added</h4>
              <ul className="list-disc pl-4">
                {diff.added.map((p, i) => (
                  <li key={i}>{`${p.name}@${p.version}`}</li>
                ))}
              </ul>
            </div>
          )}
          {diff.removed.length > 0 && (
            <div className="mb-2">
              <h4 className="font-semibold">Removed</h4>
              <ul className="list-disc pl-4">
                {diff.removed.map((p, i) => (
                  <li key={i}>{`${p.name}@${p.version}`}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <div>
        <h3 className="font-bold mb-2">Syft GitHub Action</h3>
        <pre className="bg-black p-2 overflow-auto text-[10px]">{`- name: Generate SBOM
  uses: anchore/syft-action@v0.15.0
  with:
    source: .
    output: sbom.json`}</pre>
      </div>
    </div>
  );
};

export default SbomViewer;

