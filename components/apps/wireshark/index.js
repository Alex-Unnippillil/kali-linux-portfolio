import React, { useState } from 'react';

const protocolName = (proto) => {
  switch (proto) {
    case 6:
      return 'TCP';
    case 17:
      return 'UDP';
    case 1:
      return 'ICMP';
    default:
      return proto;
  }
};

const WiresharkApp = () => {
  const [packets, setPackets] = useState([]);
  const [socket, setSocket] = useState(null);

  const exportCapture = () => {
    if (!packets.length) return;

    const globalHeader = new ArrayBuffer(24);
    const ghView = new DataView(globalHeader);
    ghView.setUint32(0, 0xa1b2c3d4, true); // magic number
    ghView.setUint16(4, 2, true); // version major
    ghView.setUint16(6, 4, true); // version minor
    ghView.setInt32(8, 0, true); // thiszone
    ghView.setUint32(12, 0, true); // sigfigs
    ghView.setUint32(16, 65535, true); // snaplen
    ghView.setUint32(20, 1, true); // network (Ethernet)

    const buffers = [globalHeader];

    packets.forEach((p) => {
      const dataArray = (() => {
        const src = p.data || p.raw || p.payload || [];
        if (typeof src === 'string') {
          try {
            return Uint8Array.from(atob(src), (c) => c.charCodeAt(0));
          } catch {
            return new Uint8Array(0);
          }
        }
        if (Array.isArray(src)) return Uint8Array.from(src);
        return new Uint8Array(0);
      })();

      const pktHeader = new ArrayBuffer(16);
      const phView = new DataView(pktHeader);
      const ts = new Date(p.timestamp || Date.now());
      const secs = Math.floor(ts.getTime() / 1000);
      const usecs = (ts.getTime() % 1000) * 1000;
      phView.setUint32(0, secs, true);
      phView.setUint32(4, usecs, true);
      phView.setUint32(8, dataArray.length, true);
      phView.setUint32(12, dataArray.length, true);

      buffers.push(pktHeader, dataArray.buffer);
    });

    const blob = new Blob(buffers, { type: 'application/vnd.tcpdump.pcap' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `capture-${Date.now()}.pcap`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const startCapture = () => {
    if (socket || typeof window === 'undefined') return;
    const ws = new WebSocket('ws://localhost:8080');
    ws.onmessage = (event) => {
      try {
        const pkt = JSON.parse(event.data);
        setPackets((prev) => [pkt, ...prev].slice(0, 500));
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

  return (
    <div className="w-full h-full flex flex-col bg-black text-green-400">
      <div className="p-2 flex space-x-2 bg-gray-900">
        <button
          onClick={startCapture}
          disabled={!!socket}
          className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
        >
          Start
        </button>
        <button
          onClick={stopCapture}
          disabled={!socket}
          className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
        >
          Stop
        </button>
        <button
          onClick={exportCapture}
          disabled={!packets.length}
          className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
        >
          Export
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-2 py-1 text-left">Time</th>
              <th className="px-2 py-1 text-left">Source</th>
              <th className="px-2 py-1 text-left">Destination</th>
              <th className="px-2 py-1 text-left">Protocol</th>
              <th className="px-2 py-1 text-left">Info</th>
            </tr>
          </thead>
          <tbody>
            {packets.map((p, i) => (
              <tr key={i} className={i % 2 ? 'bg-gray-900' : 'bg-gray-800'}>
                <td className="px-2 py-1 whitespace-nowrap">{p.timestamp}</td>
                <td className="px-2 py-1 whitespace-nowrap">{p.src}</td>
                <td className="px-2 py-1 whitespace-nowrap">{p.dest}</td>
                <td className="px-2 py-1 whitespace-nowrap">{protocolName(p.protocol)}</td>
                <td className="px-2 py-1">{p.info}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WiresharkApp;
