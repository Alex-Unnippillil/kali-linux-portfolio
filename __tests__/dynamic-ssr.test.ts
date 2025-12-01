import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..');

interface DynamicCase {
  file: string;
  marker: string;
  description: string;
}

const dynamicCases: DynamicCase[] = [
  {
    description: 'Monaco editor loader stays client-only',
    file: 'components/apps/project-gallery.tsx',
    marker: '@monaco-editor/react',
  },
  {
    description: 'Terminal tabs (xterm.js) remain client-only',
    file: 'components/apps/terminal.tsx',
    marker: '../../apps/terminal/tabs',
  },
  {
    description: 'Recon graph page isolates force-graph',
    file: 'pages/recon/graph.tsx',
    marker: 'react-force-graph',
  },
  {
    description: 'Wireshark flow diagram uses the force-graph chunk',
    file: 'components/apps/wireshark/FlowDiagram.js',
    marker: 'react-force-graph',
  },
  {
    description: 'Radare2 graph view lazy-loads force-graph',
    file: 'apps/radare2/components/GraphView.tsx',
    marker: 'react-force-graph',
  },
  {
    description: 'Recon NG module planner lazy-loads force-graph',
    file: 'apps/recon-ng/components/ModulePlanner.tsx',
    marker: 'react-force-graph',
  },
  {
    description: 'Recon NG data explorer lazy-loads force-graph',
    file: 'apps/recon-ng/components/DataModelExplorer.tsx',
    marker: 'react-force-graph',
  },
  {
    description: 'Wireshark flow graph keeps cytoscape client-side',
    file: 'apps/wireshark/components/FlowGraph.tsx',
    marker: 'react-cytoscapejs',
  },
  {
    description: 'Recon NG app wrapper keeps cytoscape client-side',
    file: 'components/apps/reconng/index.js',
    marker: 'react-cytoscapejs',
  },
  {
    description: 'Simon game (Howler) loads without SSR',
    file: 'pages/apps/simon.jsx',
    marker: '../../apps/simon',
  },
  {
    description: 'Project gallery shell (Monaco) remains client-only',
    file: 'pages/apps/project-gallery.jsx',
    marker: '../../apps/project-gallery/pages',
  },
];

describe('heavy library dynamic() calls enforce ssr: false', () => {
  it.each(dynamicCases)('$description', ({ file, marker }) => {
    const absolutePath = path.join(repoRoot, file);
    const content = fs.readFileSync(absolutePath, 'utf8');
    const markerIndex = content.indexOf(marker);
    expect(markerIndex).toBeGreaterThanOrEqual(0);
    const windowSize = 400;
    const snippet = content.slice(markerIndex, markerIndex + windowSize);
    expect(snippet.includes('ssr: false')).toBe(true);
  });
});
