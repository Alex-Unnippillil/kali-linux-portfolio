// Utility helpers for validating proxy chains

export type ProxyNodeType = 'proxy' | 'endpoint';

export interface ProxyChainNode {
  id: string;
  type: ProxyNodeType;
  next: string[];
}

export interface ProxyChainDefinition {
  entryId: string;
  nodes: ProxyChainNode[];
}

export type ProxyHealthStatus =
  | 'healthy'
  | 'degraded'
  | 'warning'
  | 'down'
  | 'offline'
  | 'unknown'
  | string;

export type ProxyHealthMap = Record<string, ProxyHealthStatus | undefined>;

export type ProxyValidationIssueType =
  | 'duplicate-node'
  | 'cycle'
  | 'unreachable-endpoint';

export interface ProxyValidationIssue {
  type: ProxyValidationIssueType;
  nodes: string[];
  message: string;
}

const NON_HEALTHY_STATUSES = new Set([
  'down',
  'offline',
  'failed',
  'unknown',
]);

const normalizeId = (id: string) => id.trim();

const normalizeStatus = (status?: ProxyHealthStatus) =>
  status ? String(status).toLowerCase() : '';

const isNodeHealthy = (status?: ProxyHealthStatus) =>
  !NON_HEALTHY_STATUSES.has(normalizeStatus(status));

const buildNodeMap = (nodes: ProxyChainNode[]) => {
  const map = new Map<string, ProxyChainNode>();
  nodes.forEach((node) => {
    map.set(normalizeId(node.id), {
      ...node,
      id: normalizeId(node.id),
      next: node.next
        .map((n) => normalizeId(n))
        .filter((n, index, arr) => n.length > 0 && arr.indexOf(n) === index),
    });
  });
  return map;
};

export const detectDuplicateNodes = (nodes: ProxyChainNode[]) => {
  const seen = new Map<string, number>();
  const duplicates = new Set<string>();
  nodes.forEach((node) => {
    const id = normalizeId(node.id);
    const count = (seen.get(id) ?? 0) + 1;
    seen.set(id, count);
    if (count > 1) {
      duplicates.add(id);
    }
  });
  return Array.from(duplicates);
};

export const detectCycles = (chain: ProxyChainDefinition) => {
  const nodeMap = buildNodeMap(chain.nodes);
  const visited = new Set<string>();
  const stack: string[] = [];
  const stackIndex = new Map<string, number>();
  const cycles: string[][] = [];
  const recorded = new Set<string>();

  const pushCycle = (cycleNodes: string[]) => {
    const normalizedCycle = Array.from(new Set(cycleNodes));
    if (!normalizedCycle.length) return;
    const key = normalizedCycle
      .slice()
      .sort()
      .join('>');
    if (!recorded.has(key)) {
      recorded.add(key);
      cycles.push(normalizedCycle);
    }
  };

  const dfs = (nodeId: string) => {
    const id = normalizeId(nodeId);
    if (stackIndex.has(id)) {
      const startIndex = stackIndex.get(id) ?? 0;
      const cycleNodes = stack.slice(startIndex);
      cycleNodes.push(id);
      pushCycle(cycleNodes);
      return;
    }
    if (visited.has(id)) return;
    visited.add(id);
    stack.push(id);
    stackIndex.set(id, stack.length - 1);
    const node = nodeMap.get(id);
    if (node) {
      node.next.forEach((nextId) => {
        if (nodeMap.has(nextId)) {
          dfs(nextId);
        }
      });
    }
    stack.pop();
    stackIndex.delete(id);
  };

  chain.nodes.forEach((node) => {
    const id = normalizeId(node.id);
    if (!visited.has(id)) {
      dfs(id);
    }
  });

  return cycles;
};

export const findUnreachableEndpoints = (
  chain: ProxyChainDefinition,
  health: ProxyHealthMap,
) => {
  const nodeMap = buildNodeMap(chain.nodes);
  const reachable = new Set<string>();
  const queue: string[] = [];
  const entryId = normalizeId(chain.entryId);
  const entryNode = nodeMap.get(entryId);

  if (entryNode && isNodeHealthy(health[entryId])) {
    reachable.add(entryId);
    queue.push(entryId);
  }

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentNode = nodeMap.get(currentId);
    if (!currentNode) continue;
    if (!isNodeHealthy(health[currentId])) continue;
    currentNode.next.forEach((nextId) => {
      if (!nodeMap.has(nextId)) return;
      if (!reachable.has(nextId)) {
        reachable.add(nextId);
      }
      if (isNodeHealthy(health[nextId])) {
        if (!queue.includes(nextId)) {
          queue.push(nextId);
        }
      }
    });
  }

  const endpoints = chain.nodes.filter((node) => node.type === 'endpoint');
  const unreachable = new Set<string>();
  endpoints.forEach((endpoint) => {
    const id = normalizeId(endpoint.id);
    if (!reachable.has(id)) {
      unreachable.add(id);
      return;
    }
    if (!isNodeHealthy(health[id])) {
      unreachable.add(id);
    }
  });

  // If the entry itself is missing or unhealthy, mark all endpoints as unreachable
  if (!entryNode || !isNodeHealthy(health[entryId])) {
    endpoints.forEach((endpoint) => unreachable.add(normalizeId(endpoint.id)));
  }

  return Array.from(unreachable);
};

export const validateProxyChain = (
  chain: ProxyChainDefinition,
  health: ProxyHealthMap,
): ProxyValidationIssue[] => {
  const issues: ProxyValidationIssue[] = [];

  const duplicates = detectDuplicateNodes(chain.nodes);
  if (duplicates.length) {
    issues.push({
      type: 'duplicate-node',
      nodes: duplicates,
      message: `Duplicate nodes detected: ${duplicates.join(', ')}`,
    });
  }

  const cycles = detectCycles(chain);
  if (cycles.length) {
    cycles.forEach((cycle) => {
      issues.push({
        type: 'cycle',
        nodes: cycle,
        message: `Cycle detected in path: ${cycle.join(' → ')}`,
      });
    });
  }

  const unreachable = findUnreachableEndpoints(chain, health);
  if (unreachable.length) {
    issues.push({
      type: 'unreachable-endpoint',
      nodes: unreachable,
      message: `Unreachable endpoints: ${unreachable.join(', ')}`,
    });
  }

  return issues;
};

export type {
  ProxyChainNode as ProxyChainNodeDefinition,
  ProxyChainDefinition as ProxyChain,
};
