"use client";

import React, { useState } from "react";
import ProgressBar from "../ui/ProgressBar";
import Modal from "../base/Modal";

type Mirror = {
  location: string;
  latency: number;
};

const randomLatency = () => Math.floor(Math.random() * 200) + 20;

export default function KaliMirrors() {
  const [mirrors] = useState<Mirror[]>(() => [
    { location: "United States", latency: randomLatency() },
    { location: "Germany", latency: randomLatency() },
    { location: "India", latency: randomLatency() },
    { location: "Singapore", latency: randomLatency() },
    { location: "Brazil", latency: randomLatency() },
  ]);

  const [showInfo, setShowInfo] = useState(false);

  const maxLatency = Math.max(...mirrors.map((m) => m.latency));

  return (
    <div className="p-4 space-y-2 text-white">
      <ul className="space-y-2">
        {mirrors.map((mirror) => {
          const percent = ((maxLatency - mirror.latency) / maxLatency) * 100;
          return (
            <li key={mirror.location}>
              <button
                type="button"
                className="flex items-center gap-2 w-full text-left focus:outline-none"
                onClick={() => setShowInfo(true)}
              >
                <span className="w-32">{mirror.location}</span>
                <ProgressBar progress={percent} />
                <span className="text-xs text-ubt-grey">
                  {mirror.latency} ms
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <Modal isOpen={showInfo} onClose={() => setShowInfo(false)}>
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-ub-cool-grey p-4 rounded text-white max-w-sm">
            <h2 className="text-lg font-bold mb-2">Mirror selection</h2>
            <p className="text-sm text-ubt-grey">
              Kali Linux chooses a download mirror based on your location and
              network response time to deliver the fastest downloads. The values
              shown here are randomly generated for demonstration.
            </p>
            <button
              type="button"
              onClick={() => setShowInfo(false)}
              className="mt-4 px-3 py-1 bg-blue-600 rounded"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

