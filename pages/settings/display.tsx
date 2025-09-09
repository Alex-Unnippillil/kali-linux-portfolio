import { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';

type Monitor = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  primary: boolean;
  orientation: 'landscape' | 'portrait';
  resolution: string;
};

const resolutions = ['1920x1080', '1600x900', '1280x1024'];

function MonitorIcon({ monitor, onChange, onSelect, showId }: { monitor: Monitor; onChange: (id: number, pos: { x: number; y: number }) => void; onSelect: (id: number) => void; showId: boolean; }) {
  const nodeRef = useRef<HTMLDivElement>(null);

  return (
    <Draggable
      nodeRef={nodeRef}
      defaultPosition={{ x: monitor.x, y: monitor.y }}
      onDrag={(_, data) => onChange(monitor.id, { x: data.x, y: data.y })}
      bounds="parent"
    >
      <div
        ref={nodeRef}
        onClick={() => onSelect(monitor.id)}
        className={`absolute bg-gray-700 ${monitor.primary ? 'ring-2 ring-blue-500' : 'ring ring-gray-500'}`}
        style={{ width: monitor.width, height: monitor.height }}
      >
        {showId && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-2xl select-none">
            {monitor.id}
          </div>
        )}
      </div>
    </Draggable>
  );
}

export default function DisplaySettings() {
  const [monitors, setMonitors] = useState<Monitor[]>([
    { id: 1, x: 0, y: 0, width: 240, height: 135, primary: true, orientation: 'landscape', resolution: '1920x1080' },
    { id: 2, x: 260, y: 0, width: 240, height: 135, primary: false, orientation: 'landscape', resolution: '1280x1024' },
  ]);
  const [selected, setSelected] = useState<number>(1);
  const [mirror, setMirror] = useState(false);
  const [showIds, setShowIds] = useState(false);

  const selectedMonitor = monitors.find((m) => m.id === selected) || monitors[0];
  const primary = monitors.find((m) => m.primary) || monitors[0];

  if (!selectedMonitor) return null;

  const updateMonitorPosition = (id: number, pos: { x: number; y: number }) => {
    setMonitors((mons) => mons.map((m) => (m.id === id ? { ...m, ...pos } : m)));
  };

  const handleOrientation = (id: number, orientation: 'landscape' | 'portrait') => {
    setMonitors((mons) =>
      mons.map((m) => {
        if (m.id !== id) return m;
        const landscape = orientation === 'landscape';
        const aspect = landscape ? { width: 240, height: 135 } : { width: 135, height: 240 };
        return { ...m, orientation, ...aspect };
      }),
    );
  };

  const handleResolution = (id: number, res: string) => {
    setMonitors((mons) => mons.map((m) => (m.id === id ? { ...m, resolution: res } : m)));
  };

  const setPrimary = (id: number) => {
    setMonitors((mons) => mons.map((m) => ({ ...m, primary: m.id === id })));
  };

  const toggleMirror = (checked: boolean) => {
    setMirror(checked);
    if (!checked) return;
    const base = monitors[0];
    if (!base) return;
    setMonitors((mons) =>
      mons.map((m) => ({ ...m, orientation: base.orientation, resolution: base.resolution })),
    );
  };

  const identify = () => {
    setShowIds(true);
    setTimeout(() => setShowIds(false), 1000);
  };

  useEffect(() => {
    if (!mirror) return;
    const base = monitors[0];
    if (!base) return;
    setMonitors((mons) =>
      mons.map((m) => ({ ...m, orientation: base.orientation, resolution: base.resolution })),
    );
  }, [mirror, monitors]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl mb-2">Display Settings</h1>
      <div className="relative w-full h-64 bg-gray-800 overflow-hidden">
        {monitors.map((m) => (
          <MonitorIcon key={m.id} monitor={m} onChange={updateMonitorPosition} onSelect={setSelected} showId={showIds} />
        ))}
        {primary && (
          <>
            <div
              className="absolute bg-gray-900"
              style={{ left: primary.x, top: primary.y, width: primary.width, height: 8 }}
            />
            <div
              className="absolute bg-gray-900 text-white flex items-center justify-center"
              style={{
                left: primary.x + primary.width / 2 - 40,
                top: primary.y + primary.height / 2 - 25,
                width: 80,
                height: 50,
              }}
            >
              Login
            </div>
          </>
        )}
      </div>

      <div className="space-y-2">
        <div>
          <span className="mr-2">Orientation:</span>
          <input
            id="orientation-landscape"
            aria-label="Landscape orientation"
            type="radio"
            name="orientation"
            checked={selectedMonitor.orientation === 'landscape'}
            onChange={() => handleOrientation(selectedMonitor.id, 'landscape')}
          />
          <label htmlFor="orientation-landscape" className="mr-2">
            Landscape
          </label>
          <input
            id="orientation-portrait"
            aria-label="Portrait orientation"
            type="radio"
            name="orientation"
            checked={selectedMonitor.orientation === 'portrait'}
            onChange={() => handleOrientation(selectedMonitor.id, 'portrait')}
          />
          <label htmlFor="orientation-portrait">Portrait</label>
        </div>

        <div>
          <label className="mr-2">Resolution:</label>
          <select
            value={selectedMonitor.resolution}
            onChange={(e) => handleResolution(selectedMonitor.id, e.target.value)}
            className="bg-gray-700 text-white rounded px-1"
          >
            {resolutions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <button
            onClick={() => setPrimary(selectedMonitor.id)}
            className="px-2 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
            disabled={selectedMonitor.primary}
          >
            Set Primary
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="mirror-displays"
            aria-label="Mirror displays"
            type="checkbox"
            checked={mirror}
            onChange={(e) => toggleMirror(e.target.checked)}
          />
          <label htmlFor="mirror-displays">Mirror displays</label>
        </div>

        <div>
          <button onClick={identify} className="px-2 py-1 bg-gray-700 text-white rounded">
            Identify displays
          </button>
        </div>
      </div>
    </div>
  );
}
