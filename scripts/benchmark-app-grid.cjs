const React = require('react');
const { renderToString } = require('react-dom/server');
const ReactWindow = require('react-window');
const { performance } = require('node:perf_hooks');

const ITEM_COUNT = 512;
const COLUMN_COUNT = 8;
const COLUMN_WIDTH = 128;
const ROW_HEIGHT = 156;
const VIEWPORT_WIDTH = COLUMN_COUNT * COLUMN_WIDTH;
const VIEWPORT_HEIGHT = ROW_HEIGHT * 3;

const items = Array.from({ length: ITEM_COUNT }, (_, index) => ({
  id: `benchmark-app-${index}`,
  title: `Benchmark App ${index}`,
}));

function StaticGrid({ apps, columnCount }) {
  const rows = [];
  for (let i = 0; i < apps.length; i += columnCount) {
    rows.push(apps.slice(i, i + columnCount));
  }

  return React.createElement(
    'div',
    {
      style: {
        display: 'grid',
        gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
        gap: '16px',
      },
    },
    rows.flatMap((row) =>
      row.map((app) =>
        React.createElement(
          'div',
          {
            key: app.id,
            style: {
              minHeight: ROW_HEIGHT - 24,
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.04)',
            },
          },
          `Launch ${app.title}`
        )
      )
    )
  );
}

const VirtualCell = ({ columnIndex, rowIndex, style, apps, columnCount }) => {
  const index = rowIndex * columnCount + columnIndex;
  if (index >= apps.length) return null;
  const app = apps[index];
  return React.createElement(
    'div',
    {
      style: {
        ...style,
        boxSizing: 'border-box',
        padding: '16px',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.04)',
      },
    },
    `Launch ${app.title}`
  );
};

const { Grid } = ReactWindow;

function VirtualGrid({ apps, columnCount }) {
  return React.createElement(
    Grid,
    {
      columnCount,
      columnWidth: COLUMN_WIDTH,
      height: VIEWPORT_HEIGHT,
      rowCount: Math.ceil(apps.length / columnCount),
      rowHeight: ROW_HEIGHT,
      width: VIEWPORT_WIDTH,
      defaultHeight: VIEWPORT_HEIGHT,
      defaultWidth: VIEWPORT_WIDTH,
      style: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
      cellComponent: VirtualCell,
      cellProps: { apps, columnCount },
    },
    null
  );
}

function measure(label, renderFn, iterations = 20) {
  const samples = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    renderFn();
    const end = performance.now();
    samples.push(end - start);
  }

  const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const min = Math.min(...samples);
  const max = Math.max(...samples);

  return { label, average, min, max, samples };
}

const staticResult = measure('Static map', () =>
  renderToString(React.createElement(StaticGrid, { apps: items, columnCount: COLUMN_COUNT }))
);

const virtualResult = measure('Virtual grid', () =>
  renderToString(React.createElement(VirtualGrid, { apps: items, columnCount: COLUMN_COUNT }))
);

console.table([
  {
    scenario: staticResult.label,
    'avg (ms)': Number(staticResult.average.toFixed(3)),
    'min (ms)': Number(staticResult.min.toFixed(3)),
    'max (ms)': Number(staticResult.max.toFixed(3)),
  },
  {
    scenario: virtualResult.label,
    'avg (ms)': Number(virtualResult.average.toFixed(3)),
    'min (ms)': Number(virtualResult.min.toFixed(3)),
    'max (ms)': Number(virtualResult.max.toFixed(3)),
  },
]);

