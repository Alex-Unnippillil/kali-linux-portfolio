const DEFAULT_LAYOUT = 'single';

const LAYOUT_OPTIONS = [
  { value: 'single', label: 'Single Monitor' },
  { value: 'dual-horizontal', label: 'Dual Horizontal' },
  { value: 'triple-horizontal', label: 'Triple Horizontal' },
];

const clampDimension = (value) => Math.max(0, Math.floor(value));

const createMonitor = (id, label, left, top, width, height) => ({
  id,
  label,
  left,
  top,
  width: clampDimension(width),
  height: clampDimension(height),
});

const layoutBuilders = {
  single: (viewportWidth, viewportHeight) => [
    createMonitor('monitor-1', 'Monitor 1', 0, 0, viewportWidth, viewportHeight),
  ],
  'dual-horizontal': (viewportWidth, viewportHeight) => {
    const firstWidth = clampDimension(viewportWidth / 2);
    const secondWidth = clampDimension(viewportWidth - firstWidth);
    return [
      createMonitor('monitor-1', 'Monitor 1', 0, 0, firstWidth, viewportHeight),
      createMonitor('monitor-2', 'Monitor 2', firstWidth, 0, secondWidth, viewportHeight),
    ];
  },
  'triple-horizontal': (viewportWidth, viewportHeight) => {
    const baseWidth = clampDimension(viewportWidth / 3);
    const monitors = [];
    let offset = 0;
    for (let index = 0; index < 3; index += 1) {
      const remaining = clampDimension(viewportWidth - offset);
      const width = index === 2 ? remaining : baseWidth;
      monitors.push(
        createMonitor(`monitor-${index + 1}`, `Monitor ${index + 1}`, offset, 0, width, viewportHeight)
      );
      offset += width;
    }
    return monitors;
  },
};

export const DEFAULT_MONITOR_LAYOUT = DEFAULT_LAYOUT;
export const MONITOR_LAYOUT_OPTIONS = LAYOUT_OPTIONS;

export function computeMonitorLayout(layout, viewportWidth, viewportHeight) {
  const builder = layoutBuilders[layout] || layoutBuilders[DEFAULT_LAYOUT];
  const width = clampDimension(viewportWidth);
  const height = clampDimension(viewportHeight);
  return builder(width, height);
}

export function getMonitorById(monitors, id) {
  if (!Array.isArray(monitors) || !monitors.length) return null;
  if (!id) return monitors[0] || null;
  return monitors.find((monitor) => monitor.id === id) || monitors[0] || null;
}
