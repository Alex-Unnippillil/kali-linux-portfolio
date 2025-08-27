import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import dynamic from 'next/dynamic';
import usePersistentState from '../../hooks/usePersistentState';

const CytoscapeComponent = dynamic(
  async () => {
    const cytoscape = (await import('cytoscape')).default;
    const coseBilkent = (await import('cytoscape-cose-bilkent')).default;
    cytoscape.use(coseBilkent);
    return (await import('react-cytoscapejs')).default;
  },
  { ssr: false },
);

const modules = [
  'DNS Enumeration',
  'WHOIS Lookup',
  'Reverse IP Lookup',
];

const ReconNG = () => {
  const [selectedModule, setSelectedModule] = useState(modules[0]);
  const [target, setTarget] = useState('');
  const [output, setOutput] = useState('');
  const [graphElements, setGraphElements] = useState([]);
  const [ariaMessage, setAriaMessage] = useState('');
  const cyRef = useRef(null);
  const [focusedNodeIndex, setFocusedNodeIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [view, setView] = useState('run');
  const [marketplace, setMarketplace] = useState([]);
  const [apiKeys, setApiKeys] = usePersistentState('reconng-api-keys', {});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalFetch = window.fetch.bind(window);
      window.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : input.url;
        if (/^https?:/i.test(url) && !url.startsWith(window.location.origin) && !url.startsWith('/')) {
          return Promise.reject(new Error('Outbound requests blocked'));
        }
        return originalFetch(input, init);
      };
      return () => {
        window.fetch = originalFetch;
      };
    }
    return undefined;
  }, []);

  useEffect(() => {
    fetch('/demo/reconng-marketplace.json')
      .then((r) => r.json())
      .then((d) => setMarketplace(d.modules || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      const handler = (e) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (cyRef.current) {
      requestAnimationFrame(() => {
        const layout = cyRef.current.layout({
          name: 'cose-bilkent',
          animate: !prefersReducedMotion,
        });
        layout.run();
        const nodes = cyRef.current.nodes().filter((n) => !n.isParent());
        nodes.unselect();
        nodes[0]?.select();
      });
    }
    const nodeCount = graphElements.filter((el) => !el.data?.source).length;
    const edgeCount = graphElements.filter((el) => el.data?.source).length;
    setAriaMessage(`Graph updated with ${nodeCount} nodes and ${edgeCount} edges.`);
    setFocusedNodeIndex(0);
  }, [graphElements, prefersReducedMotion]);

  const allModules = [...modules, ...marketplace];

  const stylesheet = useMemo(
    () => [
      {
        selector: 'node[type="domain"]',
        style: {
          'background-color': '#1f77b4',
          shape: 'round-rectangle',
          color: '#fff',
          label: 'data(label)',
        },
      },
      {
        selector: 'node[type="person"]',
        style: {
          'background-color': '#d62728',
          shape: 'ellipse',
          color: '#fff',
          label: 'data(label)',
        },
      },
      {
        selector: 'node[type="asset"]',
        style: {
          'background-color': '#006400',
          shape: 'diamond',
          color: '#fff',
          label: 'data(label)',
        },
      },
      {
        selector: 'edge',
        style: {
          width: 2,
          'line-color': '#ccc',
          'target-arrow-color': '#ccc',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
        },
      },
      {
        selector: '$node > node',
        style: {
          'padding': '10px',
          'background-opacity': 0.1,
          'border-color': '#555',
          label: 'data(label)',
          color: '#fff',
        },
      },
    ],
    [],
  );

  const runModule = () => {
    if (!target) return;
    setOutput(`Running ${selectedModule} on ${target}...\nResults will appear here.`);
    const nodes = [
      { data: { id: 'domains', label: 'Domains' } },
      { data: { id: 'people', label: 'People' } },
      { data: { id: 'assets', label: 'Assets' } },
      {
        data: {
          id: target,
          label: target,
          parent: 'domains',
          type: 'domain',
        },
      },
      {
        data: {
          id: 'John Doe',
          label: 'John Doe',
          parent: 'people',
          type: 'person',
        },
      },
      {
        data: {
          id: 'Server1',
          label: 'Server1',
          parent: 'assets',
          type: 'asset',
        },
      },
    ];
    const edges = [
      { data: { id: 'e1', source: target, target: 'John Doe' } },
      { data: { id: 'e2', source: 'John Doe', target: 'Server1' } },
    ];
    requestAnimationFrame(() => setGraphElements([...nodes, ...edges]));
  };

  const handleKeyDown = (e) => {
    if (!cyRef.current) return;
    const nodes = cyRef.current.nodes().filter((n) => !n.isParent());
    if (nodes.length === 0) return;
    let index = focusedNodeIndex;
    if (['ArrowRight', 'ArrowDown', 'Tab'].includes(e.key)) {
      e.preventDefault();
      index = (focusedNodeIndex + 1) % nodes.length;
    } else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) {
      e.preventDefault();
      index = (focusedNodeIndex - 1 + nodes.length) % nodes.length;
    } else {
      return;
    }
    nodes.unselect();
    const node = nodes[index];
    node.select();
    setFocusedNodeIndex(index);
    setAriaMessage(`Selected node ${node.data('label')}`);
  };

  return (
    <div className="flex flex-col h-full w-full bg-gray-900 text-white p-4">
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setView('run')}
          className={`px-2 py-1 ${view === 'run' ? 'bg-blue-600' : 'bg-gray-800'}`}
        >
          Run
        </button>
        <button
          type="button"
          onClick={() => setView('settings')}
          className={`px-2 py-1 ${view === 'settings' ? 'bg-blue-600' : 'bg-gray-800'}`}
        >
          Settings
        </button>
        <button
          type="button"
          onClick={() => setView('marketplace')}
          className={`px-2 py-1 ${view === 'marketplace' ? 'bg-blue-600' : 'bg-gray-800'}`}
        >
          Marketplace
        </button>
      </div>
      {view === 'run' && (
        <>
          <div className="flex gap-2 mb-2">
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="bg-gray-800 px-2 py-1"
            >
              {allModules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Target"
              className="flex-1 bg-gray-800 px-2 py-1"
            />
            <button
              type="button"
              onClick={runModule}
              className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded"
            >
              Run
            </button>
          </div>
          <pre className="flex-1 bg-black p-2 overflow-auto whitespace-pre-wrap mb-2">{output}</pre>
          {graphElements.length > 0 && (
            <div
              className="bg-black p-2"
              style={{ height: '300px' }}
              tabIndex={0}
              onKeyDown={handleKeyDown}
              role="application"
              aria-label="Graph visualization"
            >
              <CytoscapeComponent
                elements={graphElements}
                stylesheet={stylesheet}
                style={{ width: '100%', height: '100%' }}
                cy={(cy) => {
                  cyRef.current = cy;
                }}
              />
            </div>
          )}
          <div role="status" aria-live="polite" className="sr-only">
            {ariaMessage}
          </div>
        </>
      )}
      {view === 'settings' && (
        <div className="flex-1 overflow-auto">
          {allModules.map((m) => (
            <div key={m} className="mb-2">
              <label className="block mb-1">{`${m} API Key`}</label>
              <input
                type="text"
                value={apiKeys[m] || ''}
                onChange={(e) => setApiKeys({ ...apiKeys, [m]: e.target.value })}
                className="w-full bg-gray-800 px-2 py-1"
                placeholder={`${m} API Key`}
              />
            </div>
          ))}
        </div>
      )}
      {view === 'marketplace' && (
        <ul className="list-disc pl-5">
          {marketplace.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ReconNG;

export const displayReconNG = () => <ReconNG />;

