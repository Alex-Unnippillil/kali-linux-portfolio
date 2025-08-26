import React, { useEffect, useRef, useState } from 'react';

// Mock credential and ARP data used for local simulation
const exampleCredentials = [
  {
    protocol: 'HTTP',
    host: 'example.com',
    username: 'alice',
    password: 'password123',
    raw: 'HTTP example.com alice password123',
  },
  {
    protocol: 'FTP',
    host: 'files.test',
    username: 'bob',
    password: 'qwerty',
    raw: 'FTP files.test bob qwerty',
  },
];

const exampleArpTable = [
  {
    ip: '192.168.0.1',
    mac: '00:11:22:33:44:55',
    raw: '192.168.0.1 00:11:22:33:44:55',
  },
  {
    ip: '192.168.0.2',
    mac: 'aa:bb:cc:dd:ee:ff',
    raw: '192.168.0.2 aa:bb:cc:dd:ee:ff',
  },
];

const Dsniff = () => {
  const [credLogs, setCredLogs] = useState([]);
  const [arpLogs, setArpLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('credentials');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState([]); // { field: string, value: string }
  const [newField, setNewField] = useState('protocol');
  const [newValue, setNewValue] = useState('');
  const [simulate, setSimulate] = useState(false);
  const simInterval = useRef(null);
  const simIndex = useRef(0);

  // Simulation that gradually adds entries from the mock data
  useEffect(() => {
    if (simulate) {
      simIndex.current = 0;
      setCredLogs([]);
      setArpLogs([]);
      simInterval.current = setInterval(() => {
        setCredLogs((prev) => [
          ...prev,
          exampleCredentials[simIndex.current % exampleCredentials.length],
        ]);
        setArpLogs((prev) => [
          ...prev,
          exampleArpTable[simIndex.current % exampleArpTable.length],
        ]);
        simIndex.current += 1;
      }, 1000);
    } else {
      setCredLogs(exampleCredentials);
      setArpLogs(exampleArpTable);
      if (simInterval.current) clearInterval(simInterval.current);
    }
    return () => {
      if (simInterval.current) clearInterval(simInterval.current);
    };
  }, [simulate]);

  // Reset filter options when switching tabs
  useEffect(() => {
    if (activeTab === 'credentials') {
      setNewField('protocol');
    } else {
      setNewField('ip');
    }
    setFilters([]);
  }, [activeTab]);

  const addFilter = () => {
    if (newValue.trim()) {
      setFilters([...filters, { field: newField, value: newValue.trim() }]);
      setNewValue('');
    }
  };

  const removeFilter = (idx) => {
    setFilters(filters.filter((_, i) => i !== idx));
  };

  const logs = activeTab === 'credentials' ? credLogs : arpLogs;
  const filteredLogs = logs.filter((log) => {
    const searchMatch = log.raw.toLowerCase().includes(search.toLowerCase());
    const filterMatch = filters.every((f) =>
      (log[f.field] || '').toLowerCase().includes(f.value.toLowerCase())
    );
    return searchMatch && filterMatch;
  });

  const fieldOptions =
    activeTab === 'credentials'
      ? [
          { value: 'protocol', label: 'protocol' },
          { value: 'host', label: 'host' },
          { value: 'username', label: 'username' },
          { value: 'password', label: 'password' },
        ]
      : [
          { value: 'ip', label: 'ip' },
          { value: 'mac', label: 'mac' },
        ];

  return (
    <div className="h-full w-full bg-ub-cool-grey text-white p-2 overflow-auto">
      <h1 className="text-lg mb-2">dsniff</h1>
      <div className="mb-2 flex space-x-2 items-center">
        <button
          className={`px-2 ${
            activeTab === 'credentials' ? 'bg-black text-green-500' : 'bg-ub-grey'
          }`}
          onClick={() => setActiveTab('credentials')}
        >
          credentials
        </button>
        <button
          className={`px-2 ${
            activeTab === 'arp' ? 'bg-black text-green-500' : 'bg-ub-grey'
          }`}
          onClick={() => setActiveTab('arp')}
        >
          ARP table
        </button>
        <label className="ml-auto flex items-center space-x-1">
          <input
            type="checkbox"
            checked={simulate}
            onChange={() => setSimulate(!simulate)}
          />
          <span>Simulation</span>
        </label>
      </div>
      <div className="mb-2">
        <input
          className="w-full text-black p-1"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="mb-2">
        <div className="flex space-x-2 mb-2">
          <select
            value={newField}
            onChange={(e) => setNewField(e.target.value)}
            className="text-black"
          >
            {fieldOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            className="flex-1 text-black p-1"
            placeholder="Value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
          />
          <button className="bg-ub-blue text-white px-2" onClick={addFilter}>
            Add
          </button>
        </div>
        <div className="flex flex-wrap">
          {filters.map((f, i) => (
            <span
              key={i}
              className="bg-ub-grey text-white px-2 py-1 mr-1 mb-1"
            >
              {`${f.field}:${f.value}`}
              <button
                className="ml-1 text-red-400"
                onClick={() => removeFilter(i)}
              >
                x
              </button>
            </span>
          ))}
        </div>
      </div>
      <div className="bg-black text-green-500 p-2 h-40 overflow-auto">
        {filteredLogs.length ? (
          <table className="w-full text-sm">
            <thead>
              {activeTab === 'credentials' ? (
                <tr className="text-left">
                  <th className="pr-2">Protocol</th>
                  <th className="pr-2">Host</th>
                  <th className="pr-2">Username</th>
                  <th>Password</th>
                </tr>
              ) : (
                <tr className="text-left">
                  <th className="pr-2">IP</th>
                  <th>MAC</th>
                </tr>
              )}
            </thead>
            <tbody>
              {activeTab === 'credentials'
                ? filteredLogs.map((log, i) => (
                    <tr key={i} className="odd:bg-ub-grey">
                      <td className="pr-2">{log.protocol}</td>
                      <td className="pr-2">{log.host}</td>
                      <td className="pr-2">{log.username}</td>
                      <td>{log.password}</td>
                    </tr>
                  ))
                : filteredLogs.map((log, i) => (
                    <tr key={i} className="odd:bg-ub-grey">
                      <td className="pr-2">{log.ip}</td>
                      <td>{log.mac}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        ) : (
          'No data'
        )}
      </div>
      <div className="mt-4">
        <h2 className="text-lg mb-2">How to protect</h2>
        <ul className="list-disc pl-5 text-sm">
          <li>Use encrypted alternatives like HTTPS, SSH and SFTP.</li>
          <li>Employ network monitoring to detect ARP spoofing.</li>
          <li>Prefer VPNs and secure protocols to safeguard credentials.</li>
        </ul>
      </div>
    </div>
  );
};

export default Dsniff;

export const displayDsniff = (addFolder, openApp) => (
  <Dsniff addFolder={addFolder} openApp={openApp} />
);

