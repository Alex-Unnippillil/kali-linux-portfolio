import React, { useEffect, useMemo, useState } from 'react';
const NiktoReport = () => {
    const [findings, setFindings] = useState([]);
    const [severity, setSeverity] = useState('All');
    const [pathFilter, setPathFilter] = useState('');
    const [selected, setSelected] = useState(null);
    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch('/demo-data/nikto/report.json');
                const data = await res.json();
                setFindings(data);
            }
            catch {
                // ignore errors
            }
        };
        load();
    }, []);
    const filtered = useMemo(() => findings.filter((f) => (severity === 'All' || f.severity.toLowerCase() === severity.toLowerCase()) &&
        f.path.toLowerCase().includes(pathFilter.toLowerCase())), [findings, severity, pathFilter]);
    return (<div className="p-4 bg-gray-900 text-white min-h-screen">
      <h1 className="text-xl mb-4">Nikto Report</h1>
      <div className="flex space-x-2 mb-4">
        <input placeholder="Filter by path" className="p-2 rounded text-black" value={pathFilter} onChange={(e) => setPathFilter(e.target.value)}/>
        <select className="p-2 rounded text-black" value={severity} onChange={(e) => setSeverity(e.target.value)}>
          {['All', 'Info', 'Low', 'Medium', 'High'].map((s) => (<option key={s} value={s}>
              {s}
            </option>))}
        </select>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-gray-700">
            <th className="p-2">Path</th>
            <th className="p-2">Finding</th>
            <th className="p-2">References</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((f, idx) => (<tr key={idx} className="odd:bg-gray-800 cursor-pointer hover:bg-gray-700" onClick={() => setSelected(f)}>
              <td className="p-2">{f.path}</td>
              <td className="p-2">{f.finding}</td>
              <td className="p-2">{f.references.join(', ')}</td>
            </tr>))}
        </tbody>
      </table>
      {selected && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" onClick={() => setSelected(null)}>
          <div className="bg-gray-800 p-4 rounded max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg mb-2">{selected.path}</h2>
            <p className="mb-2">
              <span className="font-bold">Severity:</span> {selected.severity}
            </p>
            <p className="mb-2">{selected.finding}</p>
            <p className="mb-2">
              <span className="font-bold">References:</span>{' '}
              {selected.references.join(', ')}
            </p>
            <p>{selected.details}</p>
            <button className="mt-4 px-4 py-2 bg-blue-600 rounded" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
        </div>)}
    </div>);
};
export default NiktoReport;
