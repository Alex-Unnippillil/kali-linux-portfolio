import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import dynamic from 'next/dynamic';
import usePersistentState from '../../../hooks/usePersistentState';
import ReportTemplates from './components/ReportTemplates';
import { useSettings } from '../../../hooks/useSettings';
import copyToClipboard from '../../../utils/clipboard';
import {
  runProxyDiagnostics,
  formatProxyDiagnostics,
} from '../../../utils/proxyDiagnostics';
import { logProxyDiagnostic } from '../../../lib/fetchProxy';

const CytoscapeComponent = dynamic(
  async () => {
    const cytoscape = (await import('cytoscape')).default;
    const coseBilkent = (await import('cytoscape-cose-bilkent')).default;
    cytoscape.use(coseBilkent);
    return (await import('react-cytoscapejs')).default;
  },
  { ssr: false },
);

// Built-in modules with simple schemas and canned demo data. Each schema defines
// the expected input type, a demo generator for offline usage, and an optional
// fetchUrl function used when the user opts into live network requests.
const moduleSchemas = {
  'DNS Enumeration': {
    input: 'domain',
    demo: (target) => ({
      output: `DNS records for ${target}\nA\t93.184.216.34`,
      nodes: [
        { data: { id: 'domains', label: 'Domains' } },
        { data: { id: 'ips', label: 'IPs' } },
        { data: { id: 'entities', label: 'Entities' } },
        { data: { id: target, label: target, parent: 'domains', type: 'domain' } },
        {
          data: {
            id: '93.184.216.34',
            label: '93.184.216.34',
            parent: 'ips',
            type: 'ip',
          },
        },
        {
          data: {
            id: 'John Doe',
            label: 'John Doe',
            parent: 'entities',
            type: 'entity',
          },
        },
      ],
      edges: [
        { data: { id: 'e1', source: target, target: '93.184.216.34' } },
        { data: { id: 'e2', source: '93.184.216.34', target: 'John Doe' } },
      ],
    }),
    fetchUrl: (target) =>
      `https://dns.google/resolve?name=${encodeURIComponent(target)}`,
  },
  'WHOIS Lookup': {
    input: 'domain',
    demo: (target) => ({
      output: `WHOIS data for ${target}\nRegistrant: Example Corp`,
      nodes: [
        { data: { id: 'domains', label: 'Domains' } },
        { data: { id: 'entities', label: 'Entities' } },
        { data: { id: target, label: target, parent: 'domains', type: 'domain' } },
        {
          data: {
            id: 'Example Corp',
            label: 'Example Corp',
            parent: 'entities',
            type: 'entity',
          },
        },
      ],
      edges: [
        { data: { id: 'e1', source: target, target: 'Example Corp' } },
      ],
    }),
    fetchUrl: (target) =>
      `https://api.allorigins.win/raw?url=${encodeURIComponent(
        `https://api.hackertarget.com/whois/?q=${target}`,
      )}`,
  },
  'Reverse IP Lookup': {
    input: 'ip',
    demo: (target) => ({
      output: `Domains hosted on ${target}\nexample.com`,
      nodes: [
        { data: { id: 'domains', label: 'Domains' } },
        { data: { id: 'ips', label: 'IPs' } },
        { data: { id: 'entities', label: 'Entities' } },
        {
          data: {
            id: 'example.com',
            label: 'example.com',
            parent: 'domains',
            type: 'domain',
          },
        },
        { data: { id: target, label: target, parent: 'ips', type: 'ip' } },
        {
          data: {
            id: 'John Doe',
            label: 'John Doe',
            parent: 'entities',
            type: 'entity',
          },
        },
      ],
      edges: [
        { data: { id: 'e1', source: 'example.com', target } },
        { data: { id: 'e2', source: target, target: 'John Doe' } },
      ],
    }),
    fetchUrl: (target) =>
      `https://api.allorigins.win/raw?url=${encodeURIComponent(
        `https://api.hackertarget.com/reverseiplookup/?q=${target}`,
      )}`,
  },
};

const modules = Object.keys(moduleSchemas);

const createWorkspace = (index) => ({
  name: `Workspace ${index + 1}`,
  graph: [],
  entities: {
    domain: new Set(),
    ip: new Set(),
    entity: new Set(),
  },
});

const ReconNG = () => {
  const { allowNetwork } = useSettings();
  const [selectedModule, setSelectedModule] = useState(modules[0]);
  const [target, setTarget] = useState('');
  const [output, setOutput] = useState('');
  const [useLiveData, setUseLiveData] = useState(false);
  const [view, setView] = useState('run');
  const [marketplace, setMarketplace] = useState([]);
  const [scriptTags, setScriptTags] = usePersistentState('reconng-script-tags', {});
  const [tagInputs, setTagInputs] = useState({});
  const [apiKeys, setApiKeys] = usePersistentState('reconng-api-keys', {});
  const [showApiKeys, setShowApiKeys] = useState({});
  const [workspaces, setWorkspaces] = useState([createWorkspace(0)]);
  const [activeWs, setActiveWs] = useState(0);
  const [ariaMessage, setAriaMessage] = useState('');
  const [focusedNodeIndex, setFocusedNodeIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [chainData, setChainData] = useState(null);
  const cyRef = useRef(null);
  const copyTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const [diagnostics, setDiagnostics] = useState(null);
  const [diagnosticsStatus, setDiagnosticsStatus] = useState('idle');
  const [diagnosticsError, setDiagnosticsError] = useState('');
  const [diagnosticsSummary, setDiagnosticsSummary] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  const currentWorkspace = workspaces[activeWs];

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (allowNetwork) return undefined;
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
  }, [allowNetwork]);

  useEffect(() => {
    fetch('/reconng-marketplace.json')
      .then((r) => r.json())
      .then((d) => setMarketplace(d.modules || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (view === 'builder' && !chainData) {
      fetch('/reconng-chain.json')
        .then((r) => r.json())
        .then((d) => setChainData(d))
        .catch(() => {});
    }
  }, [view, chainData]);

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
    const nodeCount = currentWorkspace.graph.filter((el) => !el.data?.source).length;
    const edgeCount = currentWorkspace.graph.filter((el) => el.data?.source).length;
    setAriaMessage(`Graph updated with ${nodeCount} nodes and ${edgeCount} edges.`);
    setFocusedNodeIndex(0);
  }, [currentWorkspace.graph, prefersReducedMotion]);

  const allModules = useMemo(() => [...modules, ...marketplace], [marketplace]);

  const stylesheet = useMemo(
    () => [
      {
        selector: 'node',
        style: {
          'background-color': '#888',
          color: '#fff',
          label: 'data(label)',
        },
      },
      {
        selector: 'node[type="domain"]',
        style: {
          'background-color': '#1f77b4',
          shape: 'round-rectangle',
        },
      },
      {
        selector: 'node[type="ip"]',
        style: {
          'background-color': '#ff7f0e',
          shape: 'rectangle',
        },
      },
      {
        selector: 'node[type="entity"]',
        style: {
          'background-color': '#006400',
          shape: 'diamond',
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
          padding: '10px',
          'background-opacity': 0.1,
          'border-color': '#555',
        },
      },
      {
        selector: 'node.status-pass',
        style: {
          'border-width': 3,
          'border-color': '#22c55e',
        },
      },
      {
        selector: 'node.status-fail',
        style: {
          'border-width': 3,
          'border-color': '#ef4444',
        },
      },
      {
        selector: 'node.status-running',
        style: {
          'border-width': 3,
          'border-color': '#facc15',
        },
      },
    ],
    [],
  );

  const updateWorkspace = (updater) => {
    setWorkspaces((ws) => {
      const copy = [...ws];
      copy[activeWs] = updater(copy[activeWs]);
      return copy;
    });
  };

  const addEntities = (nodes) => {
    updateWorkspace((ws) => {
      const entities = {
        domain: new Set(ws.entities.domain),
        ip: new Set(ws.entities.ip),
        entity: new Set(ws.entities.entity),
      };
      nodes.forEach((n) => {
        if (n.data.type && n.data.label) {
          entities[n.data.type].add(n.data.label);
        }
      });
      return { ...ws, entities };
    });
  };

  const executeModule = async (moduleName, input) => {
    const schema = moduleSchemas[moduleName];
    const demo = schema.demo(input);
    let text = demo.output;
    if (useLiveData && schema.fetchUrl) {
      try {
        const res = await fetch(schema.fetchUrl(input));
        text = await res.text();
      } catch {
        text = `${demo.output}\n\n(Live fetch failed; showing demo data)`;
      }
    }
    return { text, nodes: demo.nodes, edges: demo.edges };
  };

  const runModule = async () => {
    if (!target) return;
    const result = await executeModule(selectedModule, target);
    setOutput(result.text);
    addEntities(result.nodes);
    updateWorkspace((ws) => ({ ...ws, graph: [...result.nodes, ...result.edges] }));
  };

  const topologicalSort = (nodes, edges) => {
    const idMap = new Map(nodes.map((n) => [n.data.id, n]));
    const graph = new Map();
    const inDegree = new Map();
    nodes.forEach((n) => {
      graph.set(n.data.id, []);
      inDegree.set(n.data.id, 0);
    });
    edges.forEach((e) => {
      graph.get(e.data.source).push(e.data.target);
      inDegree.set(e.data.target, inDegree.get(e.data.target) + 1);
    });
    const queue = [];
    inDegree.forEach((deg, id) => {
      if (deg === 0) queue.push(id);
    });
    const order = [];
    while (queue.length) {
      const id = queue.shift();
      order.push(idMap.get(id));
      graph.get(id).forEach((nbr) => {
        inDegree.set(nbr, inDegree.get(nbr) - 1);
        if (inDegree.get(nbr) === 0) queue.push(nbr);
      });
    }
    return order;
  };

  const runChain = async () => {
    if (!chainData || !target) return;
    setOutput('Running module chain...');
    const order = topologicalSort(chainData.chain.nodes, chainData.chain.edges);
    const artifacts = {
      domain: new Set([target]),
      ip: new Set([target]),
      entity: new Set(),
    };
    let combinedNodes = [];
    let combinedEdges = [];
    let texts = [];
    for (const node of order) {
      const moduleName = node.data.label;
      const schema = moduleSchemas[moduleName];
      if (!schema) continue;
      const input = artifacts[schema.input].values().next().value;
      if (!input) continue;
      const result = await executeModule(moduleName, input);
      texts.push(result.text);
      combinedNodes = combinedNodes.concat(result.nodes);
      combinedEdges = combinedEdges.concat(result.edges);
      result.nodes.forEach((n) => {
        if (n.data.type && n.data.label) {
          artifacts[n.data.type].add(n.data.label);
        }
      });
    }
    if (combinedNodes.length) {
      addEntities(combinedNodes);
      updateWorkspace((ws) => ({ ...ws, graph: [...combinedNodes, ...combinedEdges] }));
    }
    setOutput(texts.join('\n\n'));
    setView('run');
  };

  const runDiagnostics = async () => {
    if (!chainData) return;
    const hops = chainData.chain.nodes.map((node) => ({
      id: node.data.id,
      label: node.data.label,
    }));
    if (hops.length === 0) return;
    const chainLabels = hops.map((hop) => hop.label);
    const startedAt = Date.now();
    setDiagnostics(null);
    setDiagnosticsStatus('running');
    setDiagnosticsError('');
    setDiagnosticsSummary('');
    setCopyStatus('');
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
    try {
      const result = await runProxyDiagnostics(hops);
      const summary = formatProxyDiagnostics(result, {
        chain: chainLabels,
        target,
      });
      logProxyDiagnostic({
        chain: chainLabels,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
        totalLatency: result.totalLatency,
        success: result.success,
        hops: result.hops,
      });
      if (!isMountedRef.current) return;
      setDiagnostics(result);
      setDiagnosticsStatus('done');
      setDiagnosticsSummary(summary);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Diagnostics failed';
      logProxyDiagnostic({
        chain: chainLabels,
        startedAt,
        completedAt: Date.now(),
        totalLatency: 0,
        success: false,
        hops: [],
        error: message,
      });
      if (!isMountedRef.current) return;
      setDiagnosticsStatus('error');
      setDiagnosticsError(message);
    }
  };

  const handleCopyDiagnostics = async () => {
    if (!diagnosticsSummary) return;
    const copied = await copyToClipboard(diagnosticsSummary);
    if (!isMountedRef.current) return;
    setCopyStatus(copied ? 'Copied!' : 'Copy failed');
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = setTimeout(() => {
      setCopyStatus('');
      copyTimeoutRef.current = null;
    }, 2000);
  };

  useEffect(() => {
    setDiagnostics(null);
    setDiagnosticsStatus('idle');
    setDiagnosticsError('');
    setDiagnosticsSummary('');
    setCopyStatus('');
  }, [target]);

  const nodeStatus = useMemo(() => {
    if (diagnosticsStatus === 'running' && chainData) {
      return chainData.chain.nodes.reduce((acc, node) => {
        acc[node.data.id] = 'running';
        return acc;
      }, {});
    }
    if (diagnostics?.hops) {
      return diagnostics.hops.reduce((acc, hop) => {
        acc[hop.id] = hop.passed ? 'pass' : 'fail';
        return acc;
      }, {});
    }
    return {};
  }, [diagnosticsStatus, chainData, diagnostics]);

  const chainElements = useMemo(() => {
    if (!chainData) return [];
    const nodes = chainData.chain.nodes.map((node) => {
      const status = nodeStatus[node.data.id];
      if (!status) return node;
      const classes = node.classes ? `${node.classes} status-${status}` : `status-${status}`;
      return { ...node, classes };
    });
    return [...nodes, ...chainData.chain.edges];
  }, [chainData, nodeStatus]);

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

  const addWorkspace = () => {
    setWorkspaces((ws) => [...ws, createWorkspace(ws.length)]);
    setActiveWs(workspaces.length);
  };

  const exportJSON = () => {
    const data = {};
    Object.entries(currentWorkspace.entities).forEach(([type, set]) => {
      data[type] = Array.from(set);
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reconng-entities.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    let csv = 'type,label\n';
    Object.entries(currentWorkspace.entities).forEach(([type, set]) => {
      Array.from(set).forEach((label) => {
        csv += `${type},${label}\n`;
      });
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reconng-entities.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full w-full bg-gray-900 text-white p-4">
      <div className="flex gap-2 mb-2">
        {workspaces.map((ws, i) => (
          <button
            key={ws.name}
            type="button"
            onClick={() => setActiveWs(i)}
            className={`px-2 py-1 ${i === activeWs ? 'bg-blue-600' : 'bg-gray-800'}`}
          >
            {ws.name}
          </button>
        ))}
        <button type="button" onClick={addWorkspace} className="px-2 py-1 bg-green-700">
          +
        </button>
      </div>
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
          onClick={() => setView('builder')}
          className={`px-2 py-1 ${view === 'builder' ? 'bg-blue-600' : 'bg-gray-800'}`}
        >
          Builder
        </button>
        <button
          type="button"
          onClick={() => setView('reports')}
          className={`px-2 py-1 ${view === 'reports' ? 'bg-blue-600' : 'bg-gray-800'}`}
        >
          Reports
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
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={useLiveData}
                onChange={(e) => setUseLiveData(e.target.checked)}
              />
              Live fetch
            </label>
            <button
              type="button"
              onClick={runModule}
              className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded"
            >
              Run
            </button>
          </div>
          <pre className="flex-1 bg-black p-2 overflow-auto whitespace-pre-wrap mb-2">{output}</pre>
          {currentWorkspace.graph.length > 0 && (
            <div
              className="bg-black p-2 mb-2"
              style={{ height: '300px' }}
              tabIndex={0}
              onKeyDown={handleKeyDown}
              role="application"
              aria-label="Graph visualization"
            >
              <CytoscapeComponent
                elements={currentWorkspace.graph}
                stylesheet={stylesheet}
                style={{ width: '100%', height: '100%' }}
                cy={(cy) => {
                  cyRef.current = cy;
                }}
              />
            </div>
          )}
          {Object.entries(currentWorkspace.entities).map(([type, set]) => (
            <div key={type} className="mb-2">
              <h3 className={`font-bold ${type === 'ip' ? 'uppercase' : 'capitalize'}`}>{type}</h3>
              <table className="w-full text-sm">
                <tbody>
                  {Array.from(set).map((label) => (
                    <tr key={label}>
                      <td>{label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {currentWorkspace.graph.length > 0 && (
            <div className="flex gap-2 mt-2">
              <button type="button" onClick={exportCSV} className="bg-gray-800 px-2 py-1">
                Export CSV
              </button>
              <button type="button" onClick={exportJSON} className="bg-gray-800 px-2 py-1">
                Export JSON
              </button>
            </div>
          )}
          <div role="status" aria-live="polite" className="sr-only">
            {ariaMessage}
          </div>
        </>
      )}
      {view === 'builder' && chainData && (
        <>
          <div className="flex flex-wrap gap-2 mb-2 items-center">
            <button
              type="button"
              onClick={runChain}
              className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded"
            >
              Run Chain
            </button>
            <button
              type="button"
              onClick={runDiagnostics}
              disabled={diagnosticsStatus === 'running'}
              className={`px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {diagnosticsStatus === 'running' ? 'Running Diagnostics...' : 'Run Diagnostics'}
            </button>
            {diagnosticsStatus === 'error' && (
              <span className="text-sm text-red-400">{diagnosticsError}</span>
            )}
          </div>
          {diagnostics && (
            <div className="mb-3 bg-gray-900/70 border border-gray-700 rounded p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    diagnostics.success ? 'bg-green-700' : 'bg-red-700'
                  }`}
                >
                  {diagnostics.success ? 'PASS' : 'FAIL'}
                </span>
                <span className="text-xs text-gray-300">
                  Total latency: {Math.round(diagnostics.totalLatency)} ms
                </span>
                <button
                  type="button"
                  onClick={handleCopyDiagnostics}
                  className="text-xs px-2 py-1 bg-gray-800 rounded hover:bg-gray-700"
                >
                  Copy report
                </button>
                {copyStatus && <span className="text-xs text-gray-400">{copyStatus}</span>}
              </div>
              <ul className="mt-2 space-y-1">
                {diagnostics.hops.map((hop, index) => (
                  <li
                    key={hop.id}
                    className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 bg-gray-800 rounded px-2 py-1"
                  >
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <span
                        className={`text-[10px] px-1 py-0.5 rounded ${
                          hop.passed ? 'bg-green-700' : 'bg-red-700'
                        }`}
                      >
                        {hop.passed ? 'PASS' : 'FAIL'}
                      </span>
                      <span>
                        {index + 1}. {hop.label}
                      </span>
                      <span className="font-mono text-gray-400">{hop.ip}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <span>{Math.round(hop.latency)} ms</span>
                      {hop.message && (
                        <span className="text-[10px] text-gray-400 italic">{hop.message}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {diagnosticsSummary && (
                <pre className="mt-3 bg-black text-green-300 font-mono text-xs whitespace-pre-wrap rounded p-2">
                  {diagnosticsSummary}
                </pre>
              )}
            </div>
          )}
          <div className="bg-black p-2" style={{ height: '300px' }}>
            <CytoscapeComponent
              elements={chainElements}
              stylesheet={stylesheet}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </>
      )}
      {view === 'reports' && <ReportTemplates />}
      {view === 'settings' && (
        <div className="flex-1 overflow-auto">
          {allModules.map((m) => (
            <div key={m} className="mb-2">
              <label className="block mb-1">{`${m} API Key`}</label>
              <div className="flex">
                <input
                  type={showApiKeys[m] ? 'text' : 'password'}
                  value={apiKeys[m] || ''}
                  onChange={(e) => setApiKeys({ ...apiKeys, [m]: e.target.value })}
                  className="flex-1 bg-gray-800 px-2 py-1"
                  placeholder={`${m} API Key`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowApiKeys({ ...showApiKeys, [m]: !showApiKeys[m] })
                  }
                  className="ml-2 px-2 py-1 bg-gray-700"
                >
                  {showApiKeys[m] ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {view === 'marketplace' && (
        <ul className="list-disc pl-5">
          {marketplace.map((m) => (
            <li key={m} className="mb-2">
              <div className="flex items-center gap-2">
                <span>{m}</span>
                <input
                  type="text"
                  value={tagInputs[m] || ''}
                  onChange={(e) =>
                    setTagInputs({ ...tagInputs, [m]: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagInputs[m]) {
                      const tag = tagInputs[m].trim();
                      if (tag) {
                        setScriptTags({
                          ...scriptTags,
                          [m]: [...(scriptTags[m] || []), tag],
                        });
                      }
                      setTagInputs({ ...tagInputs, [m]: '' });
                    }
                  }}
                  placeholder={`Tag ${m}`}
                  className="bg-gray-800 px-1 py-0.5 text-xs"
                  aria-label={`Tag ${m}`}
                />
              </div>
              {(scriptTags[m] || []).length > 0 && (
                <div className="mt-1 flex gap-1 flex-wrap">
                  {scriptTags[m].map((t) => (
                    <span key={t} className="bg-gray-700 px-1 text-xs">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ReconNG;

export const displayReconNG = () => <ReconNG />;

