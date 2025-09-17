'use client';

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export interface ExplorerNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: ExplorerNode[];
}

interface ExplorerProps {
  tree: ExplorerNode[];
  className?: string;
  onOpen?: (node: ExplorerNode) => void;
  onSelect?: (node: ExplorerNode) => void;
  initialExpandedIds?: string[];
  rowHeight?: number;
  overscan?: number;
}

interface FlattenedNode {
  node: ExplorerNode;
  depth: number;
  parentId: string | null;
  isLeaf: boolean;
  isExpanded: boolean;
}

const DEFAULT_ROW_HEIGHT = 24;
const DEFAULT_OVERSCAN = 6;
const DOM_ID_PREFIX = 'vscode-explorer-item-';

const sanitizedDomId = (id: string) =>
  `${DOM_ID_PREFIX}${id.replace(/[^A-Za-z0-9_-]/g, '_')}`;

function flattenTree(
  nodes: ExplorerNode[],
  expanded: Set<string>,
  depth = 0,
  parentId: string | null = null,
  acc: FlattenedNode[] = []
): FlattenedNode[] {
  for (const node of nodes) {
    const children = node.children ?? [];
    const isLeaf = children.length === 0;
    const isExpanded = !isLeaf && expanded.has(node.id);
    acc.push({ node, depth, parentId, isLeaf, isExpanded });
    if (!isLeaf && isExpanded) {
      flattenTree(children, expanded, depth + 1, node.id, acc);
    }
  }
  return acc;
}

