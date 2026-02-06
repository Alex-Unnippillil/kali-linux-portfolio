import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type CharsetDefinition = {
  id: string;
  label: string;
  size: number;
};

type HoveredCell = {
  row: number;
  col: number;
};

type KeyspaceHeatmapProps = {
  mask?: string;
  onMaskChange?: (value: string) => void;
  charsets?: CharsetDefinition[];
  onCharsetsChange?: (next: CharsetDefinition[]) => void;
  className?: string;
  cellSize?: number;
};

const parseMask = (mask: string): string[] => {
  if (!mask) return [];
  const tokens: string[] = [];
  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i] === '?' && i < mask.length - 1) {
      tokens.push(mask.slice(i, i + 2));
      i += 1;
    } else {
      tokens.push(mask[i]);
    }
  }
  return tokens;
};

const formatCount = (value: number): string => {
  if (value < 1_000) return value.toLocaleString();
  if (value < 1_000_000) return `${(value / 1_000).toFixed(2)}K`;
  if (value < 1_000_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value < 1_000_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  return `${(value / 1_000_000_000_000).toFixed(2)}T`;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

export const DEFAULT_CHARSETS: CharsetDefinition[] = [
  { id: '?l', label: 'Lowercase (?l)', size: 26 },
  { id: '?u', label: 'Uppercase (?u)', size: 26 },
  { id: '?d', label: 'Digits (?d)', size: 10 },
  { id: '?s', label: 'Symbols (?s)', size: 33 },
  { id: '?a', label: 'Printable (?a)', size: 95 },
];

const buildCharsetMap = (sets: CharsetDefinition[]) => {
  const map = new Map<string, number>();
  sets.forEach((set) => {
    map.set(set.id, set.size);
  });
  return map;
};

const KeyspaceHeatmap: React.FC<KeyspaceHeatmapProps> = ({
  mask = '',
  onMaskChange,
  charsets,
  onCharsetsChange,
  className,
  cellSize = 32,
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const isMaskControlled = typeof onMaskChange === 'function';
  const isCharsetControlled = typeof onCharsetsChange === 'function';
  const [internalMask, setInternalMask] = useState(mask);
  const [internalCharsets, setInternalCharsets] = useState<CharsetDefinition[]>(
    () => charsets ?? DEFAULT_CHARSETS
  );

  useEffect(() => {
    if (!isMaskControlled) {
      setInternalMask(mask);
    }
  }, [mask, isMaskControlled]);

  useEffect(() => {
    if (!isCharsetControlled && charsets) {
      setInternalCharsets(charsets);
    }
  }, [charsets, isCharsetControlled]);

  const maskValue = isMaskControlled ? mask : internalMask;
  const charsetList = isCharsetControlled
    ? charsets ?? DEFAULT_CHARSETS
    : internalCharsets;

  const setMaskValue = (value: string) => {
    if (onMaskChange) {
      onMaskChange(value);
    }
    if (!isMaskControlled) {
      setInternalMask(value);
    }
  };

  const setCharsetList = (value: CharsetDefinition[]) => {
    if (onCharsetsChange) {
      onCharsetsChange(value);
    }
    if (!isCharsetControlled) {
      setInternalCharsets(value);
    }
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawRef = useRef<number | null>(null);
  const dprRef = useRef(1);
  const progressRef = useRef(0);
  const [hoveredCell, setHoveredCell] = useState<HoveredCell | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const tokens = useMemo(() => {
    const parsed = parseMask(maskValue);
    if (parsed.length > 0) return parsed;
    return ['?l'];
  }, [maskValue]);

  const charsetMap = useMemo(() => buildCharsetMap(charsetList), [
    charsetList,
  ]);

  const positionProduct = useMemo(() => {
    return tokens.map((_, index) => {
      return tokens.reduce((acc, token, tokenIndex) => {
        if (tokenIndex === index) return acc;
        const size = charsetMap.get(token) ?? 1;
        return acc * clamp(size, 1, Number.MAX_SAFE_INTEGER);
      }, 1);
    });
  }, [tokens, charsetMap]);

  const counts = useMemo(() => {
    return charsetList.map((charset) =>
      tokens.map((_, index) =>
        clamp(
          charset.size * positionProduct[index],
          0,
          Number.MAX_SAFE_INTEGER
        )
      )
    );
  }, [charsetList, tokens, positionProduct]);

  const maxCount = useMemo(() => {
    let max = 0;
    counts.forEach((row) => {
      row.forEach((value) => {
        if (value > max) max = value;
      });
    });
    return max || 1;
  }, [counts]);

  const highlightRows = useMemo(() => {
    const map = new Map<string, number>();
    charsetList.forEach((set, index) => map.set(set.id, index));
    return tokens.map((token) => map.get(token));
  }, [charsetList, tokens]);

  const positionCount = tokens.length;
  const rowCount = charsetList.length;
  const width = Math.max(positionCount * cellSize, cellSize);
  const height = Math.max(rowCount * cellSize, cellSize);

  const drawHeatmap = useCallback(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;
    const dpr = dprRef.current;
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.scale(dpr, dpr);

    const totalCells = Math.max(positionCount * rowCount, 1);
    const progressedCells = clamp(progressRef.current, 0, totalCells);

    for (let row = 0; row < rowCount; row += 1) {
      for (let col = 0; col < positionCount; col += 1) {
        const value = counts[row][col];
        const ratio = Math.log(value + 1) / Math.log(maxCount + 1);
        const hue = 220 - ratio * 160;
        const lightness = 20 + ratio * 40;
        context.fillStyle = `hsl(${hue}, 70%, ${lightness}%)`;
        context.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);

        const cellIndex = row * positionCount + col;
        if (cellIndex < progressedCells) {
          context.fillStyle = 'rgba(14, 165, 233, 0.35)';
          context.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }

    highlightRows.forEach((rowIndex, colIndex) => {
      if (rowIndex == null) return;
      context.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      context.lineWidth = 2;
      context.strokeRect(
        colIndex * cellSize + 1,
        rowIndex * cellSize + 1,
        cellSize - 2,
        cellSize - 2
      );
    });

    if (hoveredCell) {
      context.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      context.lineWidth = 2;
      context.strokeRect(
        hoveredCell.col * cellSize + 0.5,
        hoveredCell.row * cellSize + 0.5,
        cellSize - 1,
        cellSize - 1
      );
    }

    context.restore();
  }, [
    counts,
    maxCount,
    positionCount,
    rowCount,
    cellSize,
    highlightRows,
    hoveredCell,
  ]);

  const scheduleDraw = useCallback(() => {
    if (drawRef.current != null) {
      cancelAnimationFrame(drawRef.current);
    }
    drawRef.current = requestAnimationFrame(() => {
      drawRef.current = null;
      drawHeatmap();
    });
  }, [drawHeatmap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr =
      typeof window !== 'undefined' && window.devicePixelRatio
        ? window.devicePixelRatio
        : 1;
    dprRef.current = dpr;
    canvas.width = Math.max(width * dpr, 1);
    canvas.height = Math.max(height * dpr, 1);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    contextRef.current = canvas.getContext('2d');
    scheduleDraw();
  }, [width, height, scheduleDraw]);

  useEffect(() => {
    scheduleDraw();
  }, [scheduleDraw]);

  useEffect(() => {
    progressRef.current = 0;
    const totalCells = Math.max(positionCount * rowCount, 1);
    if (prefersReducedMotion) {
      progressRef.current = totalCells;
      scheduleDraw();
      return;
    }
    let frame: number;
    const step = () => {
      const increment = Math.max(Math.floor(totalCells / 180), 1);
      progressRef.current = (progressRef.current + increment) % (totalCells + 1);
      scheduleDraw();
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [positionCount, rowCount, prefersReducedMotion, scheduleDraw]);

  useEffect(() => {
    return () => {
      if (drawRef.current != null) {
        cancelAnimationFrame(drawRef.current);
      }
    };
  }, []);

  const handleMaskChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMaskValue(event.target.value);
  };

  const handleSizeChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const nextSize = clamp(Number(event.target.value) || 0, 1, 10_000);
    const next = charsetList.map((set, idx) =>
      idx === index ? { ...set, size: nextSize } : set
    );
    setCharsetList(next);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    if (col < 0 || col >= positionCount || row < 0 || row >= rowCount) {
      setHoveredCell(null);
      return;
    }
    setHoveredCell({ row, col });
    setTooltipPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
  };

  const tooltipData = useMemo(() => {
    if (!hoveredCell) return null;
    const charset = charsetList[hoveredCell.row];
    const value = counts[hoveredCell.row]?.[hoveredCell.col] ?? 0;
    return {
      charset: charset?.label ?? 'Unknown set',
      token: tokens[hoveredCell.col],
      value,
    };
  }, [hoveredCell, counts, charsetList, tokens]);

  return (
    <div
      className={
        className ??
        'w-full bg-black/40 border border-white/10 rounded-lg p-4 space-y-4'
      }
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="heatmap-mask-input" className="text-sm font-semibold">
          Mask
        </label>
        <input
          id="heatmap-mask-input"
          type="text"
          className="px-2 py-1 text-black rounded"
          value={maskValue}
          onChange={handleMaskChange}
          aria-label="Mask"
          placeholder="e.g. ?l?l?d"
        />
        <p className="text-xs text-gray-300">
          Adjust the mask to see how each position interacts with the configured
          character sets.
        </p>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-semibold">Charset sizes</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {charsetList.map((set, index) => (
            <label key={set.id} className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-gray-200">{set.label}</span>
              <input
                type="number"
                min={1}
                max={10000}
                className="px-2 py-1 text-black rounded"
                value={set.size}
                onChange={(event) => handleSizeChange(event, index)}
                aria-label={`${set.label} size`}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="relative border border-white/10 rounded overflow-auto">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Mask position to charset heatmap"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          tabIndex={0}
        />
        {tooltipData && (
          <div
            className="pointer-events-none absolute z-10 bg-black/80 text-xs text-white px-2 py-1 rounded shadow-lg"
            style={{
              left: clamp(tooltipPosition.x + 12, 0, width - 120),
              top: clamp(tooltipPosition.y + 12, 0, height - 60),
            }}
            role="status"
            aria-live="polite"
          >
            <div>
              Position {hoveredCell.col + 1} • {tooltipData.token || 'literal'}
            </div>
            <div>{tooltipData.charset}</div>
            <div>Combinations: {formatCount(tooltipData.value)}</div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-300">
        Progress overlay animates through the grid to simulate keyspace
        exploration without performing any cracking work.
      </p>
    </div>
  );
};

export default KeyspaceHeatmap;
