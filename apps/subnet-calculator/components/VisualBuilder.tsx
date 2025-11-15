"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type SubnetFamilyKey = "ipv4" | "ipv6";

type QuantityFormatter = (value: bigint) => string;

type IpFormatter = (value: bigint) => string;

type SubnetFamilyConfig = {
  label: string;
  baseAddress: string;
  basePrefix: number;
  minPrefix: number;
  maxPrefix: number;
  initialPrefix: number;
  totalBits: number;
  baseValue: bigint;
  toIp: IpFormatter;
};

type SubnetRow = {
  index: number;
  cidr: string;
  rangeStart: string;
  rangeEnd: string;
  hostsLabel: string;
};

type DiagramBlock = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type DiagramSummary = {
  blocks: DiagramBlock[];
  truncated: boolean;
  remainder: bigint;
  rows: number;
};

const ipv4ToBigInt = (ip: string): bigint => {
  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    throw new Error(`Invalid IPv4 address: ${ip}`);
  }

  return parts.reduce<bigint>((acc, part) => (acc << 8n) + BigInt(part & 0xff), 0n);
};

const bigIntToIPv4 = (value: bigint): string => {
  const parts = [
    Number((value >> 24n) & 0xffn),
    Number((value >> 16n) & 0xffn),
    Number((value >> 8n) & 0xffn),
    Number(value & 0xffn),
  ];
  return parts.join(".");
};

const ipv6ToBigInt = (ip: string): bigint => {
  const normalized = ip.toLowerCase();
  const [headRaw, tailRaw] = normalized.split("::");
  const head = headRaw ? headRaw.split(":").filter(Boolean) : [];
  const tail = tailRaw ? tailRaw.split(":").filter(Boolean) : [];
  const missing = 8 - (head.length + tail.length);
  if (missing < 0) {
    throw new Error(`Invalid IPv6 address: ${ip}`);
  }

  const groups: string[] = [];
  groups.push(...head);
  for (let i = 0; i < missing; i += 1) {
    groups.push("0");
  }
  groups.push(...tail);

  while (groups.length < 8) {
    groups.push("0");
  }

  return groups.reduce<bigint>((acc, group) => {
    const parsed = parseInt(group || "0", 16);
    if (Number.isNaN(parsed)) {
      throw new Error(`Invalid IPv6 group: ${group}`);
    }
    return (acc << 16n) + BigInt(parsed & 0xffff);
  }, 0n);
};

const compressIPv6 = (groups: string[]): string => {
  let bestStart = -1;
  let bestLength = 0;
  let currentStart = -1;

  for (let i = 0; i < groups.length; i += 1) {
    if (groups[i] === "0") {
      if (currentStart === -1) {
        currentStart = i;
      }
    } else if (currentStart !== -1) {
      const length = i - currentStart;
      if (length > bestLength) {
        bestStart = currentStart;
        bestLength = length;
      }
      currentStart = -1;
    }
  }

  if (currentStart !== -1) {
    const length = groups.length - currentStart;
    if (length > bestLength) {
      bestStart = currentStart;
      bestLength = length;
    }
  }

  if (bestLength <= 1) {
    return groups.join(":");
  }

  if (bestLength === groups.length) {
    return "::";
  }

  const compressed: string[] = [];
  for (let i = 0; i < bestStart; i += 1) {
    compressed.push(groups[i]);
  }
  compressed.push("");
  for (let i = bestStart + bestLength; i < groups.length; i += 1) {
    compressed.push(groups[i]);
  }

  if (bestStart === 0) {
    compressed.unshift("");
  }
  if (bestStart + bestLength === groups.length) {
    compressed.push("");
  }

  return compressed.join(":").replace(/:{3,}/g, "::");
};

const bigIntToIPv6 = (value: bigint): string => {
  const groups = new Array(8).fill("0").map((_, index) => {
    const shift = BigInt((7 - index) * 16);
    const part = (value >> shift) & 0xffffn;
    return part.toString(16);
  });

  return compressIPv6(groups);
};

const formatQuantity: QuantityFormatter = (value) => {
  if (value < 0n) {
    return "0";
  }
  if (value < 1000n) {
    return value.toString();
  }
  if (value < 1000000n) {
    return Number(value).toLocaleString();
  }

  const str = value.toString();
  if (str.length === 0) {
    return "0";
  }

  const significant = str.slice(0, 3);
  const mantissa = `${significant[0]}.${significant.slice(1)}`;
  return `${mantissa}e+${str.length - 1}`;
};

