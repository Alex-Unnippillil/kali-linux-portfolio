/* eslint-disable no-console */
const React = require('react');
const { renderToString } = require('react-dom/server');
const { performance } = require('perf_hooks');
const urlsnarfFixture = require('../public/demo-data/dsniff/urlsnarf.json');

const parseLines = (text) =>
  text
    .split('\n')
    .filter(Boolean)
    .map((line, i) => {
      const parts = line.trim().split(/\s+/);
      let protocol = parts[0] || '';
      let host = parts[1] || '';
      let rest = parts.slice(2);
      if (protocol === 'ARP' && parts[1] === 'reply') {
        host = parts[2] || '';
        rest = parts.slice(3);
      }
      const timestamp = new Date(i * 1000).toISOString().split('T')[1].split('.')[0];
      return {
        raw: line,
        protocol,
        host,
        details: rest.join(' '),
        timestamp,
      };
    });

const baseLogs = parseLines(urlsnarfFixture.join('\n'));
const MULTIPLIER = 200;
const logs = Array.from({ length: MULTIPLIER }, (_, batch) =>
  baseLogs.map((log, idx) => ({
    ...log,
    raw: `${log.raw}#${batch}-${idx}`,
  }))
).flat();

const ROW_HEIGHT = 36;
const VIEWPORT_HEIGHT = 160;
const OVERSCAN = 6;
const visibleCount = Math.min(logs.length, Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + OVERSCAN);

function NonVirtualizedTable({ logs }) {
  return React.createElement(
    'table',
    { className: 'w-full text-left text-sm font-mono' },
    React.createElement(
      'tbody',
      null,
      logs.map((log, i) =>
        React.createElement(
          'tr',
          { key: `${log.raw}-${i}` },
          React.createElement('td', { className: 'pr-2 text-gray-400 whitespace-nowrap' }, log.timestamp),
          React.createElement(
            'td',
            { className: 'pr-2 text-green-400' },
            React.createElement('span', null, log.protocol)
          ),
          React.createElement('td', { className: 'px-2 text-white' }, log.host),
          React.createElement('td', { className: 'px-2 text-green-400' }, log.details)
        )
      )
    )
  );
}

function VirtualizedGrid({ logs }) {
  const items = logs.slice(0, visibleCount);
  return React.createElement(
    'div',
    { style: { height: VIEWPORT_HEIGHT, overflow: 'auto' } },
    React.createElement(
      'div',
      { style: { height: logs.length * ROW_HEIGHT, position: 'relative' } },
      React.createElement(
        'div',
        { style: { transform: 'translateY(0px)' } },
        items.map((log, i) =>
          React.createElement(
            'div',
            {
              key: `${log.raw}-${i}`,
              style: {
                display: 'grid',
                gridTemplateColumns: '96px 80px 160px 1fr',
                minHeight: ROW_HEIGHT,
                padding: '4px 8px',
              },
            },
            React.createElement('span', null, log.timestamp),
            React.createElement('span', null, log.protocol),
            React.createElement('span', null, log.host),
            React.createElement('span', null, log.details)
          )
        )
      )
    )
  );
}

function benchmark(label, Component) {
  const runs = 25;
  const start = performance.now();
  for (let i = 0; i < runs; i += 1) {
    renderToString(React.createElement(Component, { logs }));
  }
  const duration = performance.now() - start;
  console.log(`${label}: ${(duration / runs).toFixed(2)} ms`);
}

console.log(`Parsed log entries: ${logs.length}`);
benchmark('Non-virtualized render', NonVirtualizedTable);
benchmark('Virtualized render', VirtualizedGrid);