const Explorer: React.FC<ExplorerProps> = ({
  tree,
  className,
  onOpen,
  onSelect,
  initialExpandedIds,
  rowHeight = DEFAULT_ROW_HEIGHT,
  overscan = DEFAULT_OVERSCAN,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const { nodeMap, parentMap } = useMemo(() => {
    const nodes = new Map<string, ExplorerNode>();
    const parents = new Map<string, string | null>();

    const walk = (items: ExplorerNode[], parent: string | null) => {
      for (const item of items) {
        nodes.set(item.id, item);
        parents.set(item.id, parent);
        if (item.children?.length) {
          walk(item.children, item.id);
        }
      }
    };

    walk(tree, null);
    return { nodeMap: nodes, parentMap: parents } as const;
  }, [tree]);

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>(initialExpandedIds ?? []);
    // Expand the first folder by default if nothing provided.
    if (!initialExpandedIds) {
      for (const node of tree) {
        if (node.children?.length) {
          initial.add(node.id);
          break;
        }
      }
    }
    return initial;
  });

  useEffect(() => {
    if (initialExpandedIds) {
      setExpanded(new Set(initialExpandedIds));
    }
  }, [initialExpandedIds]);

  const flatNodes = useMemo(
    () => flattenTree(tree, expanded),
    [tree, expanded]
  );

  const firstNodeId = flatNodes.length ? flatNodes[0].node.id : null;
  const [activeId, setActiveId] = useState<string | null>(firstNodeId);

  useEffect(() => {
    if (!flatNodes.length) {
      if (activeId !== null) {
        setActiveId(null);
      }
      return;
    }

    const exists = activeId
      ? flatNodes.some((item) => item.node.id === activeId)
      : false;
    if (!exists) {
      setActiveId((prev) => {
        if (prev && flatNodes.some((item) => item.node.id === prev)) {
          return prev;
        }
        return flatNodes[0].node.id;
      });
    }
  }, [flatNodes, activeId]);

  useEffect(() => {
    if (!activeId || !onSelect) return;
    const node = nodeMap.get(activeId);
    if (node) {
      onSelect(node);
    }
  }, [activeId, nodeMap, onSelect]);

  const activeIndex = useMemo(() => {
    if (!activeId) return -1;
    return flatNodes.findIndex((item) => item.node.id === activeId);
  }, [flatNodes, activeId]);

  const ensureVisible = useCallback(
    (index: number) => {
      if (!containerRef.current || index < 0 || viewportHeight <= 0) {
        return;
      }
      const top = index * rowHeight;
      const bottom = top + rowHeight;
      const viewTop = containerRef.current.scrollTop;
      const viewBottom = viewTop + viewportHeight;

      if (top < viewTop) {
        containerRef.current.scrollTop = top;
        setScrollTop(top);
      } else if (bottom > viewBottom) {
        const next = bottom - viewportHeight;
        containerRef.current.scrollTop = next;
        setScrollTop(next);
      }
    },
    [rowHeight, viewportHeight]
  );

  useEffect(() => {
    if (activeIndex >= 0) {
      ensureVisible(activeIndex);
    }
  }, [activeIndex, ensureVisible]);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      const height = rect.height || element.clientHeight;
      setViewportHeight(height);
    };

    measure();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => measure());
      observer.observe(element);
      return () => observer.disconnect();
    }

    return undefined;
  }, []);

  const isDescendant = useCallback(
    (ancestorId: string, maybeDescendantId: string | null) => {
      if (!maybeDescendantId) return false;
      let current: string | null | undefined = maybeDescendantId;
      while (current) {
        if (current === ancestorId) return true;
        current = parentMap.get(current) ?? null;
      }
      return false;
    },
    [parentMap]
  );

  const toggleNode = useCallback(
    (node: ExplorerNode) => {
      if (!node.children?.length) return;
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) {
          next.delete(node.id);
          setActiveId((current) =>
            current && isDescendant(node.id, current) ? node.id : current
          );
        } else {
          next.add(node.id);
        }
        return next;
      });
    },
    [isDescendant]
  );

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(event.currentTarget.scrollTop);
    },
    []
  );

  const totalHeight = flatNodes.length * rowHeight;
  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / rowHeight) - overscan
  );
  const endIndex = Math.min(
    flatNodes.length,
    Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan
  );
  const visibleNodes = flatNodes.slice(startIndex, endIndex);
  const offsetY = startIndex * rowHeight;

  const onRowSelect = useCallback(
    (node: ExplorerNode) => {
      setActiveId(node.id);
    },
    []
  );

  const onRowActivate = useCallback(
    (node: ExplorerNode) => {
      if (node.children?.length) {
        toggleNode(node);
      } else {
        onOpen?.(node);
      }
    },
    [onOpen, toggleNode]
  );

  const focusNext = useCallback(
    (delta: number) => {
      if (!flatNodes.length) return;
      let nextIndex = activeIndex + delta;
      nextIndex = Math.max(0, Math.min(flatNodes.length - 1, nextIndex));
      const nextNode = flatNodes[nextIndex]?.node;
      if (nextNode) {
        setActiveId(nextNode.id);
      }
    },
    [activeIndex, flatNodes]
  );

  const focusFirst = useCallback(() => {
    if (!flatNodes.length) return;
    setActiveId(flatNodes[0].node.id);
  }, [flatNodes]);

  const focusLast = useCallback(() => {
    if (!flatNodes.length) return;
    setActiveId(flatNodes[flatNodes.length - 1].node.id);
  }, [flatNodes]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!flatNodes.length) return;

      const current = activeIndex >= 0 ? flatNodes[activeIndex] : null;
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          focusNext(1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          focusNext(-1);
          break;
        case 'ArrowRight':
          if (!current) break;
          event.preventDefault();
          if (!current.isLeaf && !current.isExpanded) {
            toggleNode(current.node);
          } else if (!current.isLeaf && current.isExpanded) {
            focusNext(1);
          }
          break;
        case 'ArrowLeft':
          if (!current) break;
          event.preventDefault();
          if (!current.isLeaf && current.isExpanded) {
            toggleNode(current.node);
          } else if (current.parentId) {
            setActiveId(current.parentId);
          }
          break;
        case 'Home':
          event.preventDefault();
          focusFirst();
          break;
        case 'End':
          event.preventDefault();
          focusLast();
          break;
        case 'Enter':
        case ' ': {
          if (!current) break;
          event.preventDefault();
          if (current.isLeaf) {
            onOpen?.(current.node);
          } else {
            toggleNode(current.node);
          }
          break;
        }
        default:
          break;
      }
    },
    [
      activeIndex,
      flatNodes,
      focusFirst,
      focusLast,
      focusNext,
      onOpen,
      toggleNode,
    ]
  );

  const combinedClassName = [
    'relative h-full overflow-auto focus:outline-none text-sm text-gray-100',
    className ?? '',
  ]
    .join(' ')
    .trim();

  return (
    <div
      ref={containerRef}
      role="tree"
      tabIndex={0}
      className={combinedClassName}
      onKeyDown={handleKeyDown}
      onScroll={handleScroll}
      aria-activedescendant={activeId ? sanitizedDomId(activeId) : undefined}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
          }}
        >
          {visibleNodes.map(({ node, depth, isLeaf, isExpanded }) => {
            const isActive = node.id === activeId;
            return (
              <div
                key={node.id}
                id={sanitizedDomId(node.id)}
                role="treeitem"
                aria-level={depth + 1}
                aria-expanded={
                  isLeaf ? undefined : isExpanded ? true : false
                }
                aria-selected={isActive}
                className={`flex h-6 cursor-pointer items-center gap-2 px-2 ${
                  isActive ? 'bg-blue-600 text-white' : 'hover:bg-blue-600/30'
                }`}
                style={{ paddingLeft: depth * 16 + 8, height: rowHeight }}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onRowSelect(node)}
                onDoubleClick={() => onRowActivate(node)}
              >
                {!isLeaf && (
                  <button
                    type="button"
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    className="flex h-4 w-4 items-center justify-center rounded text-[10px] text-current"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleNode(node);
                    }}
                  >
                    {isExpanded ? '▾' : '▸'}
                  </button>
                )}
                <span className="truncate">{node.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Explorer;

