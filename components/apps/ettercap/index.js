import React, { useEffect, useRef, useState } from 'react';

const protocols = ['TCP', 'UDP', 'ICMP', 'ARP', 'HTTP', 'DNS'];

const generatePacket = (src, dst) => ({
  time: new Date().toLocaleTimeString(),
  src,
  dst,
  protocol: protocols[Math.floor(Math.random() * protocols.length)],
  length: Math.floor(Math.random() * 1500) + 60,
});

const defaultPresets = [
  { name: 'Local Gateway', target1: '192.168.0.1', target2: '192.168.0.255' },
  { name: 'Sample Pair', target1: '192.168.0.100', target2: '192.168.0.101' },
];

const EttercapApp = () => {
  const [target1, setTarget1] = useState('');
  const [target2, setTarget2] = useState('');
  const [running, setRunning] = useState(false);
  const [traffic, setTraffic] = useState([]);
  const [presets, setPresets] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState('');
  const intervalRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem('ettercap-presets');
    setPresets(stored ? JSON.parse(stored) : defaultPresets);
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    localStorage.setItem('ettercap-presets', JSON.stringify(presets));
  }, [presets]);

  const startSession = () => {
    if (!target1 || !target2) return;
    setTraffic([]);
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setTraffic((t) => [generatePacket(target1, target2), ...t]);
    }, 1000);
  };

  const stopSession = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
  };

  const applyPreset = (name) => {
    setSelectedPreset(name);
    const preset = presets.find((p) => p.name === name);
    if (preset) {
      setTarget1(preset.target1);
      setTarget2(preset.target2);
    }
  };

  const savePreset = () => {
    const name = prompt('Preset name', selectedPreset || '');
    if (!name) return;
    const existingIndex = presets.findIndex((p) => p.name === name);
    const newPresets = [...presets];
    const data = { name, target1, target2 };
    if (existingIndex >= 0) {
      newPresets[existingIndex] = data;
    } else {
      newPresets.push(data);
    }
    setPresets(newPresets);
    setSelectedPreset(name);
  };

  return (
    <div className="h-full w-full bg-ub-cool-grey text-white p-4 flex flex-col">
      <div className="flex mb-4 space-x-2">
        <select
          className="p-2 rounded text-black"
          value={selectedPreset}
          onChange={(e) => applyPreset(e.target.value)}
          disabled={running}
        >
          <option value="">Custom</option>
          {presets.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          className="flex-1 p-2 rounded text-black"
          placeholder="Target 1"
          value={target1}
          onChange={(e) => {
            setTarget1(e.target.value);
            setSelectedPreset('');
          }}
          disabled={running}
        />
        <input
          className="flex-1 p-2 rounded text-black"
          placeholder="Target 2"
          value={target2}
          onChange={(e) => {
            setTarget2(e.target.value);
            setSelectedPreset('');
          }}
          disabled={running}
        />
        {!running ? (
          <button
            className="px-4 py-2 bg-green-600 rounded"
            onClick={startSession}
          >
            Start
          </button>
        ) : (
          <button
            className="px-4 py-2 bg-red-600 rounded"
            onClick={stopSession}
          >
            Stop
          </button>
        )}
        <button
          className="px-4 py-2 bg-blue-600 rounded"
          onClick={savePreset}
          disabled={running}
        >
          Save Preset
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-gray-800 rounded">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-700">
              <th className="p-1 text-left">Time</th>
              <th className="p-1 text-left">Source</th>
              <th className="p-1 text-left">Destination</th>
              <th className="p-1 text-left">Protocol</th>
              <th className="p-1 text-left">Length</th>
            </tr>
          </thead>
          <tbody>
            {traffic.map((pkt, idx) => (
              <tr key={idx} className={idx % 2 ? 'bg-gray-700' : ''}>
                <td className="p-1 whitespace-nowrap">{pkt.time}</td>
                <td className="p-1 break-all">{pkt.src}</td>
                <td className="p-1 break-all">{pkt.dst}</td>
                <td className="p-1">{pkt.protocol}</td>
                <td className="p-1">{pkt.length}</td>
              </tr>
            ))}
            {!traffic.length && (
              <tr>
                <td className="p-4 text-center" colSpan="5">
                  {running ? 'Capturing traffic...' : 'No traffic'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EttercapApp;

export const displayEttercap = () => <EttercapApp />;

