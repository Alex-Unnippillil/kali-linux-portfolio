import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import seedrandom from 'seedrandom';
import capture from './sampleCapture.json';
import clients from './sampleClients.json';
import vendors from './oui.json';

const SignalTimeline = ({ history }) => {
  const canvasRef = useRef(null);
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = '#f59e0b';
      ctx.beginPath();
      history.forEach((s, i) => {
        const x = (i / (history.length - 1 || 1)) * w;
        const y = ((-s - 20) / 70) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };

    const frame = requestAnimationFrame(draw);
    if (reduceMotion.current) cancelAnimationFrame(frame);
    return () => cancelAnimationFrame(frame);
  }, [history]);

  return (
    <canvas
      ref={canvasRef}
      width={80}
      height={30}
      className="ml-2 border border-gray-700 bg-black"
      role="img"
      aria-label="Signal quality timeline"
    />
  );
};

const ChannelOccupancy = ({ networks }) => {
  const channels = useMemo(() => {
    const counts = Array(11).fill(0);
    networks.forEach((n) => {
      if (n.channel > 0 && n.channel <= 11) counts[n.channel - 1]++;
    });
    return counts;
  }, [networks]);

  return (
    <div className="mt-4" aria-live="polite">
      <h3 className="text-sm font-semibold mb-2">Channel Occupancy</h3>
      <div className="flex items-end h-24 space-x-1">
        {channels.map((count, idx) => (
          <div key={idx} className="flex flex-col items-center">
            <div
              className="bg-blue-600 w-4"
              style={{ height: `${count * 10}px` }}
              role="img"
              aria-label={`Channel ${idx + 1} has ${count} networks`}
            />
            <span className="text-xs mt-1">{idx + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const SSIDHeatmap = ({ data }) => {
  const ssids = Object.keys(data);
  const max = Math.max(0, ...ssids.flatMap((s) => data[s].counts));
  return (
    <div className="mt-4" aria-live="polite">
      <h3 className="text-sm font-semibold mb-2">SSID/Channel Heatmap</h3>
      <table className="text-xs border-collapse">
        <thead>
          <tr>
            <th className="px-1 text-left">SSID</th>
            {Array.from({ length: 11 }, (_, i) => (
              <th key={i} className="px-1">
                {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ssids.map((ssid) => (
            <tr key={ssid}>
              <td
                className="pr-1 truncate max-w-[5rem]"
                title={`${ssid} (${data[ssid].vendor})`}
              >
                {ssid}
                <div className="text-gray-400 text-[10px] truncate">
                  {data[ssid].vendor}
                </div>
              </td>
              {data[ssid].counts.map((count, i) => (
                <td
                  key={i}
                  style={{
                    backgroundColor: `rgba(59,130,246,${
                      max ? count / max : 0
                    })`,
                  }}
                  className="w-4 h-4 text-center"
                >
                  {count || ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ClientTable = ({ clients }) => (
  <div className="mt-4" aria-live="polite">
    <h3 className="text-sm font-semibold mb-2">Client Associations</h3>
    <table className="w-full text-xs">
      <thead>
        <tr>
          <th className="text-left">MAC</th>
          <th className="text-left">SSID</th>
          <th className="text-left">Vendor</th>
        </tr>
      </thead>
      <tbody>
        {clients.map((c, idx) => (
          <tr key={idx} className="odd:bg-gray-800">
            <td className="pr-2">{c.mac}</td>
            <td className="pr-2">{c.ssid}</td>
            <td>{c.vendor}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const WardriveMap = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rng = seedrandom('kismet');
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, 200, 200);
    for (let i = 0; i < 20; i++) {
      const x = rng() * 200;
      const y = rng() * 200;
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(x, y, 3, 3);
    }
  }, []);
  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={200}
      className="mt-4 border border-gray-700"
      role="img"
      aria-label="Seeded wardriving map"
    />
  );
};

// Generic virtualized list to efficiently render large datasets
const VirtualizedList = ({
  items,
  rowHeight,
  renderRow,
  keyExtractor = (_, i) => i,
  className = '',
  overscan = 5,
}) => {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (containerRef.current) setHeight(containerRef.current.clientHeight);
  }, []);

  const onScroll = (e) => setScrollTop(e.currentTarget.scrollTop);
  const totalHeight = items.length * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + height) / rowHeight) + overscan
  );
  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className={`overflow-y-auto ${className}`}
    >
      <ul style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, i) => {
          const index = startIndex + i;
          return (
            <li
              key={keyExtractor(item, index)}
              style={{
                position: 'absolute',
                top: index * rowHeight,
                height: rowHeight,
                left: 0,
                right: 0,
              }}
            >
              {renderRow(item, index)}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const KismetApp = ({ onNetworkDiscovered = () => {} }) => {
  const [networks, setNetworks] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);

  const clientsWithVendor = useMemo(
    () =>
      clients.map((c) => ({
        ...c,
        vendor: vendors[c.mac.slice(0, 8).toUpperCase()] || 'Unknown',
      })),
    []
  );

  const heatmapData = useMemo(() => {
    const data = {};
    capture.slice(0, frameIndex).forEach(({ ssid, channel, bssid }) => {
      if (!data[ssid]) {
        data[ssid] = {
          counts: Array(11).fill(0),
          vendor: vendors[bssid.slice(0, 8).toUpperCase()] || 'Unknown',
        };
      }
      if (channel > 0 && channel <= 11) data[ssid].counts[channel - 1]++;
    });
    return data;
  }, [frameIndex]);

  const stepFrame = useCallback(() => {
    setFrameIndex((idx) => {
      if (idx >= capture.length) return idx;
      const frame = capture[idx];
      setNetworks((prev) => {
        const existing = prev.find((n) => n.bssid === frame.bssid);
        if (existing) {
          return prev.map((n) =>
            n.bssid === frame.bssid
              ? {
                  ...n,
                  ssid: frame.ssid,
                  strength: frame.signal,
                  channel: frame.channel,
                  history: [...n.history, frame.signal].slice(-50),
                }
              : n
          );
        }
        const discoveredAt = Date.now();
        const newNetwork = {
          ssid: frame.ssid,
          bssid: frame.bssid,
          vendor:
            vendors[frame.bssid.slice(0, 8).toUpperCase()] || 'Unknown',
          strength: frame.signal,
          channel: frame.channel,
          history: [frame.signal],
          discoveredAt,
          highlight: true,
        };
        onNetworkDiscovered(newNetwork);
        setTimeout(() => {
          setNetworks((p) =>
            p.map((n) =>
              n.bssid === newNetwork.bssid ? { ...n, highlight: false } : n
            )
          );
        }, 3000);
        return [...prev, newNetwork];
      });
      return idx + 1;
    });
  }, [onNetworkDiscovered]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(stepFrame, 1000);
    return () => clearInterval(id);
  }, [playing, stepFrame]);

  const handleLoad = () => {
    setNetworks([]);
    setFrameIndex(0);
    setPlaying(false);
  };

  return (
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white select-none">
      <div className="px-3 py-1 border-b border-gray-700">
        <span className="font-bold">Kismet</span>
      </div>
      <div className="p-2 flex space-x-2 bg-gray-900">
        <button
          onClick={handleLoad}
          className="px-3 py-1 bg-gray-700 rounded"
        >
          Load Sample
        </button>
        <button
          onClick={() => setPlaying((p) => !p)}
          disabled={frameIndex >= capture.length}
          className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={stepFrame}
          disabled={playing || frameIndex >= capture.length}
          className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
        >
          Step
        </button>
      </div>
      <div className="flex flex-grow overflow-hidden">
        <div className="w-full p-2 flex flex-col">
          <h2 className="text-sm font-semibold mb-2">Nearby Networks</h2>
          {networks.length ? (
            <VirtualizedList
              items={networks}
              rowHeight={40}
              keyExtractor={(n) => n.bssid}
              className="flex-grow"
                renderRow={(net) => (
                  <div
                    className={`flex items-center justify-between p-1 transition-colors duration-500 ${net.highlight ? 'bg-yellow-700' : ''}`}
                  >
                  <span
                    className="truncate w-24"
                    title={`${net.ssid} (${net.bssid})`}
                  >
                    {net.ssid}
                  </span>
                  <span
                    className="text-gray-400 text-xs w-24 truncate"
                    title={net.vendor}
                  >
                    {net.vendor}
                  </span>
                  <SignalTimeline history={net.history} />
                  <span className="text-gray-400 text-xs w-16 text-right">
                    {net.strength} dBm
                  </span>
                </div>
              )}
            />
          ) : (
            <p className="text-gray-400 text-sm">No networks detected.</p>
          )}
          <ChannelOccupancy networks={networks} />
          <SSIDHeatmap data={heatmapData} />
          <ClientTable clients={clientsWithVendor} />
          <WardriveMap />
          <p className="text-gray-400 text-xs mt-2">
            Real capture requires hardware with monitor mode.{' '}
            <a
              href="https://www.kismetwireless.net/docs/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline"
            >
              Kismet documentation
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default KismetApp;

export const displayKismet = (addFolder, openApp) => {
  return <KismetApp addFolder={addFolder} openApp={openApp} />;
};

