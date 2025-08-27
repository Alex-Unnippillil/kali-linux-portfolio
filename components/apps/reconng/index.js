import React, { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import usePersistentState from '../../hooks/usePersistentState';

const ForceGraph2D = dynamic(
  () => import('react-force-graph').then((mod) => mod.ForceGraph2D),
  { ssr: false },
);

const modules = [
  'DNS Enumeration',
  'WHOIS Lookup',
  'Reverse IP Lookup',
];

const ReconNG = () => {
  const [selectedModule, setSelectedModule] = useState(modules[0]);
  const [target, setTarget] = useState('');
  const [output, setOutput] = useState('');
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [view, setView] = useState('run');
  const [marketplace, setMarketplace] = useState([]);
  const [apiKeys, setApiKeys] = usePersistentState('reconng-api-keys', {});
  const graphRef = useRef();
  const icon = useMemo(() => {
    const img = new Image();
    img.src = '/themes/Yaru/apps/reconng.svg';
    return img;
  }, []);

  useEffect(() => {
    fetch('/reconng-marketplace.json')
      .then((r) => r.json())
      .then((d) => setMarketplace(d.modules || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const nodes = allModules.map((id) => ({ id }));
    const links = allModules.slice(1).map((id, i) => ({
      source: allModules[i],
      target: id,
    }));
    setGraphData({ nodes, links });
  }, [marketplace]);

  const allModules = [...modules, ...marketplace];

  const runModule = () => {
    if (!target) return;
    setOutput(`Running ${selectedModule} on ${target}...\nResults will appear here.`);
    setGraphData((prev) => {
      const nodes = prev.nodes.some((n) => n.id === target)
        ? prev.nodes
        : [...prev.nodes, { id: target }];
      return {
        nodes,
        links: [...prev.links, { source: selectedModule, target }],
      };
    });
  };

  return (
    <div className="flex flex-col h-full w-full bg-gray-900 text-white p-4">
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setView('run')}
          className={`px-2 py-1 ${view === 'run' ? 'bg-blue-600' : 'bg-gray-800'}`}
        >
          Run
        </button>
        <button
          type="button"
          onClick={() => setView('settings')}
          className={`px-2 py-1 ${view === 'settings' ? 'bg-blue-600' : 'bg-gray-800'}`}
        >
          Settings
        </button>
        <button
          type="button"
          onClick={() => setView('marketplace')}
          className={`px-2 py-1 ${view === 'marketplace' ? 'bg-blue-600' : 'bg-gray-800'}`}
        >
          Marketplace
        </button>
      </div>
      {view === 'run' && (
        <>
          <div className="flex gap-2 mb-2">
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="bg-gray-800 px-2 py-1"
            >
              {allModules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Target"
              className="flex-1 bg-gray-800 px-2 py-1"
            />
            <button
              type="button"
              onClick={runModule}
              className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded"
            >
              Run
            </button>
          </div>
          <pre className="flex-1 bg-black p-2 overflow-auto whitespace-pre-wrap mb-2">{output}</pre>
          {graphData.nodes.length > 0 && (
            <div className="bg-black p-2" style={{ height: '300px' }}>
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                linkColor={() => 'rgba(59,130,246,0.4)'}
                linkWidth={() => 1}
                nodeCanvasObject={(node, ctx, globalScale) => {
                  const size = 16;
                  if (icon.complete) {
                    ctx.drawImage(icon, node.x - size / 2, node.y - size / 2, size, size);
                  } else {
                    icon.onload = () => graphRef.current && graphRef.current.refresh();
                  }
                  const label = node.id;
                  const fontSize = 8 / globalScale;
                  ctx.font = `${fontSize}px sans-serif`;
                  ctx.fillStyle = '#fff';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'top';
                  ctx.fillText(label, node.x, node.y + size / 2 + 2 / globalScale);
                }}
                nodePointerAreaPaint={(node, color, ctx) => {
                  const size = 16;
                  ctx.fillStyle = color;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, size / 2, 0, 2 * Math.PI, false);
                  ctx.fill();
                }}
              />
            </div>
          )}
        </>
      )}
      {view === 'settings' && (
        <div className="flex-1 overflow-auto">
          {allModules.map((m) => (
            <div key={m} className="mb-2">
              <label className="block mb-1">{`${m} API Key`}</label>
              <input
                type="text"
                value={apiKeys[m] || ''}
                onChange={(e) => setApiKeys({ ...apiKeys, [m]: e.target.value })}
                className="w-full bg-gray-800 px-2 py-1"
                placeholder={`${m} API Key`}
              />
            </div>
          ))}
        </div>
      )}
      {view === 'marketplace' && (
        <ul className="list-disc pl-5">
          {marketplace.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ReconNG;

export const displayReconNG = () => <ReconNG />;

