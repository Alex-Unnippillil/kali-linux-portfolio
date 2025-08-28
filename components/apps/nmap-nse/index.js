import React, { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

const scriptSchema = z.object({
  host: z.string(),
  port: z.number(),
  id: z.string(),
  severity: z.string(),
  output: z.string(),
  cve: z.array(z.string()).optional(),
  cpe: z.array(z.string()).optional(),
});

const dataSchema = z.object({
  scripts: z.array(scriptSchema),
});

const NmapNSEApp = () => {
  const [scripts, setScripts] = useState([]);
  const [error, setError] = useState('');
  const [cveFilter, setCveFilter] = useState('');
  const [cpeFilter, setCpeFilter] = useState('');

  useEffect(() => {
    fetch('/demo/nmap-nse.json')
      .then((r) => r.json())
      .then((data) => {
        try {
          const parsed = dataSchema.parse(data);
          setScripts(parsed.scripts);
        } catch {
          setError('Invalid demo data');
        }
      })
      .catch(() => setError('Failed to load demo data'));
  }, []);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = dataSchema.parse(JSON.parse(ev.target.result));
        setScripts(parsed.scripts);
        setError('');
      } catch {
        setError('Invalid file');
      }
    };
    reader.readAsText(file);
  };

  const filtered = useMemo(
    () =>
      scripts.filter((s) => {
        const cveMatch = cveFilter
          ? s.cve?.some((cv) => cv.toLowerCase().includes(cveFilter.toLowerCase()))
          : true;
        const cpeMatch = cpeFilter
          ? s.cpe?.some((cp) => cp.toLowerCase().includes(cpeFilter.toLowerCase()))
          : true;
        return cveMatch && cpeMatch;
      }),
    [scripts, cveFilter, cpeFilter]
  );

  const grouped = useMemo(() => {
    const res = {};
    filtered.forEach((s) => {
      const sev = s.severity.toLowerCase();
      if (!res[s.host]) res[s.host] = {};
      if (!res[s.host][s.port]) res[s.host][s.port] = {};
      if (!res[s.host][s.port][sev]) res[s.host][s.port][sev] = [];
      res[s.host][s.port][sev].push(s);
    });
    return res;
  }, [filtered]);

  return (
    <div className="flex flex-col md:flex-row h-full w-full text-white">
      <div className="md:w-1/3 p-4 bg-ub-dark overflow-y-auto">
        <h1 className="text-lg mb-4">Nmap NSE Explorer</h1>
        <div className="mb-4">
          <label className="block text-sm mb-1" htmlFor="file">Load JSON</label>
          <input
            id="file"
            type="file"
            accept="application/json"
            onChange={handleFile}
            className="w-full p-2 text-black"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm mb-1" htmlFor="cve">Filter CVE</label>
          <input
            id="cve"
            value={cveFilter}
            onChange={(e) => setCveFilter(e.target.value)}
            className="w-full p-2 text-black"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm mb-1" htmlFor="cpe">Filter CPE</label>
          <input
            id="cpe"
            value={cpeFilter}
            onChange={(e) => setCpeFilter(e.target.value)}
            className="w-full p-2 text-black"
          />
        </div>
        {error && <p className="text-red-400">{error}</p>}
      </div>
      <div className="md:flex-1 p-4 bg-black overflow-y-auto">
        <h2 className="text-lg mb-2">Results</h2>
        {!Object.keys(grouped).length && <p>No data loaded.</p>}
        {Object.entries(grouped).map(([host, ports]) => (
          <div key={host} className="mb-4">
            <h3 className="font-bold">{host}</h3>
            {Object.entries(ports).map(([port, severities]) => (
              <div key={port} className="ml-4 mb-2">
                <h4 className="font-semibold">Port {port}</h4>
                {Object.entries(severities).map(([severity, items]) => (
                  <div key={severity} className="ml-4 mb-1">
                    <h5 className="capitalize">{severity}</h5>
                    <ul className="list-disc ml-4">
                      {items.map((item, idx) => (
                        <li key={idx}>
                          <span className="font-mono">{item.id}</span>
                          {item.cve?.length ? ` CVE: ${item.cve.join(', ')}` : ''}
                          {item.cpe?.length ? ` CPE: ${item.cpe.join(', ')}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NmapNSEApp;
export const displayNmapNSE = () => <NmapNSEApp />;
