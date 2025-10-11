import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import dynamic from 'next/dynamic';
import usePersistentState from '../../../hooks/usePersistentState';
import ReportTemplates from './components/ReportTemplates';
import { useSettings } from '../../../hooks/useSettings';

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

const normalizeMarketplaceModule = (module) =>
  typeof module === 'string'
    ? { name: module }
    : { ...module, name: module.name };

const getInitialPlaceholderValues = (command) => {
  const values = {};
  (command?.placeholders || []).forEach((placeholder) => {
    values[placeholder.token] =
      placeholder.default ?? placeholder.values?.[0] ?? '';
  });
  return values;
};

const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const applyPlaceholders = (text, placeholders, values) => {
  if (!text) return '';
  let result = text;
  (placeholders || []).forEach((placeholder) => {
    const token = escapeRegExp(placeholder.token);
    const value = values[placeholder.token] ?? '';
    result = result.replace(new RegExp(token, 'g'), value);
  });
  return result;
};

const ReconNG = () => {
  const { allowNetwork } = useSettings();
  const [selectedModule, setSelectedModule] = useState(modules[0]);
  const [target, setTarget] = useState('');
  const [output, setOutput] = useState('');
  const [useLiveData, setUseLiveData] = useState(false);
  const [view, setView] = useState('run');
  const [marketplace, setMarketplace] = useState([]);
  const [dataset, setDataset] = useState(null);
  const [selectedCommandId, setSelectedCommandId] = useState(null);
  const [commandValues, setCommandValues] = useState({});
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

  const currentWorkspace = workspaces[activeWs] || workspaces[0];

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
      .then((d) => setMarketplace((d.modules || []).map(normalizeMarketplaceModule)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/reconng-dataset.json')
      .then((r) => r.json())
      .then((d) => {
        setDataset(d);
        const commands = d.commandBuilder?.commands || [];
        if (commands.length > 0) {
          setSelectedCommandId(commands[0].id);
          setCommandValues(getInitialPlaceholderValues(commands[0]));
        }
      })
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

  const marketplaceNames = useMemo(
    () => marketplace.map((item) => item.name).filter(Boolean),
    [marketplace],
  );

  const allModules = useMemo(
    () => [...modules, ...marketplaceNames],
    [marketplaceNames],
  );

  const selectedCommand = useMemo(() => {
    if (!dataset?.commandBuilder?.commands) return null;
    return (
      dataset.commandBuilder.commands.find((command) => command.id === selectedCommandId) || null
    );
  }, [dataset, selectedCommandId]);

  const commandPreview = useMemo(() => {
    if (!selectedCommand) return '';
    return (selectedCommand.steps || [])
      .map((step) => applyPlaceholders(step, selectedCommand.placeholders, commandValues))
      .join('\n');
  }, [selectedCommand, commandValues]);

  const safeOutputPreview = useMemo(() => {
    if (!selectedCommand?.safeOutput) return '';
    return applyPlaceholders(
      selectedCommand.safeOutput,
      selectedCommand.placeholders,
      commandValues,
    );
  }, [selectedCommand, commandValues]);

  const handleCommandSelect = useCallback(
    (commandId) => {
      setSelectedCommandId(commandId);
      const commands = dataset?.commandBuilder?.commands || [];
      const nextCommand = commands.find((command) => command.id === commandId);
      if (nextCommand) {
        setCommandValues(getInitialPlaceholderValues(nextCommand));
      } else {
        setCommandValues({});
      }
    },
    [dataset],
  );

  const handlePlaceholderChange = useCallback((token, value) => {
    setCommandValues((prev) => ({ ...prev, [token]: value }));
  }, []);

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
          onClick={() => setView('playbooks')}
          className={`px-2 py-1 ${view === 'playbooks' ? 'bg-blue-600' : 'bg-gray-800'}`}
        >
          Playbooks
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
      {dataset?.labMessage && (
        <div
          className="mb-4 bg-yellow-900/60 border border-yellow-700 text-yellow-100 text-sm rounded px-3 py-2"
          role="note"
        >
          {dataset.labMessage}
        </div>
      )}
      {view === 'run' && (
        <>
          <div className="flex gap-2 mb-2">
            <label htmlFor="reconng-module-select" className="sr-only">
              Module
            </label>
            <select
              id="reconng-module-select"
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="bg-gray-800 px-2 py-1"
              aria-label="Module"
            >
              {allModules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <label htmlFor="reconng-target-input" className="sr-only">
              Lab target (domain or IP)
            </label>
            <input
              id="reconng-target-input"
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Lab target (domain or IP)"
              className="flex-1 bg-gray-800 px-2 py-1"
              aria-label="Lab target (domain or IP)"
            />
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={useLiveData}
                onChange={(e) => setUseLiveData(e.target.checked)}
                aria-label="Enable live fetch"
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
          {dataset?.commandBuilder && (
            <section className="mt-4 bg-gray-800/80 border border-gray-700 rounded p-3" aria-labelledby="reconng-command-builder">
              <div className="flex flex-col gap-3">
                <div>
                  <h3 id="reconng-command-builder" className="text-sm font-semibold">
                    {dataset.commandBuilder.title || 'Command Builder'}
                  </h3>
                  {dataset.commandBuilder.description && (
                    <p className="text-xs text-gray-300 mt-1">
                      {dataset.commandBuilder.description}
                    </p>
                  )}
                </div>
                {(dataset.commandBuilder.commands || []).length > 0 && (
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="reconng-command-select"
                      className="text-xs font-semibold uppercase tracking-wide"
                    >
                      Scenario
                    </label>
                    <select
                      id="reconng-command-select"
                      value={selectedCommandId || ''}
                      onChange={(e) => handleCommandSelect(e.target.value)}
                      className="bg-gray-900 border border-gray-700 px-2 py-1 text-sm"
                    >
                      {(dataset.commandBuilder.commands || []).map((command) => (
                        <option key={command.id} value={command.id}>
                          {command.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {selectedCommand && (
                  <div className="flex flex-col gap-3">
                    {selectedCommand.description && (
                      <p className="text-xs text-gray-300">{selectedCommand.description}</p>
                    )}
                    {(selectedCommand.placeholders || []).map((placeholder) => {
                      const placeholderId = `placeholder-${
                        placeholder.token.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'value'
                      }`;
                      return (
                        <div key={placeholder.token} className="flex flex-col gap-1">
                          <label
                            htmlFor={placeholderId}
                            className="text-xs font-semibold uppercase tracking-wide"
                          >
                            {placeholder.label}
                          </label>
                          {placeholder.values?.length ? (
                            <select
                              id={placeholderId}
                              value={commandValues[placeholder.token] || ''}
                              onChange={(e) => handlePlaceholderChange(placeholder.token, e.target.value)}
                              className="bg-gray-900 border border-gray-700 px-2 py-1 text-sm"
                              aria-label={placeholder.label}
                            >
                              {placeholder.values.map((value) => (
                                <option key={value} value={value}>
                                  {value}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              id={placeholderId}
                              type="text"
                              value={commandValues[placeholder.token] || ''}
                              onChange={(e) => handlePlaceholderChange(placeholder.token, e.target.value)}
                              className="bg-gray-900 border border-gray-700 px-2 py-1 text-sm"
                              aria-label={placeholder.label}
                            />
                          )}
                          {placeholder.helperText && (
                            <p className="text-[11px] text-gray-400">{placeholder.helperText}</p>
                          )}
                        </div>
                      );
                    })}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide mb-1">Console steps</h4>
                      <pre className="bg-black border border-gray-700 text-xs p-2 whitespace-pre-wrap" aria-live="polite">
                        {commandPreview}
                      </pre>
                    </div>
                    {safeOutputPreview && (
                      <p className="text-xs text-green-300" aria-live="polite">
                        {safeOutputPreview}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}
          <div role="status" aria-live="polite" className="sr-only">
            {ariaMessage}
          </div>
        </>
      )}
      {view === 'builder' && chainData && (
        <>
          <button
            type="button"
            onClick={runChain}
            className="mb-2 bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded"
          >
            Run Chain
          </button>
          <div className="bg-black p-2" style={{ height: '300px' }}>
            <CytoscapeComponent
              elements={[...chainData.chain.nodes, ...chainData.chain.edges]}
              stylesheet={stylesheet}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </>
      )}
      {view === 'playbooks' && (
        <div className="flex-1 overflow-auto space-y-4 pr-1">
          {dataset?.playbooks?.length ? (
            dataset.playbooks.map((playbook) => (
              <section
                key={playbook.id}
                className="bg-gray-800/80 border border-gray-700 rounded p-3"
                aria-labelledby={`playbook-${playbook.id}`}
              >
                <h3 id={`playbook-${playbook.id}`} className="text-sm font-semibold">
                  {playbook.title}
                </h3>
                {playbook.description && (
                  <p className="text-xs text-gray-300 mt-1">{playbook.description}</p>
                )}
                <ol className="list-decimal pl-5 text-xs text-gray-200 space-y-2 mt-3">
                  {(playbook.steps || []).map((step, idx) => (
                    <li key={step.title || `step-${idx}`} className="space-y-1">
                      <p className="font-semibold text-xs text-white">{step.title}</p>
                      {step.details && <p className="text-xs text-gray-300">{step.details}</p>}
                      {step.artifacts?.length ? (
                        <p className="text-[11px] text-gray-400">
                          <span className="font-semibold text-gray-300">Artifacts:</span>{' '}
                          {step.artifacts.join(', ')}
                        </p>
                      ) : null}
                      {step.expect && (
                        <p className="text-[11px] text-gray-400">
                          <span className="font-semibold text-gray-300">Expected result:</span>{' '}
                          {step.expect}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            ))
          ) : (
            <p className="text-sm text-gray-300">Playbook data failed to load. Refresh to retry.</p>
          )}
        </div>
      )}
      {view === 'reports' && <ReportTemplates />}
      {view === 'settings' && (
        <div className="flex-1 overflow-auto">
          {allModules.map((m) => {
            const apiKeyId = `api-key-${m.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            return (
              <div key={m} className="mb-2">
                <label className="block mb-1" htmlFor={apiKeyId}>{`${m} API Key`}</label>
                <div className="flex">
                  <input
                    id={apiKeyId}
                    type={showApiKeys[m] ? 'text' : 'password'}
                    value={apiKeys[m] || ''}
                    onChange={(e) => setApiKeys({ ...apiKeys, [m]: e.target.value })}
                    className="flex-1 bg-gray-800 px-2 py-1"
                    placeholder={`${m} API Key`}
                    aria-label={`${m} API Key`}
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
            );
          })}
        </div>
      )}
      {view === 'marketplace' && (
        <ul className="list-disc pl-5 space-y-3 pr-1 overflow-auto">
          {marketplace.map((module) => {
            const moduleKey = module.name;
            const tagsForModule = scriptTags[moduleKey] || [];
            return (
              <li key={moduleKey} className="bg-gray-800/60 border border-gray-700 rounded p-3 list-none">
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-sm">{module.name}</h4>
                      {module.summary && (
                        <p className="text-xs text-gray-300 mt-1">{module.summary}</p>
                      )}
                    </div>
                    {module.recommendedTags?.length ? (
                      <div className="flex flex-wrap gap-1" aria-label="Recommended tags">
                        {module.recommendedTags.map((tag) => (
                          <span key={tag} className="bg-gray-700 px-1.5 py-0.5 text-[11px] rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {module.simulatedSteps?.length ? (
                    <ol className="list-decimal pl-5 text-[11px] text-gray-400 space-y-1">
                      {module.simulatedSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <label htmlFor={`tag-${moduleKey}`} className="text-xs">
                      Add tag
                    </label>
                    <input
                      id={`tag-${moduleKey}`}
                      type="text"
                      value={tagInputs[moduleKey] || ''}
                      onChange={(e) => setTagInputs({ ...tagInputs, [moduleKey]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && tagInputs[moduleKey]) {
                          const tag = tagInputs[moduleKey].trim();
                          if (tag) {
                            setScriptTags({
                              ...scriptTags,
                              [moduleKey]: [...tagsForModule, tag],
                            });
                          }
                          setTagInputs({ ...tagInputs, [moduleKey]: '' });
                        }
                      }}
                      placeholder={`Tag ${moduleKey}`}
                      className="bg-gray-900 border border-gray-700 px-1 py-0.5 text-xs flex-1"
                      aria-label={`Tag ${moduleKey}`}
                    />
                  </div>
                  {tagsForModule.length > 0 && (
                    <div className="mt-1 flex gap-1 flex-wrap">
                      {tagsForModule.map((tag) => (
                        <span key={tag} className="bg-gray-700 px-1 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ReconNG;

export const displayReconNG = () => <ReconNG />;

