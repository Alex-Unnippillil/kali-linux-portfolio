import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { toPng } from 'html-to-image';

mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });

const defaultStages = [
  'Reconnaissance',
  'Weaponization',
  'Delivery',
  'Exploitation',
  'Installation',
  'Command & Control',
  'Actions on Objectives',
].join('\n');

const KillchainDiagram: React.FC = () => {
  const [stages, setStages] = useState<string>(defaultStages);
  const diagramRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const items = stages
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const graph = items.length
      ? `graph LR\n${items
          .map((stage, i) => `${i}["${stage}"]`)
          .join(' --> ')}`
      : 'graph LR';
    const id = `mermaid-${Date.now()}`;
    try {
      mermaid
        .render(id, graph)
        .then(({ svg }) => {
          if (diagramRef.current) {
            diagramRef.current.innerHTML = svg;
          }
        })
        .catch((err) => {
          if (diagramRef.current) {
            diagramRef.current.innerHTML = '';
            const pre = document.createElement('pre');
            pre.className = 'text-red-400';
            pre.textContent = String(err);
            diagramRef.current.appendChild(pre);
          }
        });
    } catch (err) {
      if (diagramRef.current) {
        diagramRef.current.innerHTML = '';
        const pre = document.createElement('pre');
        pre.className = 'text-red-400';
        pre.textContent = String(err);
        diagramRef.current.appendChild(pre);
      }
    }
  }, [stages]);

  const exportPng = async () => {
    if (diagramRef.current) {
      const dataUrl = await toPng(diagramRef.current);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'killchain.png';
      link.click();
    }
  };

  return (
    <div className="h-full w-full flex flex-col md:flex-row bg-ub-cool-grey text-white p-2 space-y-2 md:space-y-0 md:space-x-2">
      <div className="flex-1 flex flex-col space-y-2">
        <textarea
          value={stages}
          onChange={(e) => setStages(e.target.value)}
          className="flex-1 bg-gray-800 text-sm p-2 rounded resize-none"
          placeholder="Enter one stage per line"
        />
        <button
          onClick={exportPng}
          className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
        >
          Export PNG
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-white rounded p-2 flex items-center justify-center">
        <div ref={diagramRef} />
      </div>
    </div>
  );
};

export default KillchainDiagram;

