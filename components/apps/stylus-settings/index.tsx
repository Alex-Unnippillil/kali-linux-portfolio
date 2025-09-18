import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  STYLUS_GLOBAL_MAPPING_ID,
  StylusAction,
  StylusButtonMapping,
  useSettings,
} from '../../../hooks/useSettings';

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 200;
const HANDLE_RADIUS = 4;

type Point = { x: number; y: number };

const formatPressure = (value: number) => value.toFixed(2);

const StylusSettingsApp: React.FC = () => {
  const {
    accent,
    stylusCurve,
    stylusCurvePresetId,
    stylusPresets,
    updateStylusCurvePoint,
    applyStylusPreset,
    resetStylusCurve,
    mapStylusPressure,
    stylusActions,
    stylusButtonMappings,
    updateStylusButtonMapping,
    resetStylusButtonMapping,
    stylusActiveAppId,
    activeStylusMapping,
    stylusMetrics,
    recordStylusSample,
    getStylusMapping,
  } = useSettings();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drawingRef = useRef(false);
  const dragHandleRef = useRef<number | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>(stylusCurvePresetId);
  const [manualAppSelection, setManualAppSelection] = useState(false);
  const [selectedApp, setSelectedApp] = useState<string>(
    stylusActiveAppId ?? STYLUS_GLOBAL_MAPPING_ID
  );
  const [newAppId, setNewAppId] = useState('');

  useEffect(() => {
    setSelectedPreset(stylusCurvePresetId);
  }, [stylusCurvePresetId]);

  useEffect(() => {
    if (!manualAppSelection) {
      setSelectedApp(stylusActiveAppId ?? STYLUS_GLOBAL_MAPPING_ID);
    }
  }, [manualAppSelection, stylusActiveAppId]);

  const availableMappings = useMemo(() => {
    const ids = new Set<string>();
    ids.add(STYLUS_GLOBAL_MAPPING_ID);
    Object.keys(stylusButtonMappings).forEach((id) => ids.add(id));
    if (stylusActiveAppId) ids.add(stylusActiveAppId);
    return Array.from(ids);
  }, [stylusButtonMappings, stylusActiveAppId]);

  const currentMapping = useMemo(
    () =>
      getStylusMapping(
        selectedApp === STYLUS_GLOBAL_MAPPING_ID ? null : selectedApp
      ),
    [getStylusMapping, selectedApp]
  );

  const activePreset = useMemo(
    () => stylusPresets.find((preset) => preset.id === stylusCurvePresetId),
    [stylusPresets, stylusCurvePresetId]
  );

  const curvePath = useMemo(() => {
    const [c1, c2] = stylusCurve.controlPoints;
    const toSvg = (point: Point) => ({
      x: point.x * 100,
      y: 100 - point.y * 100,
    });
    const p1 = toSvg(c1);
    const p2 = toSvg(c2);
    return `M0,100 C ${p1.x},${p1.y} ${p2.x},${p2.y} 100,0`;
  }, [stylusCurve.controlPoints]);

  const handlePositions = useMemo(() => {
    const toSvg = (point: Point) => ({
      x: point.x * 100,
      y: 100 - point.y * 100,
    });
    return stylusCurve.controlPoints.map(toSvg) as Point[];
  }, [stylusCurve.controlPoints]);

  const setManualSelection = useCallback((value: boolean) => {
    setManualAppSelection(value);
    if (!value) {
      setSelectedApp(stylusActiveAppId ?? STYLUS_GLOBAL_MAPPING_ID);
    }
  }, [stylusActiveAppId]);

  const handlePresetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const presetId = event.target.value;
    setSelectedPreset(presetId);
    if (presetId !== 'custom') {
      applyStylusPreset(presetId);
    }
  };

  const ensureCanvasContext = () =>
    canvasRef.current ? canvasRef.current.getContext('2d') : null;

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ensureCanvasContext();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const canvasCoordinates = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const beginStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = ensureCanvasContext();
    const pressure = event.pressure ?? 0.5;
    recordStylusSample(pressure);
    drawingRef.current = true;
    if (!ctx) return;
    const { x, y } = canvasCoordinates(event);
    ctx.strokeStyle = accent;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1 + mapStylusPressure(pressure) * 18;
    ctx.beginPath();
    ctx.moveTo(x, y);
    if (typeof canvas.setPointerCapture === 'function') {
      canvas.setPointerCapture(event.pointerId);
    }
  };

  const continueStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = ensureCanvasContext();
    if (!ctx) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = canvasCoordinates(event);
    const pressure = event.pressure ?? 0.5;
    recordStylusSample(pressure);
    ctx.lineWidth = 1 + mapStylusPressure(pressure) * 18;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const finishStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (
      canvas &&
      typeof canvas.hasPointerCapture === 'function' &&
      canvas.hasPointerCapture(event.pointerId)
    ) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  const handleHandlePointerDown = (index: number) =>
    (event: React.PointerEvent<SVGCircleElement>) => {
      event.preventDefault();
      dragHandleRef.current = index;
      svgRef.current?.setPointerCapture(event.pointerId);
    };

  const handleSvgPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (dragHandleRef.current === null) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, 1 - (event.clientY - rect.top) / rect.height));
    updateStylusCurvePoint(dragHandleRef.current as 0 | 1, { x, y });
  };

  const handleSvgPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    if (dragHandleRef.current === null) return;
    svgRef.current?.releasePointerCapture(event.pointerId);
    dragHandleRef.current = null;
  };

  const updateMapping = (button: keyof StylusButtonMapping, value: StylusAction) => {
    const targetApp = selectedApp === STYLUS_GLOBAL_MAPPING_ID ? STYLUS_GLOBAL_MAPPING_ID : selectedApp;
    updateStylusButtonMapping(targetApp, { [button]: value });
  };

  const handleAddMapping = () => {
    const trimmed = newAppId.trim();
    if (!trimmed) return;
    updateStylusButtonMapping(trimmed, getStylusMapping(trimmed));
    setSelectedApp(trimmed);
    setManualAppSelection(true);
    setNewAppId('');
  };

  const resetMappingForSelection = () => {
    if (selectedApp === STYLUS_GLOBAL_MAPPING_ID) {
      resetStylusButtonMapping();
    } else {
      resetStylusButtonMapping(selectedApp);
    }
  };

  const mappingSummary = `Primary: ${activeStylusMapping.primary} · Secondary: ${activeStylusMapping.secondary} · Eraser: ${activeStylusMapping.eraser}`;

  return (
    <div className="flex h-full w-full flex-col gap-4 bg-black/60 p-4 text-white">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-3 rounded border border-white/10 bg-black/30 p-4">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Pressure test</h2>
              <p className="text-xs text-white/70">
                Press, drag, and lift to visualise pressure after the curve is applied.
              </p>
            </div>
            <button
              type="button"
              onClick={clearCanvas}
              className="rounded bg-white/10 px-3 py-1 text-xs hover:bg-white/20"
            >
              Clear canvas
            </button>
          </header>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            aria-label="Stylus pressure test area"
            className="h-48 w-full rounded border border-white/10 bg-black/40"
            onPointerDown={beginStroke}
            onPointerMove={continueStroke}
            onPointerUp={finishStroke}
            onPointerLeave={finishStroke}
            onPointerCancel={finishStroke}
          />
          <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div>
              <dt className="font-medium text-white">Samples</dt>
              <dd className="text-white/70">{stylusMetrics.totalSamples}</dd>
            </div>
            <div>
              <dt className="font-medium text-white">Average</dt>
              <dd className="text-white/70">{formatPressure(stylusMetrics.averagePressure)}</dd>
            </div>
            <div>
              <dt className="font-medium text-white">Last pressure</dt>
              <dd className="text-white/70">{formatPressure(stylusMetrics.lastPressure)}</dd>
            </div>
            <div>
              <dt className="font-medium text-white">Focused app</dt>
              <dd className="truncate text-white/70">
                {stylusMetrics.lastFocusedApp ?? 'Default mapping'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="flex flex-col gap-3 rounded border border-white/10 bg-black/30 p-4">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Pressure curve</h2>
              <p className="text-xs text-white/70">
                Drag the handles or load a preset to shape how input pressure maps to output.
              </p>
            </div>
            <button
              type="button"
              onClick={resetStylusCurve}
              className="rounded bg-white/10 px-3 py-1 text-xs hover:bg-white/20"
            >
              Reset curve
            </button>
          </header>
          <div className="flex flex-col gap-2">
            <label className="flex flex-col text-xs">
              <span className="mb-1 font-semibold text-white">Curve preset</span>
              <select
                value={selectedPreset}
                onChange={handlePresetChange}
                className="rounded border border-white/10 bg-black/40 px-2 py-1 text-sm"
              >
                {stylusPresets.map((preset) => (
                  <option value={preset.id} key={preset.id}>
                    {preset.name}
                  </option>
                ))}
                {stylusCurvePresetId === 'custom' && (
                  <option value="custom">Custom</option>
                )}
              </select>
            </label>
            <p className="text-xs text-white/60">
              {stylusCurvePresetId === 'custom'
                ? 'Custom curve from manual edits.'
                : activePreset?.description ?? 'Preset description unavailable.'}
            </p>
          </div>
          <svg
            ref={svgRef}
            role="presentation"
            viewBox="0 0 100 100"
            className="h-48 w-full touch-none select-none"
            onPointerMove={handleSvgPointerMove}
            onPointerUp={handleSvgPointerUp}
            onPointerLeave={handleSvgPointerUp}
          >
            <rect x={0} y={0} width={100} height={100} fill="rgba(255,255,255,0.04)" />
            <path d="M0,0 L0,100" stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
            <path d="M0,100 L100,100" stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
            <path d={curvePath} stroke={accent} strokeWidth={2} fill="none" />
            {handlePositions.map((pos, index) => (
              <g key={index}>
                <line
                  x1={index === 0 ? 0 : 100}
                  y1={index === 0 ? 100 : 0}
                  x2={pos.x}
                  y2={pos.y}
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth={0.75}
                />
                <circle
                  role="slider"
                  aria-label={`Curve control ${index + 1}`}
                  cx={pos.x}
                  cy={pos.y}
                  r={HANDLE_RADIUS}
                  fill={accent}
                  stroke="white"
                  strokeWidth={0.75}
                  onPointerDown={handleHandlePointerDown(index)}
                />
              </g>
            ))}
          </svg>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {stylusCurve.controlPoints.map((point, index) => (
              <div key={index} className="flex flex-col rounded border border-white/10 bg-black/40 p-2">
                <span className="font-semibold text-white">Handle {index + 1}</span>
                <span className="text-white/60">X: {formatPressure(point.x)}</span>
                <span className="text-white/60">Y: {formatPressure(point.y)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-3 rounded border border-white/10 bg-black/30 p-4">
        <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Button mapping</h2>
            <p className="text-xs text-white/70">
              Choose default actions or target a focused window to override them.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setManualSelection(false)}
              className="rounded bg-white/10 px-3 py-1 text-xs hover:bg-white/20"
            >
              Follow active window
            </button>
            <button
              type="button"
              onClick={resetMappingForSelection}
              className="rounded bg-white/10 px-3 py-1 text-xs hover:bg-white/20"
            >
              Reset mapping
            </button>
          </div>
        </header>
        <div className="grid gap-3 md:grid-cols-[minmax(0,240px)_1fr]">
          <div className="flex flex-col gap-3">
            <label className="flex flex-col text-xs">
              <span className="mb-1 font-semibold text-white">Target app</span>
              <select
                value={selectedApp}
                onChange={(event) => {
                  setSelectedApp(event.target.value);
                  setManualAppSelection(true);
                }}
                className="rounded border border-white/10 bg-black/40 px-2 py-1 text-sm"
              >
                {availableMappings.map((id) => (
                  <option value={id} key={id}>
                    {id === STYLUS_GLOBAL_MAPPING_ID
                      ? 'All apps (default)'
                      : id === stylusActiveAppId
                        ? `${id} (focused)`
                        : id}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-2">
              <label className="flex flex-1 flex-col text-xs">
                <span className="mb-1 font-semibold text-white">Add app override</span>
                <input
                  value={newAppId}
                  onChange={(event) => setNewAppId(event.target.value)}
                  placeholder="App ID"
                  className="rounded border border-white/10 bg-black/40 px-2 py-1 text-sm"
                />
              </label>
              <button
                type="button"
                onClick={handleAddMapping}
                className="rounded bg-white/10 px-3 py-1 text-xs hover:bg-white/20"
              >
                Add
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {(['primary', 'secondary', 'eraser'] as const).map((button) => (
              <label key={button} className="flex flex-col text-xs">
                <span className="mb-1 font-semibold text-white">
                  {button === 'primary'
                    ? 'Primary button'
                    : button === 'secondary'
                      ? 'Secondary button'
                      : 'Eraser button'}
                </span>
                <select
                  value={currentMapping[button]}
                  onChange={(event) =>
                    updateMapping(button, event.target.value as StylusAction)
                  }
                  className="rounded border border-white/10 bg-black/40 px-2 py-1 text-sm"
                >
                  {stylusActions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
        <p className="text-xs text-white/60">Active mapping · {mappingSummary}</p>
      </section>
    </div>
  );
};

export default StylusSettingsApp;