const SUBNET_FAMILIES: Record<SubnetFamilyKey, SubnetFamilyConfig> = {
  ipv4: {
    label: "IPv4",
    baseAddress: "10.0.0.0",
    basePrefix: 16,
    minPrefix: 16,
    maxPrefix: 28,
    initialPrefix: 20,
    totalBits: 32,
    baseValue: ipv4ToBigInt("10.0.0.0"),
    toIp: bigIntToIPv4,
  },
  ipv6: {
    label: "IPv6",
    baseAddress: "2001:db8::",
    basePrefix: 48,
    minPrefix: 48,
    maxPrefix: 64,
    initialPrefix: 56,
    totalBits: 128,
    baseValue: ipv6ToBigInt("2001:db8::"),
    toIp: bigIntToIPv6,
  },
};

const TABLE_ROW_LIMIT = 8n;
const DIAGRAM_BLOCK_LIMIT = 16n;

const VisualBuilder: React.FC = () => {
  const [family, setFamily] = useState<SubnetFamilyKey>("ipv4");
  const [prefix, setPrefix] = useState<number>(SUBNET_FAMILIES.ipv4.initialPrefix);
  const [sliderValue, setSliderValue] = useState<number>(SUBNET_FAMILIES.ipv4.initialPrefix);
  const pendingFrame = useRef<number | null>(null);
  const pendingPrefix = useRef<number>(SUBNET_FAMILIES.ipv4.initialPrefix);

  useEffect(() => {
    return () => {
      if (pendingFrame.current !== null && typeof window !== "undefined") {
        window.cancelAnimationFrame(pendingFrame.current);
      }
    };
  }, []);

  useEffect(() => {
    const next = SUBNET_FAMILIES[family].initialPrefix;
    setSliderValue(next);
    setPrefix(next);
    pendingPrefix.current = next;
  }, [family]);

  const schedulePrefixUpdate = (next: number) => {
    pendingPrefix.current = next;

    if (typeof window === "undefined") {
      setPrefix(next);
      return;
    }

    if (pendingFrame.current !== null) {
      return;
    }

    pendingFrame.current = window.requestAnimationFrame(() => {
      pendingFrame.current = null;
      setPrefix(pendingPrefix.current);
    });
  };

  const computation = useMemo(() => {
    const config = SUBNET_FAMILIES[family];
    const totalBits = BigInt(config.totalBits);
    const prefixBig = BigInt(prefix);
    const basePrefix = BigInt(config.basePrefix);
    const diff = prefix - config.basePrefix;
    const subnetCount = diff >= 0 ? 1n << BigInt(diff) : 1n;
    const blockSize = 1n << (totalBits - prefixBig);
    const baseValue = config.baseValue;

    const usableHosts = (() => {
      if (family === "ipv4" && prefix <= 30) {
        const candidate = blockSize - 2n;
        return candidate > 0n ? candidate : 0n;
      }
      return blockSize;
    })();

    const rows: SubnetRow[] = [];
    const limit = subnetCount < TABLE_ROW_LIMIT ? subnetCount : TABLE_ROW_LIMIT;
    for (let i = 0n; i < limit; i += 1n) {
      const start = baseValue + i * blockSize;
      const end = start + blockSize - 1n;
      rows.push({
        index: Number(i),
        cidr: `${config.toIp(start)}/${prefix}`,
        rangeStart: config.toIp(start),
        rangeEnd: config.toIp(end),
        hostsLabel: formatQuantity(usableHosts),
      });
    }

    const diagramBlocks: DiagramBlock[] = [];
    const diagramLimit = subnetCount < DIAGRAM_BLOCK_LIMIT ? subnetCount : DIAGRAM_BLOCK_LIMIT;
    const blockCount = Number(diagramLimit === 0n ? 1n : diagramLimit);
    const columns = blockCount <= 8 ? blockCount : 4;
    const rowsCount = Math.max(1, Math.ceil(blockCount / Math.max(1, columns)));
    const width = columns > 0 ? 100 / columns : 100;
    const height = rowsCount > 0 ? 100 / rowsCount : 100;

    for (let i = 0; i < blockCount; i += 1) {
      const start = baseValue + BigInt(i) * blockSize;
      const label = `${config.toIp(start)}/${prefix}`;
      const rowIndex = Math.floor(i / columns);
      const colIndex = i % columns;
      diagramBlocks.push({
        id: `${family}-${prefix}-${i}`,
        label,
        x: colIndex * width,
        y: rowIndex * height,
        width,
        height,
      });
    }

    const tableTruncated = subnetCount > TABLE_ROW_LIMIT;
    const diagramTruncated = subnetCount > DIAGRAM_BLOCK_LIMIT;

    return {
      config,
      subnetCount,
      usableHosts,
      rows,
      tableTruncated,
      diagram: {
        blocks: diagramBlocks,
        truncated: diagramTruncated,
        remainder: diagramTruncated ? subnetCount - DIAGRAM_BLOCK_LIMIT : 0n,
        rows: rowsCount,
      } as DiagramSummary,
      blockSize,
    };
  }, [family, prefix]);

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    setSliderValue(next);
    schedulePrefixUpdate(next);
  };

  const handleFamilyChange = (key: SubnetFamilyKey) => {
    if (key === family) return;
    setFamily(key);
  };

  const { config, subnetCount, usableHosts, rows, tableTruncated, diagram, blockSize } = computation;

  const prefixDelta = prefix - config.basePrefix;
  const hostBits = config.totalBits - prefix;
  const sliderMin = config.minPrefix;
  const sliderMax = config.maxPrefix;

  return (
    <div className="flex flex-col gap-4" data-testid="visual-builder">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Visual subnet builder</h2>
        <p className="text-sm text-neutral-300">
          Explore how slicing {config.baseAddress}/{config.basePrefix} into smaller networks affects host availability for IPv4 and
          IPv6.
        </p>
      </div>

      <div role="tablist" aria-label="IP version" className="flex gap-2">
        {(Object.keys(SUBNET_FAMILIES) as SubnetFamilyKey[]).map((key) => {
          const active = key === family;
          return (
            <button
              key={key}
              role="tab"
              type="button"
              aria-selected={active}
              data-testid={`family-tab-${key}`}
              className={`rounded-md border px-3 py-1 text-sm font-medium transition-colors ${
                active
                  ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                  : "border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-cyan-400 hover:text-cyan-200"
              }`}
              onClick={() => handleFamilyChange(key)}
            >
              {SUBNET_FAMILIES[key].label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="prefix-slider" className="flex items-center justify-between text-sm font-medium text-neutral-200">
          <span>Prefix length</span>
          <span data-testid="prefix-display" className="text-xs text-neutral-300">
            /{sliderValue} · {formatQuantity(subnetCount)} subnets
          </span>
        </label>
        <input
          id="prefix-slider"
          data-testid="prefix-slider"
          type="range"
          min={sliderMin}
          max={sliderMax}
          step={1}
          value={sliderValue}
          onChange={handleSliderChange}
          className="w-full accent-cyan-400"
          aria-valuemin={sliderMin}
          aria-valuemax={sliderMax}
          aria-valuenow={sliderValue}
        />
        <p className="text-xs text-neutral-400">
          {`Expanding from /${config.basePrefix} to /${sliderValue} adds ${prefixDelta} additional subnet bits and leaves ${hostBits} host bits per network.`}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-neutral-700 bg-neutral-900/60 p-4">
          <header className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-100">Subnet table</h3>
            <span data-testid="table-summary" className="text-xs text-neutral-400">
              {tableTruncated
                ? `Showing ${rows.length} of ${formatQuantity(subnetCount)} subnets`
                : `Showing ${rows.length} subnet${rows.length === 1 ? "" : "s"}`}
            </span>
          </header>
          <table className="w-full table-fixed border-collapse text-left text-xs text-neutral-200">
            <thead>
              <tr className="border-b border-neutral-700 text-neutral-400">
                <th className="py-1 pr-2 font-medium">Subnet</th>
                <th className="py-1 pr-2 font-medium">First address</th>
                <th className="py-1 pr-2 font-medium">Last address</th>
                <th className="py-1 font-medium">Usable hosts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.index} data-testid={`subnet-row-${row.index}`} className="border-b border-neutral-800 last:border-0">
                  <td className="py-1 pr-2 font-medium text-white">{row.cidr}</td>
                  <td className="py-1 pr-2">{row.rangeStart}</td>
                  <td className="py-1 pr-2">{row.rangeEnd}</td>
                  <td className="py-1">{row.hostsLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-neutral-400">
            Each /{sliderValue} subnet spans {formatQuantity(blockSize)} addresses with {formatQuantity(usableHosts)} usable hosts.
          </p>
        </section>

        <section className="rounded-lg border border-neutral-700 bg-neutral-900/60 p-4">
          <header className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-100">Subnet layout</h3>
            {diagram.truncated ? (
              <span data-testid="diagram-summary" className="text-xs text-neutral-400">
                + {formatQuantity(diagram.remainder)} more segments
              </span>
            ) : null}
          </header>
          <div className="relative">
            <svg
              role="img"
              aria-label="Subnet segmentation diagram"
              viewBox={`0 0 100 ${diagram.rows * 25}`}
              className="h-48 w-full text-neutral-200"
            >
              {diagram.blocks.map((block) => (
                <g key={block.id} data-testid="diagram-block">
                  <rect
                    x={block.x + 1}
                    y={block.y + 1}
                    width={block.width - 2}
                    height={block.height - 2}
                    rx={4}
                    className="fill-cyan-500/20 stroke-cyan-400"
                    strokeWidth={0.75}
                  />
                  <text
                    x={block.x + block.width / 2}
                    y={block.y + block.height / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-current text-[10px]"
                  >
                    {block.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </section>
      </div>
    </div>
  );
};

export default VisualBuilder;
