import React, { useEffect, useRef, useState } from 'react';
import Waterfall from './Waterfall';
import BurstChart from './BurstChart';
import { protocolName, getRowColor, matchesDisplayFilter } from './utils';
import DecodeTree from './DecodeTree';
import FlowGraph from '../../../apps/wireshark/components/FlowGraph';
import FilterHelper from '../../../apps/wireshark/components/FilterHelper';
import ColorRuleEditor from '../../../apps/wireshark/components/ColorRuleEditor';

const SMALL_CAPTURE_SIZE = 1024 * 1024; // 1MB threshold

const toHex = (bytes) =>
  Array.from(bytes, (b, i) =>
    `${b.toString(16).padStart(2, '0')}${(i + 1) % 16 === 0 ? '\n' : ' '}`
  ).join('');

const parseEthernetIpv4 = (data) => {
  if (data.length < 34) return { src: '', dest: '', protocol: 0, info: '' };
  const etherType = (data[12] << 8) | data[13];
  if (etherType !== 0x0800) return { src: '', dest: '', protocol: 0, info: '' };
  const protocol = data[23];
  const src = Array.from(data.slice(26, 30)).join('.');
  const dest = Array.from(data.slice(30, 34)).join('.');
  let info = '';
  if (protocol === 6 && data.length >= 54) {
    const sport = (data[34] << 8) | data[35];
    const dport = (data[36] << 8) | data[37];
    info = `TCP ${sport} → ${dport}`;
    return { src, dest, protocol, info, sport, dport };
  }
  if (protocol === 17 && data.length >= 42) {
    const sport = (data[34] << 8) | data[35];
    const dport = (data[36] << 8) | data[37];
    info = `UDP ${sport} → ${dport}`;
    return { src, dest, protocol, info, sport, dport };
  }
  return { src, dest, protocol, info };
};

const parseWithCap = (buf) => {
  const view = new DataView(buf);
  const magic = view.getUint32(0, false);
  let little;
  if (magic === 0xa1b2c3d4) little = false;
  else if (magic === 0xd4c3b2a1) little = true;
  else throw new Error('Unsupported pcap format');
  let offset = 24;
  const packets = [];
  while (offset + 16 <= view.byteLength) {
    const tsSec = view.getUint32(offset, little);
    const tsUsec = view.getUint32(offset + 4, little);
    const capLen = view.getUint32(offset + 8, little);
    const origLen = view.getUint32(offset + 12, little);
    offset += 16;
    if (offset + capLen > view.byteLength) break;
    const data = new Uint8Array(buf.slice(offset, offset + capLen));
    const meta = parseEthernetIpv4(data);
    packets.push({
      timestamp: `${tsSec}.${tsUsec.toString().padStart(6, '0')}`,
      src: meta.src,
      dest: meta.dest,
      protocol: meta.protocol,
      info: meta.info || `len=${origLen}`,
      sport: meta.sport,
      dport: meta.dport,
      data,
      layers: {},
    });
    offset += capLen;
  }
  return packets;
};

const parseWithWiregasm = async (buf) => {
  try {
    const resp = await fetch(
      'https://unpkg.com/wiregasm/dist/wiregasm.wasm'
    );
    await WebAssembly.instantiate(await resp.arrayBuffer(), {});
  } catch {
    // ignore wasm errors and fall back
  }
  return parseWithCap(buf);
};

// Basic BPF-style filtering support
const matchesBpf = (packet, expr) => {
  if (!expr) return true;
  const f = expr.trim().toLowerCase();
  if (f === 'tcp') return packet.protocol === 6;
  if (f === 'udp') return packet.protocol === 17;
  if (f === 'icmp') return packet.protocol === 1;
  const port = f.match(/^port (\d+)$/);
  if (port) {
    const num = parseInt(port[1], 10);
    return packet.sport === num || packet.dport === num;
  }
  const host = f.match(/^host (.+)$/);
  if (host) {
    const ip = host[1];
    return packet.src === ip || packet.dest === ip;
  }
  return true;
};

