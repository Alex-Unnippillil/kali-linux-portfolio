import React, { useEffect, useMemo, useRef, useState } from 'react';

// Simple helpers to generate demo data
const demoNetworks = () => [
  { ssid: 'CoffeeShopWiFi', strength: -45, channel: 1, history: [-45] },
  { ssid: 'FreeAirport', strength: -70, channel: 6, history: [-70] },
  { ssid: 'HomeWiFi', strength: -30, channel: 11, history: [-30] },
];

const randomHex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
const randomMac = () =>
  `${randomHex()}:${randomHex()}:${randomHex()}:${randomHex()}:${randomHex()}:${randomHex()}`;

const SignalTimeline = ({ history }) => {
  const canvasRef = useRef(null);
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = '#f59e0b'; // amber-500 for high contrast
      ctx.beginPath();
      history.forEach((s, i) => {
        const x = (i / (history.length - 1 || 1)) * w;
        const y = ((-s - 20) / 70) * h; // map -20..-90 to 0..1
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

const KismetApp = () => {
  const [networks, setNetworks] = useState([]);
  const [packets, setPackets] = useState([]);

  useEffect(() => {
    // In browsers we cannot access wireless cards directly. For demo purposes,
    // populate with static data and simulate packets.
    setNetworks(demoNetworks());

    const interval = setInterval(() => {
      setNetworks((prev) =>
        prev.map((net) => {
          const next = Math.max(
            -90,
            Math.min(-20, net.strength + (Math.random() * 10 - 5))
          );
          const history = [...net.history, next].slice(-50);
          return { ...net, strength: next, history };
        })
      );

      setPackets((prev) => [
        ...prev,
        { ts: Date.now(), from: randomMac(), to: randomMac() },
      ]);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white select-none">
      <div className="px-3 py-1 border-b border-gray-700">
      <span className="font-bold">Kismet</span>
      </div>
      <div className="flex flex-grow overflow-hidden">
        <div className="w-1/2 p-2 flex flex-col">
          <h2 className="text-sm font-semibold mb-2">Nearby Networks</h2>
          {networks.length ? (
            <VirtualizedList
              items={networks}
              rowHeight={40}
              keyExtractor={(n) => n.ssid}
              className="flex-grow"
              renderRow={(net) => (
                <div className="flex items-center justify-between p-1">
                  <span className="truncate w-24" title={net.ssid}>
                    {net.ssid}
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
        </div>
        <div className="w-1/2 p-2 flex flex-col border-l border-gray-700">
          <h2 className="text-sm font-semibold mb-2">Packet Capture</h2>
          {packets.length ? (
            <VirtualizedList
              items={packets}
              rowHeight={20}
              keyExtractor={(pkt, idx) => `${pkt.ts}-${idx}`}
              className="flex-grow"
              renderRow={(pkt) => (
                <div className="text-xs">
                  [{new Date(pkt.ts).toLocaleTimeString()}] {pkt.from} → {pkt.to}
                </div>
              )}
            />
          ) : (
            <p className="text-gray-400 text-sm">No packets captured.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default KismetApp;

export const displayKismet = (addFolder, openApp) => {
  return <KismetApp addFolder={addFolder} openApp={openApp} />;
};

