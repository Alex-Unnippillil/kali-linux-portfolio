'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { List } from 'react-window';
import type { ListImperativeAPI, RowComponentProps } from 'react-window';
import { protocolName } from '../../../components/apps/wireshark/utils';
import FilterHelper from './FilterHelper';
import FilterBuilder, {
  FilterBuilderState,
  FilterCondition,
  createConditionId,
} from './FilterBuilder';
import presets from '../filters/presets.json';
import LayerView from './LayerView';

interface PcapViewerProps {
  showLegend?: boolean;
  initialPackets?: Packet[];
}

const protocolColors: Record<string, string> = {
  TCP: 'bg-blue-900',
  UDP: 'bg-green-900',
  ICMP: 'bg-yellow-800',
};

const samples = [
  { label: 'HTTP', path: '/samples/wireshark/http.pcap' },
  { label: 'DNS', path: '/samples/wireshark/dns.pcap' },
];

const ROW_HEIGHT = 32;
const HEADER_HEIGHT = 32;
const VIEW_STORAGE_KEY = 'wireshark:pcap-views';
const DEFAULT_COLUMNS = ['Time', 'Source', 'Destination', 'Protocol', 'Info'] as const;
const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  Time: 160,
  Source: 200,
  Destination: 200,
  Protocol: 140,
  Info: 360,
};

// Convert bytes to hex dump string
const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (b, i) =>
    `${b.toString(16).padStart(2, '0')}${(i + 1) % 16 === 0 ? '\n' : ' '}`
  ).join('');

export interface Packet {
  timestamp: string;
  src: string;
  dest: string;
  protocol: number;
  info: string;
  data: Uint8Array;
  sport?: number;
  dport?: number;
}

interface Layer {
  name: string;
  fields: Record<string, string>;
}

interface SavedView {
  name: string;
  filter: string;
  builder: FilterBuilderState;
  columns: string[];
  columnWidths: Record<string, number>;
}

interface PacketRowProps {
  columns: string[];
  columnWidths: Record<string, number>;
  columnTemplate: string;
  rows: Packet[];
  onSelect: (index: number) => void;
  selected: number | null;
  listWidth: number;
  onDropColumn: (target: string) => void;
  onDragStartColumn: (column: string) => void;
  onDragEndColumn: () => void;
  onResizeStart: (
    column: string,
    event: React.MouseEvent<HTMLSpanElement> | React.TouchEvent<HTMLSpanElement>
  ) => void;
  onResizeKeyDown: (
    column: string
  ) => (event: React.KeyboardEvent<HTMLSpanElement>) => void;
}

const getColumnWidth = (column: string, widths: Record<string, number>) =>
  widths[column] ?? DEFAULT_COLUMN_WIDTHS[column] ?? 160;

const getColumnValue = (packet: Packet, column: string) => {
  switch (column) {
    case 'Time':
      return packet.timestamp;
    case 'Source':
      return packet.src;
    case 'Destination':
      return packet.dest;
    case 'Protocol':
      return protocolName(packet.protocol);
    case 'Info':
      return packet.info;
    default:
      return '';
  }
};

const matchesCondition = (packet: Packet, condition: FilterCondition) => {
  const value = getColumnValue(packet, condition.column).toLowerCase();
  const target = condition.value.toLowerCase();

  switch (condition.operator) {
    case 'equals':
      return value === target;
    case 'startsWith':
      return value.startsWith(target);
    case 'endsWith':
      return value.endsWith(target);
    case 'notContains':
      return target ? !value.includes(target) : true;
    case 'contains':
    default:
      return value.includes(target);
  }
};