const WiresharkApp = ({ initialPackets = [] }) => {
  const [packets, setPackets] = useState(initialPackets);
  const [socket, setSocket] = useState(null);
  const [tlsKeys, setTlsKeys] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('');
  const [filter, setFilter] = useState('');
  const [bpf, setBpf] = useState('');
  const [colorRules, setColorRules] = useState([]);
  const [paused, setPaused] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [minuteData, setMinuteData] = useState([]);
  const [viewIndex, setViewIndex] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [selectedPacket, setSelectedPacket] = useState(null);
  const [view, setView] = useState('packets');
  const [error, setError] = useState('');
  const devices = [
    { name: 'eth0', icon: '🖧' },
    { name: 'wlan0', icon: '📶' },
  ];
  const [selectedDevice, setSelectedDevice] = useState(devices[0]);
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const workerRef = useRef(null);
  const pausedRef = useRef(false);
  const prefersReducedMotion = useRef(false);
  const VISIBLE = 100;

  // Load persisted filter on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('wireshark-filter');
      if (saved) setFilter(saved);
      prefersReducedMotion.current = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
    }
  }, []);

  // instantiate worker for burst grouping
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof Worker === 'function') {
      const worker = new Worker(new URL('./burstWorker.js', import.meta.url));
      worker.onmessage = (e) => {
        if (e.data.type === 'burst') {
          setAnnouncement(`Burst starting at ${e.data.start}`);
        }
        if (e.data.type === 'timeline') {
          setTimeline(e.data.timeline);
        }
        if (e.data.type === 'minutes') {
          setMinuteData(e.data.minutes);
        }
      };
      // seed worker with any bundled packets
      initialPackets.forEach((pkt) => worker.postMessage(pkt));
      workerRef.current = worker;
      return () => worker.terminate();
    }
    return undefined;
  }, [initialPackets]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (!paused) {
      setViewIndex(Math.max(0, timeline.length - VISIBLE));
    }
  }, [timeline, paused]);

  const handleFilterChange = (val) => {
    setFilter(val);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('wireshark-filter', val);
    }
  };


  const handleBpfChange = (e) => {
    setBpf(e.target.value);
  };

  const handleTLSKeyUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setTlsKeys(reader.result);
      reader.readAsText(file);
    }
  };

  const handleFile = async (file) => {
    try {
      const buffer = await file.arrayBuffer();
      const parsed =
        buffer.byteLength < SMALL_CAPTURE_SIZE
          ? parseWithCap(buffer)
          : await parseWithWiregasm(buffer);
      setPackets(parsed);
      setTimeline(parsed);
      setError('');
    } catch (err) {
      setError(err.message || 'Unsupported file');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.pcap')) {
      handleFile(file);
    } else {
      setError('Unsupported file format');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const startCapture = () => {
    if (socket || typeof window === 'undefined') return;
    const ws = new WebSocket('ws://localhost:8080');
    ws.onopen = () => {
      if (tlsKeys) {
        ws.send(JSON.stringify({ type: 'tlsKeys', keys: tlsKeys }));
      }
      if (selectedDevice) {
        ws.send(
          JSON.stringify({ type: 'device', name: selectedDevice.name })
        );
      }
    };
    ws.onmessage = (event) => {
      try {
        const pkt = JSON.parse(event.data);
        setPackets((prev) => [pkt, ...prev].slice(0, 500));
        if (!pausedRef.current) {
          workerRef.current?.postMessage(pkt);
        }
      } catch (e) {
        // ignore malformed packets
      }
    };
    ws.onclose = () => setSocket(null);
    setSocket(ws);
  };

  const stopCapture = () => {
    if (socket) {
      socket.close();
      setSocket(null);
    }
  };

  const handlePause = () => {
    setPaused((p) => {
      const next = !p;
      setAnnouncement(next ? 'Capture paused' : 'Capture resumed');
      return next;
    });
  };

  const handleScrub = (e) => {
    const idx = parseInt(e.target.value, 10);
    setViewIndex(idx);
    setAnnouncement(`Viewing packets starting at index ${idx}`);
  };

  const protocols = Array.from(new Set(packets.map((p) => protocolName(p.protocol))));
  const filteredPackets = packets
    .filter((p) => matchesDisplayFilter(p, filter))
    .filter((p) => matchesBpf(p, bpf))
    .filter((p) => !protocolFilter || protocolName(p.protocol) === protocolFilter);
  const hasTlsKeys = !!tlsKeys;

  return (
    <div
      className="w-full h-full flex flex-col bg-black text-green-400 [container-type:inline-size]"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <p className="text-yellow-300 text-xs p-2 bg-gray-900">
        Bundled capture for lab use only. No live traffic.
      </p>
      {error && (
        <p className="text-red-400 text-xs p-2 bg-gray-900">{error}</p>
      )}
      <div className="p-2 flex space-x-2 bg-gray-900 flex-wrap items-center">
        <button
          onClick={startCapture}
          disabled={!!socket}
          className="p-1 bg-gray-700 rounded disabled:opacity-50 flex items-center justify-center w-6 h-6"
          aria-label="Start capture"
        >
          <span aria-hidden="true" className="text-2xl leading-none">▶</span>
        </button>
        <button
          onClick={stopCapture}
          disabled={!socket}
          className="p-1 bg-gray-700 rounded disabled:opacity-50 flex items-center justify-center w-6 h-6"
          aria-label="Stop capture"
        >
          <span aria-hidden="true" className="text-2xl leading-none">■</span>
        </button>
        <div className="relative">
          <button
            onClick={() => setShowDeviceMenu((v) => !v)}
            className="px-2 py-1 bg-gray-700 rounded flex items-center space-x-1 text-xs"
            aria-haspopup="true"
            aria-expanded={showDeviceMenu}
          >
            <span className="w-4 h-4">
              {selectedDevice.icon}
            </span>
            <span>{selectedDevice.name}</span>
          </button>
          {showDeviceMenu && (
            <ul className="absolute z-10 mt-1 bg-gray-800 rounded shadow text-white text-xs">
              {devices.map((d) => (
                <li
                  key={d.name}
                  className="px-2 py-1 flex items-center space-x-1 hover:bg-gray-700 cursor-pointer"
                  onClick={() => {
                    setSelectedDevice(d);
                    setShowDeviceMenu(false);
                  }}
                >
                  <span className="w-4 h-4">{d.icon}</span>
                  <span>{d.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <input
          type="file"
          accept=".keys,.txt,.log"
          onChange={handleTLSKeyUpload}
          aria-label="TLS key file"
          className="px-2 py-1 bg-gray-800 rounded text-white"
        />
        <FilterHelper value={filter} onChange={handleFilterChange} />
        <input
          value={bpf}
          onChange={handleBpfChange}
          list="bpf-suggestions"
          placeholder="BPF filter (e.g. tcp, port 80)"
          aria-label="BPF filter"
          className="px-2 py-1 bg-gray-800 rounded text-white"
        />
        <datalist id="bpf-suggestions">
          <option value="tcp" />
          <option value="udp" />
          <option value="icmp" />
          <option value="port 80" />
          <option value="host 10.0.0.1" />
        </datalist>
        <a
          href="https://www.wireshark.org/docs/dfref/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 underline whitespace-nowrap"
        >
          Display filter docs
        </a>
        <ColorRuleEditor rules={colorRules} onChange={setColorRules} />
        <button
          onClick={handlePause}
          className="p-1 bg-gray-700 rounded flex items-center justify-center w-6 h-6"
          aria-pressed={paused}
          aria-label={paused ? 'Resume capture' : 'Pause capture'}
        >
          <span aria-hidden="true" className="text-2xl leading-none">
            {paused ? '▶' : '⏸'}
          </span>
        </button>
        <input
          type="range"
          min="0"
          max={Math.max(0, timeline.length - VISIBLE)}
          value={viewIndex}
          onChange={handleScrub}
          aria-label="Scrub timeline"
          className="flex-1 waterfall-cq"
        />
      </div>
      <div className="waterfall-cq">
        <Waterfall
          packets={timeline}
          colorRules={colorRules}
          viewIndex={viewIndex}
          prefersReducedMotion={prefersReducedMotion.current}
        />
      </div>
      <BurstChart minutes={minuteData} />
      <div className="p-2 flex space-x-2 bg-gray-900 overflow-x-auto">
        <button
          className={`px-2 py-1 rounded border ${
            protocolFilter === '' ? 'bg-gray-700' : 'bg-gray-800'
          }`}
          onClick={() => setProtocolFilter('')}
        >
          All
        </button>
        {protocols.map((proto) => (
          <button
            key={proto}
            className={`px-2 py-1 rounded border ${
              protocolFilter === proto ? 'bg-gray-700' : 'bg-gray-800'
            }`}
            onClick={() => setProtocolFilter(proto)}
          >
            {proto}
          </button>
        ))}
      </div>
      <div className="p-2 flex space-x-2 bg-gray-900">
        <button
          className={`px-2 py-1 rounded border ${
            view === 'packets' ? 'bg-gray-700' : 'bg-gray-800'
          }`}
          onClick={() => setView('packets')}
        >
          Packets
        </button>
        <button
          className={`px-2 py-1 rounded border ${
            view === 'flows' ? 'bg-gray-700' : 'bg-gray-800'
          }`}
          onClick={() => setView('flows')}
        >
          Flows
        </button>
      </div>
      {view === 'packets' ? (
        <>
          <div className="flex-1 overflow-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-2 py-1 text-left">Time</th>
                  <th className="px-2 py-1 text-left">Source</th>
                  <th className="px-2 py-1 text-left">Destination</th>
                  <th className="px-2 py-1 text-left">Protocol</th>
                  <th className="px-2 py-1 text-left">Info</th>
                  {hasTlsKeys && (
                    <th className="px-2 py-1 text-left">Plaintext</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredPackets.map((p, i) => {
                  const isMatch = matchesDisplayFilter(p, filter);
                  const ruleColor = getRowColor(p, colorRules);
                  return (
                    <tr
                      key={i}
                      onClick={() => setSelectedPacket(p)}
                      className={`h-8 ${i % 2 ? 'bg-gray-900' : 'bg-gray-800'} ${
                        isMatch ? 'bg-yellow-900' : ''
                      } ${
                        selectedPacket === p
                          ? 'outline outline-1 outline-yellow-400'
                          : ''
                      } border-l-4 ${ruleColor || 'border-transparent'}`}
                    >
                      <td className="px-2 py-1 whitespace-nowrap">{p.timestamp}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{p.src}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{p.dest}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{protocolName(p.protocol)}</td>
                      <td className="px-2 py-1">{p.info}</td>
                      {hasTlsKeys && (
                        <td className="px-2 py-1">{p.plaintext || p.decrypted}</td>
                      )}
                </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-2 bg-gray-900 overflow-auto text-xs h-40 font-mono">
            {selectedPacket ? (
              <>
                <DecodeTree data={selectedPacket.layers} />
                {selectedPacket.data && (
                  <pre className="mt-2 whitespace-pre-wrap">
                    {toHex(selectedPacket.data)}
                  </pre>
                )}
              </>
            ) : (
              <p className="text-gray-400">Select a packet to view details</p>
            )}
          </div>
        </>
      ) : (
        <FlowGraph packets={filteredPackets} />
      )}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <style jsx>{`
        @container (max-width: 600px) {
          .waterfall-cq {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default WiresharkApp;
