import React, { useState } from 'react';
import { toPng } from 'html-to-image';

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
  const items = stages
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const exportPng = async () => {
    const container = document.createElement('div');
    const list = document.createElement('ol');
    items.forEach((stage) => {
      const li = document.createElement('li');
      li.textContent = stage;
      list.appendChild(li);
    });
    container.appendChild(list);
    const dataUrl = await toPng(container);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'killchain.png';
    link.click();
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
      <div className="flex-1 overflow-auto bg-white rounded p-2 text-black">
        <ol>
          {items.map((stage, i) => (
            <li key={i}>{stage}</li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default KillchainDiagram;