const PacketRow: React.FC<RowComponentProps<PacketRowProps>> = React.memo(
  ({
    index,
    style,
    columns,
    columnWidths,
    columnTemplate,
    rows,
    onSelect,
    selected,
    listWidth,
    onDropColumn,
    onDragStartColumn,
    onDragEndColumn,
    onResizeStart,
    onResizeKeyDown,
  }) => {
    if (index === 0) {
      return (
        <div
          role="row"
          className="sticky top-0 z-10 border-b border-gray-700 bg-gray-800"
          style={{
            ...style,
            width: listWidth,
            display: 'grid',
            gridTemplateColumns: columnTemplate,
            alignItems: 'center',
          }}
        >
          {columns.map((col) => {
            const width = getColumnWidth(col, columnWidths);
            return (
              <div
                key={col}
                role="columnheader"
                draggable
                onDragStart={() => onDragStartColumn(col)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDropColumn(col)}
                onDragEnd={onDragEndColumn}
                className="relative flex items-center font-semibold text-left px-1 py-1 select-none"
                style={{ width, minWidth: width }}
              >
                <span className="truncate">{col}</span>
                <span
                  role="separator"
                  aria-orientation="vertical"
                  aria-label={`Resize ${col}`}
                  tabIndex={0}
                  onMouseDown={(event) => onResizeStart(col, event)}
                  onTouchStart={(event) => onResizeStart(col, event)}
                  onKeyDown={onResizeKeyDown(col)}
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-500/50"
                />
              </div>
            );
          })}
        </div>
      );
    }

    const rowIndex = index - 1;
    const packet = rows[rowIndex];
    if (!packet) return null;

    const protocolLabel = protocolName(packet.protocol);
    const backgroundClass =
      protocolColors[protocolLabel.toUpperCase()] || protocolColors[protocolLabel] || '';

    return (
      <div
        role="row"
        data-testid="packet-row"
        data-index={rowIndex}
        onClick={() => onSelect(rowIndex)}
        className={`border-b border-gray-800 cursor-pointer px-1 ${backgroundClass} ${
          selected === rowIndex ? 'ring-2 ring-white' : 'hover:bg-gray-700'
        }`}
        style={{
          ...style,
          width: listWidth,
          display: 'grid',
          gridTemplateColumns: columnTemplate,
          alignItems: 'center',
        }}
      >
        {columns.map((col) => {
          const width = getColumnWidth(col, columnWidths);
          return (
            <div
              key={col}
              role="gridcell"
              className="truncate pr-2"
              style={{ width, minWidth: width }}
            >
              {getColumnValue(packet, col)}
            </div>
          );
        })}
      </div>
    );
  }
);
PacketRow.displayName = 'PacketRow';

// Basic Ethernet + IPv4 parser
const parseEthernetIpv4 = (data: Uint8Array) => {
  if (data.length < 34) return { src: '', dest: '', protocol: 0, info: '' };
  const etherType = (data[12] << 8) | data[13];
  if (etherType !== 0x0800) return { src: '', dest: '', protocol: 0, info: '' };
  const protocol = data[23];
  const src = Array.from(data.slice(26, 30)).join('.');
  const dest = Array.from(data.slice(30, 34)).join('.');
  let info = '';
  if (protocol === 6 && data.length >= 54) {
    const sport = (data[34] << 8) | data[35];
    const dport = (data[36] << 8) | data[37];
    info = `TCP ${sport} → ${dport}`;
    return { src, dest, protocol, info, sport, dport };
  }
  if (protocol === 17 && data.length >= 42) {
    const sport = (data[34] << 8) | data[35];
    const dport = (data[36] << 8) | data[37];
    info = `UDP ${sport} → ${dport}`;
    return { src, dest, protocol, info, sport, dport };
  }
  return { src, dest, protocol, info };
};

// Parse classic pcap format
const parsePcap = (buf: ArrayBuffer): Packet[] => {
  const view = new DataView(buf);
  const magic = view.getUint32(0, false);
  let little: boolean;
  if (magic === 0xa1b2c3d4) little = false;
  else if (magic === 0xd4c3b2a1) little = true;
  else throw new Error('Unsupported pcap format');
  let offset = 24;
  const packets: Packet[] = [];
  while (offset + 16 <= view.byteLength) {
    const tsSec = view.getUint32(offset, little);
    const tsUsec = view.getUint32(offset + 4, little);
    const capLen = view.getUint32(offset + 8, little);
    const origLen = view.getUint32(offset + 12, little);
    offset += 16;
    if (offset + capLen > view.byteLength) break;
    const data = new Uint8Array(buf.slice(offset, offset + capLen));
    const meta: any = parseEthernetIpv4(data);
    packets.push({
      timestamp: `${tsSec}.${tsUsec.toString().padStart(6, '0')}`,
      src: meta.src,
      dest: meta.dest,
      protocol: meta.protocol,
      info: meta.info || `len=${origLen}`,
      sport: meta.sport,
      dport: meta.dport,
      data,
    });
    offset += capLen;
  }
  return packets;
};

