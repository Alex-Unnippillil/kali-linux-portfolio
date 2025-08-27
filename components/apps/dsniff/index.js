import React, { useEffect, useRef, useState } from 'react';

// Simple parser that attempts to extract protocol and host from a log line
const parseLines = (text) =>
  text
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const parts = line.trim().split(/\s+/);
      return { raw: line, protocol: parts[0] || '', host: parts[1] || '' };
    });

// Example traffic used when simulation mode is enabled
const exampleUrlsnarf = [
  { raw: 'HTTP example.com/index.html', protocol: 'HTTP', host: 'example.com' },
  { raw: 'HTTPS test.com/login', protocol: 'HTTPS', host: 'test.com' },
];

const exampleArpspoof = [
  {
    raw: 'ARP reply 192.168.0.1 is-at 00:11:22:33:44:55',
    protocol: 'ARP',
    host: '192.168.0.1',
  },
  {
    raw: 'ARP reply 192.168.0.2 is-at aa:bb:cc:dd:ee:ff',
    protocol: 'ARP',
    host: '192.168.0.2',
  },
];

const Dsniff = () => {
  const [urlsnarfLogs, setUrlsnarfLogs] = useState([]);
  const [arpspoofLogs, setArpspoofLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('urlsnarf');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState([]); // { field: 'host' | 'protocol', value: string }
  const [newField, setNewField] = useState('host');
  const [newValue, setNewValue] = useState('');
  const [simulate, setSimulate] = useState(false);
  const simInterval = useRef(null);
  const simIndex = useRef(0);
  const [sortField, setSortField] = useState('protocol');
  const [sortAsc, setSortAsc] = useState(true);

  const sortBy = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const fetchOutputs = async () => {
    try {
      const [urlsnarfRes, arpspoofRes] = await Promise.all([
        fetch('/api/dsniff/urlsnarf').then((r) => r.text()).catch(() => ''),
        fetch('/api/dsniff/arpspoof').then((r) => r.text()).catch(() => ''),
      ]);
      if (urlsnarfRes) setUrlsnarfLogs(parseLines(urlsnarfRes));
      if (arpspoofRes) setArpspoofLogs(parseLines(arpspoofRes));
    } catch (e) {
      // ignore errors
    }
  };

  useEffect(() => {
    if (!simulate) {
      fetchOutputs();
      const interval = setInterval(fetchOutputs, 5000);
      return () => clearInterval(interval);
    }
  }, [simulate]);

  useEffect(() => {
    if (simulate) {
      simIndex.current = 0;
      setUrlsnarfLogs([]);
      setArpspoofLogs([]);
      simInterval.current = setInterval(() => {
        setUrlsnarfLogs((prev) => [
          ...prev,
          exampleUrlsnarf[simIndex.current % exampleUrlsnarf.length],
        ]);
        setArpspoofLogs((prev) => [
          ...prev,
          exampleArpspoof[simIndex.current % exampleArpspoof.length],
        ]);
        simIndex.current += 1;
      }, 1000);
    } else {
      setUrlsnarfLogs([]);
      setArpspoofLogs([]);
      if (simInterval.current) clearInterval(simInterval.current);
    }
    return () => {
      if (simInterval.current) clearInterval(simInterval.current);
    };
  }, [simulate]);

  const addFilter = () => {
    if (newValue.trim()) {
      setFilters([...filters, { field: newField, value: newValue.trim() }]);
      setNewValue('');
    }
  };

  const removeFilter = (idx) => {
    setFilters(filters.filter((_, i) => i !== idx));
  };

  const logs = activeTab === 'urlsnarf' ? urlsnarfLogs : arpspoofLogs;
  const filteredLogs = logs.filter((log) => {
    const searchMatch = log.raw
      .toLowerCase()
      .includes(search.toLowerCase());
    const filterMatch = filters.every((f) =>
      log[f.field].toLowerCase().includes(f.value.toLowerCase())
    );
    return searchMatch && filterMatch;
  });

  const sortedLogs = [...filteredLogs].sort((a, b) => {
    const aVal = (a[sortField] || '').toLowerCase();
    const bVal = (b[sortField] || '').toLowerCase();
    if (aVal < bVal) return sortAsc ? -1 : 1;
    if (aVal > bVal) return sortAsc ? 1 : -1;
    return 0;
  });

  return (
    <div className="h-full w-full bg-ub-cool-grey text-white p-2 overflow-auto">
      <h1 className="text-lg mb-2">dsniff</h1>
      <div className="mb-2 flex space-x-2 items-center">
        <button
          className={`px-2 ${
            activeTab === 'urlsnarf' ? 'bg-black text-green-500' : 'bg-ub-grey'
          }`}
          onClick={() => setActiveTab('urlsnarf')}
        >
          urlsnarf
        </button>
        <button
          className={`px-2 ${
            activeTab === 'arpspoof' ? 'bg-black text-green-500' : 'bg-ub-grey'
          }`}
          onClick={() => setActiveTab('arpspoof')}
        >
          arpspoof
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
          placeholder="Search logs"
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
            <option value="host">host</option>
            <option value="protocol">protocol</option>
          </select>
          <input
            className="flex-1 text-black p-1"
            placeholder="Value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
          />
          <button
            className="bg-ub-blue text-white px-2"
            onClick={addFilter}
          >
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
      <div className="h-40 overflow-auto">
        <table className="dsniff-table w-full">
          <thead>
            <tr>
              <th onClick={() => sortBy('protocol')}>
                Protocol {sortField === 'protocol' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => sortBy('host')}>
                Host {sortField === 'host' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th>Raw</th>
            </tr>
          </thead>
          <tbody>
            {sortedLogs.length ? (
              sortedLogs.map((log, i) => (
                <tr key={i}>
                  <td>
                    <span
                      className={`status-indicator status-${log.protocol.toLowerCase()}`}
                    ></span>
                    {log.protocol}
                  </td>
                  <td>{log.host}</td>
                  <td>{log.raw}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3">No data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dsniff;

export const displayDsniff = (addFolder, openApp) => (
  <Dsniff addFolder={addFolder} openApp={openApp} />
);
