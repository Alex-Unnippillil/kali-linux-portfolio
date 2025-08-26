import React, { useEffect, useMemo, useState } from 'react';

const scripts = [
  { name: 'http-title', description: 'Fetches page titles from HTTP services.' },
  { name: 'ssl-cert', description: 'Retrieves TLS certificate information.' },
  { name: 'smb-os-discovery', description: 'Discovers remote OS information via SMB.' },
  { name: 'ftp-anon', description: 'Checks for anonymous FTP access.' },
  { name: 'http-enum', description: 'Enumerates directories on web servers.' },
  { name: 'dns-brute', description: 'Performs DNS subdomain brute force enumeration.' },
];

const NmapNSEApp = () => {
  const [target, setTarget] = useState('');
  const [script, setScript] = useState(scripts[0].name);
  const [output, setOutput] = useState('');
  const [scriptSearch, setScriptSearch] = useState('');
  const [library, setLibrary] = useState([]);
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('nmapProfiles');
      if (stored) {
        setProfiles(JSON.parse(stored));
      }
    } catch (e) {
      // ignore
    }
    (async () => {
      try {
        const res = await fetch(
          'https://raw.githubusercontent.com/nmap/nmap/master/scripts/script.db'
        );
        const text = await res.text();
        const names = Array.from(
          text.matchAll(/filename\s*=\s*"([^"]+)"/g)
        ).map((m) => m[1].replace(/\.nse$/, ''));
        setLibrary(names.map((n) => ({ name: n, description: '' })));
      } catch (e) {
        // ignore fetch errors
      }
    })();
  }, []);

  const allScripts = useMemo(() => [...scripts, ...library], [library]);
  const filteredScripts = useMemo(
    () =>
      allScripts.filter((s) =>
        s.name.toLowerCase().includes(scriptSearch.toLowerCase())
      ),
    [allScripts, scriptSearch]
  );

  const saveProfile = () => {
    if (!target || !script) return;
    const newProfiles = [...profiles, { target, script }];
    setProfiles(newProfiles);
    localStorage.setItem('nmapProfiles', JSON.stringify(newProfiles));
  };

  const loadProfile = (idx) => {
    const profile = profiles[idx];
    if (profile) {
      setTarget(profile.target);
      setScript(profile.script);
    }
  };

  const runScan = async (t = target, s = script) => {
    if (!t) return;
    setOutput('Running scan...');
    try {
      const res = await fetch(
        `https://api.hackertarget.com/nmap/?q=${encodeURIComponent(t)}&script=${encodeURIComponent(s)}`
      );
      const text = await res.text();
      setOutput(text);
      localStorage.setItem(
        'lastNmapProfile',
        JSON.stringify({ target: t, script: s })
      );
    } catch (e) {
      setOutput('Error running scan');
    }
  };

  const quickRun = () => {
    const last = localStorage.getItem('lastNmapProfile');
    if (last) {
      const profile = JSON.parse(last);
      setTarget(profile.target);
      setScript(profile.script);
      runScan(profile.target, profile.script);
    }
  };

  return (
    <div className="h-full w-full flex flex-col p-4 bg-ub-cool-grey text-white">
      <div className="mb-4">
        <input
          className="w-full p-2 mb-2 rounded text-black"
          type="text"
          placeholder="Target host"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
        <input
          aria-label="search scripts"
          className="w-full p-2 mb-2 rounded text-black"
          type="text"
          placeholder="Search scripts"
          value={scriptSearch}
          onChange={(e) => setScriptSearch(e.target.value)}
        />
        <select
          aria-label="script select"
          className="w-full p-2 mb-2 rounded text-black"
          value={script}
          onChange={(e) => setScript(e.target.value)}
        >
          {filteredScripts.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          aria-label="profile select"
          className="w-full p-2 mb-2 rounded text-black"
          onChange={(e) => loadProfile(parseInt(e.target.value))}
        >
          <option value="">Load profile</option>
          {profiles.map((p, idx) => (
            <option key={idx} value={idx}>{`${p.target} - ${p.script}`}</option>
          ))}
        </select>
        <p className="text-sm mb-2">
          {allScripts.find((s) => s.name === script)?.description}
        </p>
        <div className="flex space-x-2">
          <button onClick={runScan} className="px-4 py-2 bg-blue-600 rounded">
            Run
          </button>
          <button
            onClick={saveProfile}
            className="px-4 py-2 bg-green-600 rounded"
          >
            Save Profile
          </button>
          <button
            onClick={quickRun}
            className="px-4 py-2 bg-purple-600 rounded"
          >
            Quick Run
          </button>
        </div>
      </div>
      <div className="mb-4 text-sm">
        <h2 className="font-bold mb-2">Featured Scripts</h2>
        <ul className="list-disc pl-4 space-y-1">
          {scripts.map((s) => (
            <li key={s.name}>
              <code>{s.name}</code>: {s.description}
            </li>
          ))}
        </ul>
        <p className="mt-2">
          Explore the full{' '}
          <a
            href="https://nmap.org/nsedoc/"
            target="_blank"
            rel="noreferrer"
            className="underline text-blue-400"
          >
            NSE script index
          </a>{' '}
          and the{' '}
          <a
            href="https://nmap.org/book/nse.html"
            target="_blank"
            rel="noreferrer"
            className="underline text-blue-400"
          >
            Nmap book chapter on the NSE
          </a>
          .
        </p>
      </div>
      <pre className="flex-grow overflow-auto bg-black text-green-400 p-2 rounded">
        {output}
      </pre>
    </div>
  );
};

export default NmapNSEApp;

export const displayNmapNSE = () => {
  return <NmapNSEApp />;
};
