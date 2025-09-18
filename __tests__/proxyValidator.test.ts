import {
  detectCycles,
  detectDuplicateNodes,
  findUnreachableEndpoints,
  ProxyChainDefinition,
  ProxyChainNode,
  ProxyHealthMap,
  validateProxyChain,
} from '../utils/proxyValidator';

describe('proxyValidator helpers', () => {
  const makeChain = (nodes: ProxyChainNode[], entryId = nodes[0]?.id ?? ''): ProxyChainDefinition => ({
    entryId,
    nodes,
  });

  it('detects duplicate nodes', () => {
    const nodes: ProxyChainNode[] = [
      { id: 'a', type: 'proxy', next: ['b'] },
      { id: 'a', type: 'proxy', next: ['c'] },
      { id: 'c', type: 'endpoint', next: [] },
    ];
    const duplicates = detectDuplicateNodes(nodes);
    expect(duplicates).toEqual(['a']);
  });

  it('detects cycles within the chain graph', () => {
    const nodes: ProxyChainNode[] = [
      { id: 'entry', type: 'proxy', next: ['a'] },
      { id: 'a', type: 'proxy', next: ['b'] },
      { id: 'b', type: 'proxy', next: ['entry'] },
      { id: 'exit', type: 'endpoint', next: [] },
    ];
    const cycles = detectCycles(makeChain(nodes));
    const flattened = cycles.flat();
    expect(flattened).toContain('entry');
    expect(flattened).toContain('a');
    expect(flattened).toContain('b');
  });

  it('identifies endpoints unreachable due to unhealthy proxies', () => {
    const nodes: ProxyChainNode[] = [
      { id: 'entry', type: 'proxy', next: ['proxy-1'] },
      { id: 'proxy-1', type: 'proxy', next: ['proxy-2'] },
      { id: 'proxy-2', type: 'proxy', next: ['target'] },
      { id: 'target', type: 'endpoint', next: [] },
    ];
    const health: ProxyHealthMap = {
      entry: 'healthy',
      'proxy-1': 'down',
      'proxy-2': 'healthy',
      target: 'healthy',
    };
    const unreachable = findUnreachableEndpoints(makeChain(nodes, 'entry'), health);
    expect(unreachable).toEqual(['target']);
  });

  it('flags health failures when validating complete chain', () => {
    const nodes: ProxyChainNode[] = [
      { id: 'entry', type: 'proxy', next: ['proxy-1'] },
      { id: 'proxy-1', type: 'proxy', next: ['target'] },
      { id: 'target', type: 'endpoint', next: [] },
    ];
    const health: ProxyHealthMap = {
      entry: 'healthy',
      'proxy-1': 'healthy',
      target: 'offline',
    };
    const issues = validateProxyChain(makeChain(nodes, 'entry'), health);
    const unreachable = issues.find((issue) => issue.type === 'unreachable-endpoint');
    expect(unreachable).toBeDefined();
    expect(unreachable?.nodes).toContain('target');
  });
});
