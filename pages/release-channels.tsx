import { useState } from "react";

const channels = [
  { label: "kali-rolling", value: "kali-rolling" },
  { label: "kali-last-snapshot", value: "kali-last-snapshot" },
  { label: "kali-dev", value: "kali-dev" },
];

export default function ReleaseChannelsPage() {
  const [channel, setChannel] = useState("kali-rolling");

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Kali Release Channels</h1>
      <p>
        The <code>kali-rolling</code> branch is the default branch and receives
        the most frequent updates.
      </p>
      <label htmlFor="channel-select" className="block font-semibold">
        Simulated channel selector
      </label>
      <select
        id="channel-select"
        className="border p-2"
        value={channel}
        onChange={(e) => setChannel(e.target.value)}
      >
        {channels.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <svg width="400" height="120" className="border">
        <line x1="20" y1="40" x2="380" y2="40" stroke="red" strokeWidth="4" />
        <text x="200" y="30" textAnchor="middle" fill="red">
          kali-rolling
        </text>
        <line
          x1="20"
          y1="80"
          x2="380"
          y2="80"
          stroke="gray"
          strokeWidth="4"
          strokeDasharray="4"
        />
        <text x="200" y="100" textAnchor="middle" fill="gray">
          other channels
        </text>
      </svg>
    </div>
  );
}
