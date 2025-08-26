import React, { useEffect, useState } from 'react';

const MaskedText = ({ text }) => {
  const [show, setShow] = useState(false);
  return (
    <span onClick={() => setShow((s) => !s)} className="cursor-pointer">
      {show ? text : '••••'}
    </span>
  );
};

const decodeBase64 = (str) => {
  try {
    if (typeof atob !== 'undefined') {
      return atob(str);
    }
    return Buffer.from(str, 'base64').toString('utf-8');
  } catch (e) {
    return '';
  }
};

const Dsniff = () => {
  const [data, setData] = useState([]);
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState('time');
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    const fetchOutputs = async () => {
      try {
        const [u, a] = await Promise.all([
          fetch('/api/dsniff/urlsnarf').then((r) => r.text()).catch(() => ''),
          fetch('/api/dsniff/arpspoof').then((r) => r.text()).catch(() => ''),
        ]);
        const decode = (str, type) => {
          try {
            const arr = JSON.parse(decodeBase64(str));
            return arr.map((item) => ({ ...item, type }));
          } catch (e) {
            return [];
          }
        };
        setData([...decode(u, 'urlsnarf'), ...decode(a, 'arpspoof')]);
      } catch (e) {
        // ignore errors
      }
    };
    fetchOutputs();
    const interval = setInterval(fetchOutputs, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleSort = (key) => {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const filtered = data.filter((row) =>
    Object.values(row)
      .join(' ')
      .toLowerCase()
      .includes(filter.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortKey] || '';
    const vb = b[sortKey] || '';
    if (va < vb) return sortAsc ? -1 : 1;
    if (va > vb) return sortAsc ? 1 : -1;
    return 0;
  });

  return (
    <div className="h-full w-full bg-ub-cool-grey text-white p-2 overflow-auto">
      <h1 className="text-lg mb-2">dsniff</h1>
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter..."
        className="mb-2 p-1 rounded text-black"
      />
      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-700">
            <tr>
              <th
                className="p-1 text-left cursor-pointer"
                onClick={() => toggleSort('time')}
              >
                Time
              </th>
              <th
                className="p-1 text-left cursor-pointer"
                onClick={() => toggleSort('type')}
              >
                Type
              </th>
              <th
                className="p-1 text-left cursor-pointer"
                onClick={() => toggleSort('src')}
              >
                Source
              </th>
              <th
                className="p-1 text-left cursor-pointer"
                onClick={() => toggleSort('dst')}
              >
                Destination
              </th>
              <th className="p-1 text-left">Detail</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, idx) => (
              <tr key={idx} className={idx % 2 ? 'bg-gray-700' : ''}>
                <td className="p-1 whitespace-nowrap">{row.time}</td>
                <td className="p-1 whitespace-nowrap">{row.type}</td>
                <td className="p-1 break-all">{row.src}</td>
                <td className="p-1 break-all">{row.dst}</td>
                <td className="p-1 break-all">
                  <MaskedText text={row.detail} />
                </td>
              </tr>
            ))}
            {!sorted.length && (
              <tr>
                <td className="p-4 text-center" colSpan="5">
                  No data
                </td>
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