// Parse PCAP-NG files including section and interface blocks
const parsePcapNg = (buf: ArrayBuffer): Packet[] => {
  const view = new DataView(buf);
  let offset = 0;
  let little = true;
  const ifaces: { tsres: number }[] = [];
  const packets: Packet[] = [];

  while (offset + 8 <= view.byteLength) {
    let blockType = view.getUint32(offset, little);
    let blockLen = view.getUint32(offset + 4, little);

    if (blockType === 0x0a0d0d0a) {
      const bom = view.getUint32(offset + 8, true);
      if (bom === 0x1a2b3c4d) little = true;
      else if (bom === 0x4d3c2b1a) little = false;
      blockLen = view.getUint32(offset + 4, little);
    } else if (blockType === 0x00000001) {
      let tsres = 1e-6;
      let optOffset = offset + 20;
      while (optOffset + 4 <= offset + blockLen - 4) {
        const optCode = view.getUint16(optOffset, little);
        const optLen = view.getUint16(optOffset + 2, little);
        optOffset += 4;
        if (optCode === 9 && optLen === 1) {
          const val = view.getUint8(optOffset);
          tsres = val & 0x80 ? 2 ** -(val & 0x7f) : 10 ** -val;
        }
        optOffset += optLen;
        optOffset = (optOffset + 3) & ~3;
        if (optCode === 0) break;
      }
      ifaces.push({ tsres });
    } else if (blockType === 0x00000006) {
      const ifaceId = view.getUint32(offset + 8, little);
      const tsHigh = view.getUint32(offset + 12, little);
      const tsLow = view.getUint32(offset + 16, little);
      const capLen = view.getUint32(offset + 20, little);
      const dataStart = offset + 28;
      const data = new Uint8Array(buf.slice(dataStart, dataStart + capLen));
      const meta: any = parseEthernetIpv4(data);
      const res = ifaces[ifaceId]?.tsres ?? 1e-6;
      const timestamp = ((tsHigh * 2 ** 32 + tsLow) * res).toFixed(6);
      packets.push({
        timestamp,
        src: meta.src,
        dest: meta.dest,
        protocol: meta.protocol,
        info: meta.info || `len=${capLen}`,
        sport: meta.sport,
        dport: meta.dport,
        data,
      });
    }

    offset += blockLen;
  }

  return packets;
};

const parseWithWasm = async (buf: ArrayBuffer): Promise<Packet[]> => {
  try {
    // Attempt to load wasm parser; fall back to JS parsing
    await WebAssembly.instantiateStreaming(
      fetch('https://unpkg.com/pcap.js@latest/pcap.wasm'),
      {}
    );
  } catch {
    // Ignore errors and use JS parser
  }
  const magic = new DataView(buf).getUint32(0, false);
  return magic === 0x0a0d0d0a ? parsePcapNg(buf) : parsePcap(buf);
};

const decodePacketLayers = (pkt: Packet): Layer[] => {
  const data = pkt.data;
  const layers: Layer[] = [];
  if (data.length >= 14) {
    const destMac = Array.from(data.slice(0, 6))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(':');
    const srcMac = Array.from(data.slice(6, 12))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(':');
    const type = ((data[12] << 8) | data[13]).toString(16).padStart(4, '0');
    layers.push({
      name: 'Ethernet',
      fields: {
        Destination: destMac,
        Source: srcMac,
        Type: `0x${type}`,
      },
    });
  }
  if (data.length >= 34) {
    const srcIp = Array.from(data.slice(26, 30)).join('.');
    const destIp = Array.from(data.slice(30, 34)).join('.');
    const proto = data[23];
    layers.push({
      name: 'IPv4',
      fields: {
        Source: srcIp,
        Destination: destIp,
        Protocol: protocolName(proto),
      },
    });
    if (proto === 6 && data.length >= 54) {
      const sport = (data[34] << 8) | data[35];
      const dport = (data[36] << 8) | data[37];
      layers.push({
        name: 'TCP',
        fields: {
          'Source Port': sport.toString(),
          'Destination Port': dport.toString(),
        },
      });
    } else if (proto === 17 && data.length >= 42) {
      const sport = (data[34] << 8) | data[35];
      const dport = (data[36] << 8) | data[37];
      layers.push({
        name: 'UDP',
        fields: {
          'Source Port': sport.toString(),
          'Destination Port': dport.toString(),
        },
      });
    }
  }
  return layers;
};

const emptyBuilder: FilterBuilderState = { mode: 'all', conditions: [] };

