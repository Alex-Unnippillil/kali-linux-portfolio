import React, { useEffect, useState } from 'react';
import { getDb } from '../../utils/safeIDB';

interface CveRecord {
  id: string;
  summary: string;
}

interface CvePanelProps {
  script: string | null;
}

const dbPromise = getDb('nmap-nse-cves', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('cves')) {
      db.createObjectStore('cves');
    }
  },
});

const CvePanel: React.FC<CvePanelProps> = ({ script }) => {
  const [cves, setCves] = useState<CveRecord[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!script) {
      setCves(null);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const db = await dbPromise;
        const cached = await db?.get('cves', script);
        if (cached) {
          setCves(cached as CveRecord[]);
          setLoading(false);
          return;
        }
        const res = await fetch(
          `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(
            script,
          )}`,
        );
        const json = await res.json();
        const vulns = Array.isArray(json.vulnerabilities) ? json.vulnerabilities : [];
        const mapped: CveRecord[] = vulns.map((v: any) => ({
          id: v.cve.id,
          summary: v.cve.descriptions?.[0]?.value || '',
        }));
        setCves(mapped);
        await db?.put('cves', mapped, script);
      } catch {
        setCves([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [script]);

  if (!script) return <p className="text-sm">Select a script to view advisories.</p>;

  if (loading) return <p className="text-sm">Loading advisories…</p>;

  if (!cves || cves.length === 0)
    return <p className="text-sm">No advisories found.</p>;

  return (
    <div>
      <h2 className="text-lg mb-2 font-mono">Advisories</h2>
      <ul className="space-y-2 text-sm">
        {cves.map((cve) => (
          <li key={cve.id}>
            <a
              href={`https://cve.mitre.org/cgi-bin/cvename.cgi?name=${cve.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-400"
            >
              {cve.id}
            </a>
            <p className="text-xs mt-0.5">{cve.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CvePanel;

