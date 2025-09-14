'use client';

import React, { useState } from 'react';

const KaliBuilder: React.FC = () => {
  const [jobId, setJobId] = useState('');
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/kali-builder/download?id=${encodeURIComponent(jobId)}`);
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.url;
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <input
        className="border p-2"
        placeholder="Job ID"
        value={jobId}
        onChange={(e) => setJobId(e.target.value)}
      />
      <button
        onClick={download}
        disabled={!jobId || downloading}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        Download
      </button>
    </div>
  );
};

export default KaliBuilder;
