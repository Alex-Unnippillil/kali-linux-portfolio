'use client';

import React from 'react';
import capture from '../../../components/apps/kismet/sampleCapture.json';

interface Frame {
  seq: number;
  src: string;
  dst: string;
  type: string;
}

// The capture data is expected to contain at least one entry, but since array
// indexing returns `undefined` when out of bounds (especially under
// `noUncheckedIndexedAccess`), safeguard the `bssid` extraction with optional
// chaining and a fallback.
// Provide a human-friendly fallback when the capture array is empty. Using an
// obviously invalid BSSID makes it easier to spot missing data during
// development while still satisfying TypeScript's strict null checks.
const FALLBACK_BSSID = '00:00:00:00:00:00';
const targetBssid = capture[0]?.bssid ?? FALLBACK_BSSID;

const frames: Frame[] = [
  { seq: 1, src: targetBssid, dst: '11:22:33:44:55:66', type: 'Data' },
  { seq: 2, src: targetBssid, dst: '11:22:33:44:55:66', type: 'Data' },
  { seq: 3, src: targetBssid, dst: 'FF:FF:FF:FF:FF:FF', type: 'Deauth' },
  { seq: 4, src: targetBssid, dst: 'FF:FF:FF:FF:FF:FF', type: 'Deauth' },
  { seq: 5, src: targetBssid, dst: '11:22:33:44:55:66', type: 'Data' },
];

const DeauthWalkthrough: React.FC = () => {
  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-2">Deauthentication Walkthrough</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="pr-2">Seq</th>
            <th className="pr-2">Source</th>
            <th className="pr-2">Destination</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          {frames.map((f) => (
            <tr
              key={f.seq}
              className={`odd:bg-gray-800 ${f.type === 'Deauth' ? 'bg-red-900 text-red-100' : ''}`}
            >
              <td className="pr-2">{f.seq}</td>
              <td className="pr-2">{f.src}</td>
              <td className="pr-2">{f.dst}</td>
              <td>{f.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4">
        Frames 3 and 4 show back-to-back deauthentication messages, a pattern often used to
        forcibly disconnect clients from an access point.
      </p>
      <p className="mt-2">
        For defensive guidance, review the{' '}
        <a
          href="/docs/deauth-mitigation.md"
          className="text-blue-400 underline"
        >
          mitigation notes
        </a>
        .
      </p>
    </div>
  );
};

export default DeauthWalkthrough;

