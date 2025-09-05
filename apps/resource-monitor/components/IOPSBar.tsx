'use client';

import React, { useEffect, useState } from 'react';

export default function IOPSBar() {
  const [read, setRead] = useState(0);
  const [write, setWrite] = useState(0);

  useEffect(() => {
    const update = () => {
      setRead(Math.floor(Math.random() * 1000));
      setWrite(Math.floor(Math.random() * 1000));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const total = read + write || 1;
  const readPct = (read / total) * 100;
  const writePct = (write / total) * 100;

  return (
    <div className="w-full max-w-sm" title="Read/Write last 10s">
      <div className="flex h-4 w-full bg-gray-700">
        <div
          className="bg-green-500"
          style={{ width: `${readPct}%` }}
        />
        <div
          className="bg-blue-500"
          style={{ width: `${writePct}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-xs text-white">
        <span>Read: {read} IOPS</span>
        <span>Write: {write} IOPS</span>
      </div>
    </div>
  );
}

