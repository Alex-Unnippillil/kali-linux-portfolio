import { useMemo, useState } from "react";

const offsets = [-12,-11,-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14] as const;

const zoneByOffset: Record<number, string> = {
  [-12]: "Etc/GMT+12",
  [-11]: "Pacific/Pago_Pago",
  [-10]: "Pacific/Honolulu",
  [-9]: "America/Anchorage",
  [-8]: "America/Los_Angeles",
  [-7]: "America/Denver",
  [-6]: "America/Chicago",
  [-5]: "America/New_York",
  [-4]: "America/Halifax",
  [-3]: "America/Sao_Paulo",
  [-2]: "Atlantic/South_Georgia",
  [-1]: "Atlantic/Azores",
  [0]: "UTC",
  [1]: "Europe/Berlin",
  [2]: "Europe/Athens",
  [3]: "Europe/Moscow",
  [4]: "Asia/Dubai",
  [5]: "Asia/Karachi",
  [6]: "Asia/Dhaka",
  [7]: "Asia/Bangkok",
  [8]: "Asia/Shanghai",
  [9]: "Asia/Tokyo",
  [10]: "Australia/Sydney",
  [11]: "Pacific/Noumea",
  [12]: "Pacific/Auckland",
  [13]: "Pacific/Tongatapu",
  [14]: "Pacific/Kiritimati",
};

const ALIASES: Record<string, string> = {
  nyc: "America/New_York",
};

const allZones =
  typeof Intl.supportedValuesOf === "function"
    ? (Intl.supportedValuesOf("timeZone") as string[])
    : [];

export default function DateTimeSettings() {
  const [query, setQuery] = useState("");
  const [timeZone, setTimeZone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  const zones = useMemo(() => {
    const lower = query.toLowerCase();
    let matches = allZones.filter((z) => z.toLowerCase().includes(lower));
    const alias = ALIASES[lower];
    if (alias && !matches.includes(alias)) {
      matches = [alias, ...matches];
    }
    return matches;
  }, [query]);

  const selectZone = (z: string) => {
    setTimeZone(z);
  };

  const width = 800;
  const height = 400;
  const regionWidth = width / offsets.length;

  return (
    <div className="p-4 space-y-4 text-ubt-grey">
      <div className="flex justify-center">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-3xl border border-gray-700 bg-ub-cool-grey"
        >
          {/* Simplified world map */}
          <g fill="#d1d5db">
            <path d="M60 100h120v80H60z" />
            <path d="M150 200h80v160h-80z" />
            <path d="M260 80h80v60h-80z" />
            <path d="M260 160h100v140h-100z" />
            <path d="M380 80h200v100H380z" />
            <path d="M520 240h80v60h-80z" />
          </g>
          {offsets.map((offset, idx) => {
            const zone = zoneByOffset[offset];
            return (
              <rect
                key={zone}
                x={idx * regionWidth}
                y={0}
                width={regionWidth}
                height={height}
                fill="transparent"
                className="cursor-pointer hover:fill-white/10"
                onClick={() => selectZone(zone)}
              >
                <title>{zone}</title>
              </rect>
            );
          })}
        </svg>
      </div>
      <div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search time zone"
          className="w-full p-2 rounded bg-ub-cool-grey text-white"
          aria-label="Search time zone"
        />
      </div>
      <div className="overflow-y-auto max-h-64 border border-gray-700 rounded">
        {zones.map((z) => (
          <button
            key={z}
            className={`block w-full text-left px-2 py-1 hover:bg-white/10 ${
              z === timeZone ? "bg-white/20" : ""
            }`}
            onClick={() => selectZone(z)}
          >
            {z}
          </button>
        ))}
      </div>
      <p className="text-center text-sm">Current time zone: {timeZone}</p>
    </div>
  );
}

