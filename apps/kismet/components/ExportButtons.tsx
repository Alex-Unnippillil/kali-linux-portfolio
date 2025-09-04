'use client';

import React from 'react';

interface Network {
  ssid: string;
  bssid: string;
  channel: number | null | undefined;
  frames: number;
}

interface ExportButtonsProps {
  data: Network[];
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ data }) => {
  const download = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const header = ['SSID', 'BSSID', 'Channel', 'Frames'];
    const rows = data.map((n) => [
      n.ssid || '(hidden)',
      n.bssid,
      n.channel ?? '',
      n.frames,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    download(csv, 'networks.csv', 'text/csv');
  };

  const exportJSON = () => {
    const json = JSON.stringify(data, null, 2);
    download(json, 'networks.json', 'application/json');
  };

  return (
    <div className="flex space-x-2 mb-2 text-sm">
      <button
        onClick={exportCSV}
        className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
      >
        Export CSV
      </button>
      <button
        onClick={exportJSON}
        className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
      >
        Export JSON
      </button>
    </div>
  );
};

export default ExportButtons;