const PcapViewer: React.FC<PcapViewerProps> = ({
  showLegend = true,
  initialPackets = [],
}) => {
  const [packets, setPackets] = useState<Packet[]>(() => initialPackets);
  const [filter, setFilter] = useState('');
  const [builder, setBuilder] = useState<FilterBuilderState>(emptyBuilder);
  const [selected, setSelected] = useState<number | null>(null);
  const [columns, setColumns] = useState<string[]>(() => [...DEFAULT_COLUMNS]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const widths: Record<string, number> = {};
    DEFAULT_COLUMNS.forEach((column) => {
      widths[column] = DEFAULT_COLUMN_WIDTHS[column];
    });
    return widths;
  });
  const [dragCol, setDragCol] = useState<string | null>(null);
  const [resizing, setResizing] = useState<{
    column: string;
    startX: number;
    startWidth: number;
  } | null>(null);
  const [views, setViews] = useState<SavedView[]>([]);
  const [activeView, setActiveView] = useState<string | null>(null);
  const [viewName, setViewName] = useState('');
  const listRef = useRef<ListImperativeAPI | null>(null);

  useEffect(() => {
    if (!initialPackets || initialPackets.length === 0) return;
    setPackets(initialPackets);
    setSelected(null);
  }, [initialPackets]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
        navigator.clipboard.writeText(filter);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filter]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const f = params.get('filter');
    if (f) setFilter(f);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (filter) url.searchParams.set('filter', filter);
    else url.searchParams.delete('filter');
    window.history.replaceState(null, '', url.toString());
  }, [filter]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (!raw) return;
      const parsed: SavedView[] = JSON.parse(raw);
      const normalized = parsed.map((view) => ({
        name: view.name,
        filter: view.filter ?? '',
        columns:
          view.columns && view.columns.length > 0
            ? [...view.columns]
            : [...DEFAULT_COLUMNS],
        columnWidths: {
          ...DEFAULT_COLUMN_WIDTHS,
          ...(view.columnWidths ?? {}),
        },
        builder: {
          mode: view.builder?.mode === 'any' ? 'any' : 'all',
          conditions: (view.builder?.conditions ?? []).map((condition) => ({
            id: condition.id ?? createConditionId(),
            column: condition.column ?? 'Source',
            operator: condition.operator ?? 'contains',
            value: condition.value ?? '',
          })),
        },
      }));
      setViews(normalized);
    } catch {
      // ignore bad data
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const serializable = views.map((view) => ({
        ...view,
        columns: [...view.columns],
        columnWidths: { ...view.columnWidths },
        builder: {
          mode: view.builder.mode,
          conditions: view.builder.conditions.map(({ id, column, operator, value }) => ({
            id,
            column,
            operator,
            value,
          })),
        },
      }));
      window.localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(serializable));
    } catch {
      // ignore write errors
    }
  }, [views]);

  useEffect(() => {
    if (!resizing) return;

    const handleMove = (event: MouseEvent | TouchEvent) => {
      const clientX =
        event instanceof TouchEvent
          ? event.touches[0]?.clientX ?? resizing.startX
          : event.clientX;
      const delta = clientX - resizing.startX;
      setColumnWidths((prev) => {
        const base = getColumnWidth(resizing.column, prev);
        const nextWidth = Math.max(100, resizing.startWidth + delta);
        if (base === nextWidth) return prev;
        return { ...prev, [resizing.column]: nextWidth };
      });
      if (event instanceof TouchEvent) {
        event.preventDefault();
      }
    };

    const stop = () => setResizing(null);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', stop);
    document.body.style.cursor = 'col-resize';

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', stop);
      document.body.style.cursor = '';
    };
  }, [resizing]);

  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase();
    return packets.filter((packet) => {
      const quickMatch =
        !term ||
        [
          packet.timestamp,
          packet.src,
          packet.dest,
          protocolName(packet.protocol),
          packet.info ?? '',
          packet.sport?.toString() ?? '',
          packet.dport?.toString() ?? '',
        ].some((value) => value.toLowerCase().includes(term));

      if (!quickMatch) return false;
      if (builder.conditions.length === 0) return true;
      return builder.mode === 'all'
        ? builder.conditions.every((condition) => matchesCondition(packet, condition))
        : builder.conditions.some((condition) => matchesCondition(packet, condition));
    });
  }, [packets, filter, builder]);

  useEffect(() => {
    if (selected !== null && selected >= filtered.length) {
      setSelected(filtered.length ? filtered.length - 1 : null);
    }
  }, [filtered.length, selected]);

  useEffect(() => {
    setSelected(null);
    if (filtered.length > 0) {
      listRef.current?.scrollToRow({ index: 0, align: 'start' });
    }
  }, [filter, builder, filtered.length]);

  const columnTemplate = useMemo(
    () => columns.map((col) => `${getColumnWidth(col, columnWidths)}px`).join(' '),
    [columns, columnWidths]
  );

  const totalWidth = useMemo(
    () => columns.reduce((acc, col) => acc + getColumnWidth(col, columnWidths), 0),
    [columns, columnWidths]
  );

  const beginResize = useCallback(
    (
      column: string,
      event: React.MouseEvent<HTMLSpanElement> | React.TouchEvent<HTMLSpanElement>
    ) => {
      event.preventDefault();
      event.stopPropagation();
      const clientX =
        'touches' in event ? event.touches[0]?.clientX ?? 0 : event.clientX;
      setResizing({
        column,
        startX: clientX,
        startWidth: getColumnWidth(column, columnWidths),
      });
    },
    [columnWidths]
  );

  const handleResizeKeyDown = useCallback(
    (column: string) => (event: React.KeyboardEvent<HTMLSpanElement>) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const delta = event.key === 'ArrowLeft' ? -10 : 10;
        setColumnWidths((prev) => {
          const base = getColumnWidth(column, prev);
          const next = Math.max(100, base + delta);
          if (next === base) return prev;
          return { ...prev, [column]: next };
        });
      }
    },
    []
  );

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const pkts = await parseWithWasm(buf);
    setPackets(pkts);
    setSelected(null);
  };

  const handleSample = async (path: string) => {
    const res = await fetch(path);
    const buf = await res.arrayBuffer();
    const pkts = await parseWithWasm(buf);
    setPackets(pkts);
    setSelected(null);
  };

  const handleSaveView = () => {
    const name = viewName.trim() || activeView?.trim();
    if (!name) return;
    const view: SavedView = {
      name,
      filter,
      columns: [...columns],
      columnWidths: { ...columnWidths },
      builder: {
        mode: builder.mode,
        conditions: builder.conditions.map((condition) => ({ ...condition })),
      },
    };
    setViews((prev) => {
      const filteredPrev = prev.filter((existing) => existing.name !== name);
      const next = [...filteredPrev, view].sort((a, b) => a.name.localeCompare(b.name));
      return next;
    });
    setActiveView(name);
    setViewName('');
  };

  const handleSelectView = (name: string) => {
    if (!name) {
      setActiveView(null);
      setViewName('');
      return;
    }
    const view = views.find((v) => v.name === name);
    if (!view) return;
    setFilter(view.filter);
    setColumns(view.columns.length ? [...view.columns] : [...DEFAULT_COLUMNS]);
    setColumnWidths({
      ...DEFAULT_COLUMN_WIDTHS,
      ...view.columnWidths,
    });
    setBuilder({
      mode: view.builder.mode,
      conditions: view.builder.conditions.map((condition) => ({ ...condition })),
    });
    setActiveView(view.name);
    setViewName(view.name);
    setSelected(null);
    listRef.current?.scrollToRow({ index: 0, align: 'start' });
  };

  const handleDeleteView = () => {
    if (!activeView) return;
    setViews((prev) => prev.filter((view) => view.name !== activeView));
    setActiveView(null);
    setViewName('');
  };

  const handleDragStartColumn = useCallback((column: string) => {
    setDragCol(column);
  }, []);

  const handleDragEndColumn = useCallback(() => {
    setDragCol(null);
  }, []);

  const handleDropColumn = useCallback(
    (target: string) => {
      if (!dragCol || dragCol === target) return;
      setColumns((prev) => {
        const updated = [...prev];
        const from = updated.indexOf(dragCol);
        const to = updated.indexOf(target);
        if (from === -1 || to === -1) return prev;
        updated.splice(from, 1);
        updated.splice(to, 0, dragCol);
        return updated;
      });
      setDragCol(null);
    },
    [dragCol]
  );

  const baseRowProps = useMemo(
    () => ({
      columns,
      columnWidths,
      columnTemplate,
      rows: filtered,
      onSelect: setSelected,
      selected,
      onDropColumn: handleDropColumn,
      onDragStartColumn: handleDragStartColumn,
      onDragEndColumn: handleDragEndColumn,
      onResizeStart: beginResize,
      onResizeKeyDown: handleResizeKeyDown,
    }),
    [
      columns,
      columnWidths,
      columnTemplate,
      filtered,
      selected,
      handleDropColumn,
      handleDragStartColumn,
      handleDragEndColumn,
      beginResize,
      handleResizeKeyDown,
    ]
  );

  const selectedPacket = selected !== null ? filtered[selected] : null;

  return (
    <div className="p-4 text-white bg-ub-cool-grey h-full w-full flex flex-col space-y-2">
      <div className="flex items-center space-x-2">
        <input
          type="file"
          accept=".pcap,.pcapng"
          onChange={handleFile}
          className="text-sm"
          aria-label="Open capture file"
        />
        <select
          onChange={(e) => {
            if (e.target.value) handleSample(e.target.value);
            e.target.value = '';
          }}
          className="text-sm bg-gray-700 text-white rounded"
        >
          <option value="">Open sample</option>
          {samples.map(({ label, path }) => (
            <option key={path} value={path}>
              {label}
            </option>
          ))}
        </select>
        <a
          href="https://wiki.wireshark.org/SampleCaptures"
          target="_blank"
          rel="noreferrer"
          className="text-xs underline"
        >
          Sample sources
        </a>
      </div>
      {packets.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <FilterHelper value={filter} onChange={setFilter} />
            <button
              onClick={() => navigator.clipboard.writeText(filter)}
              className="px-2 py-1 bg-gray-700 rounded text-xs"
              type="button"
              title="Copy display filter (Ctrl+Shift+C)"
            >
              Copy
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {presets.map(({ label, expression }) => (
              <button
                key={expression}
                onClick={() => setFilter(expression)}
                className={`w-4 h-4 rounded ${
                  protocolColors[label.toUpperCase()] || 'bg-gray-500'
                }`}
                title={label}
                aria-label={label}
                type="button"
              />
            ))}
          </div>

          {showLegend && (
            <div className="flex space-x-4 text-xs">
              {Object.entries(protocolColors).map(([proto, color]) => (
                <div key={proto} className="flex items-center space-x-1">
                  <span className={`w-3 h-3 inline-block ${color}`}></span>
                  <span>{proto}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-end gap-3 text-xs bg-gray-900 border border-gray-700 rounded p-3">
            <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide">
              View name
              <input
                aria-label="View name"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                placeholder="View name"
                className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-xs"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide">
              Saved views
              <select
                aria-label="Saved views"
                value={activeView ?? ''}
                onChange={(e) => handleSelectView(e.target.value)}
                className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-xs"
              >
                <option value="">Select view...</option>
                {views.map((view) => (
                  <option key={view.name} value={view.name}>
                    {view.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveView}
                className="px-3 py-1 bg-blue-600 rounded text-xs"
              >
                Save view
              </button>
              <button
                type="button"
                onClick={handleDeleteView}
                disabled={!activeView}
                className="px-3 py-1 bg-gray-700 rounded text-xs disabled:opacity-50"
              >
                Delete view
              </button>
            </div>
            <span className="text-[10px] text-gray-400 ml-auto">
              Views are stored locally in your browser.
            </span>
          </div>

          <FilterBuilder
            value={builder}
            onChange={setBuilder}
            columns={columns}
          />

          <div className="flex flex-1 overflow-hidden space-x-2 min-h-0">
            <div
              className="flex-1 min-h-0 border border-gray-700 rounded bg-[var(--kali-panel)]"
              role="grid"
              aria-label="Captured packets"
            >
              {filtered.length === 0 ? (
                <div className="p-4 text-sm text-gray-400">
                  No packets match the current filters.
                </div>
              ) : (
                <AutoSizer>
                  {({ height, width }) => {
                    const listWidth = Math.max(width, totalWidth);
                    const rowProps: PacketRowProps = {
                      ...baseRowProps,
                      listWidth,
                    };

                    return (
                      <List
                        className="focus:outline-none text-xs font-mono text-white"
                        defaultHeight={height}
                        listRef={listRef}
                        rowComponent={PacketRow}
                        rowCount={filtered.length + 1}
                        rowHeight={(index) => (index === 0 ? HEADER_HEIGHT : ROW_HEIGHT)}
                        rowProps={rowProps}
                        overscanCount={6}
                        style={{ height, width: listWidth }}
                      />
                    );
                  }}
                </AutoSizer>
              )}
            </div>
            <div className="flex-1 bg-black overflow-auto p-2 text-xs font-mono space-y-1">
              {selectedPacket ? (
                <>
                  {decodePacketLayers(selectedPacket).map((layer, i) => (
                    <LayerView key={i} name={layer.name} fields={layer.fields} />
                  ))}
                  <pre className="text-green-400">{toHex(selectedPacket.data)}</pre>
                </>
              ) : filtered.length === 0 ? (
                'No packets match the current filters.'
              ) : (
                'Select a packet'
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PcapViewer;
export type { FilterBuilderState, FilterCondition } from './FilterBuilder';
