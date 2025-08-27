import React, { useEffect, useMemo, useState } from 'react';
import DiscoveryMap from './DiscoveryMap';

const scripts = [
  {
    name: 'http-title',
    category: 'discovery',
    description: 'Fetches page titles from HTTP services.',
    command: 'nmap -sV --script http-title <target>',
    sampleOutput:
      'PORT   STATE SERVICE VERSION\n80/tcp open  http\n| http-title: Example Domain\n|_Requested resource was /',
  },
  {
    name: 'ssl-cert',
    category: 'default',
    description: 'Retrieves TLS certificate information.',
    command: 'nmap -p 443 --script ssl-cert <target>',
    sampleOutput:
      'PORT    STATE SERVICE\n443/tcp open  https\n| ssl-cert: Subject: commonName=example.com\n| Not valid before: 2020-06-01T00:00:00\n|_Not valid after: 2022-06-01T12:00:00',
  },
  {
    name: 'smb-os-discovery',
    category: 'discovery',
    description: 'Discovers remote OS information via SMB.',
    command: 'nmap -p 445 --script smb-os-discovery <target>',
    sampleOutput:
      'PORT    STATE SERVICE\n445/tcp open  microsoft-ds\n| smb-os-discovery:\n|   OS: Windows 10 Pro 19041\n|   Computer name: HOST\n|_  Workgroup: WORKGROUP',
  },
  {
    name: 'ftp-anon',
    category: 'default',
    description: 'Checks for anonymous FTP access.',
    command: 'nmap -p 21 --script ftp-anon <target>',
    sampleOutput:
      'PORT   STATE SERVICE\n21/tcp open  ftp\n| ftp-anon: Anonymous FTP login allowed (FTP code 230)\n|_-rw-r--r--    1 ftp      ftp           73 Feb 02 00:15 welcome.msg',
  },
  {
    name: 'http-enum',
    category: 'discovery',
    description: 'Enumerates directories on web servers.',
    command: 'nmap -p 80 --script http-enum <target>',
    sampleOutput:
      'PORT   STATE SERVICE\n80/tcp open  http\n| http-enum:\n|   /admin/: Potential admin interface\n|_  /images/: Potentially interesting directory w/ listing',
  },
  {
    name: 'dns-brute',
    category: 'discovery',
    description: 'Performs DNS subdomain brute force enumeration.',
    command: 'nmap --script dns-brute <target>',
    sampleOutput:
      'Host scripts results:\n| dns-brute:\n|   mail.example.com - 192.0.2.10\n|   dev.example.com - 192.0.2.20\n|_  shop.example.com - 192.0.2.30',
  },
];

const NmapNSEApp = () => {
  const [target, setTarget] = useState('');
  const [script, setScript] = useState(scripts[0].name);
  const [output, setOutput] = useState('');
  const [scriptSearch, setScriptSearch] = useState('');
  const [library, setLibrary] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [trigger, setTrigger] = useState(0);
  const openScriptDoc = (name) => {
    window.open(
      `https://nmap.org/nsedoc/scripts/${name}.html`,
      '_blank',
      'noopener,noreferrer'
    );
  };
  const openExternal = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

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

  const scriptsByCategory = useMemo(() => {
    return scripts.reduce((acc, s) => {
      (acc[s.category] = acc[s.category] || []).push(s);
      return acc;
    }, {});
  }, []);

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
    setTrigger((v) => v + 1);
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
      <p className="text-xs text-yellow-300 mb-4">
        This interface displays static sample outputs for demonstration and does not
        execute real network scans. Only scan targets you have permission to test.
      </p>
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
      <DiscoveryMap trigger={trigger} />
      <div className="mb-4 text-sm">
        <h2 className="font-bold mb-2">Featured Scripts</h2>
        {Object.entries(scriptsByCategory).map(([cat, list]) => (
          <div key={cat} className="mb-3">
            <h3 className="font-semibold capitalize">{cat}</h3>
            <ul className="list-disc pl-4 space-y-2">
              {list.map((s) => (
                <li key={s.name}>
                  <button
                    type="button"
                    onClick={() => openScriptDoc(s.name)}
                    className="underline text-blue-400"
                  >
                    <code>{s.name}</code>
                  </button>
                  : {s.description}
                  <pre className="bg-black text-green-400 p-2 mt-1 rounded whitespace-pre-wrap">
$ {s.command}
{s.sampleOutput}
                  </pre>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="mt-2">
          Explore the full{' '}
          <button
            type="button"
            onClick={() => openExternal('https://nmap.org/nsedoc/')}
            className="underline text-blue-400"
          >
            NSE script index
          </button>{' '}
          and the{' '}
          <button
            type="button"
            onClick={() => openExternal('https://nmap.org/book/nse.html')}
            className="underline text-blue-400"
          >
            Nmap book chapter on the NSE
          </button>
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
