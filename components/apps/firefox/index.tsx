import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { FirefoxSimulationView, SIMULATIONS, toSimulationKey } from './simulations';

const DEFAULT_URL = 'https://www.kali.org/docs/';
const STORAGE_KEY = 'firefox:last-url';
const START_URL_KEY = 'firefox:start-url';
const BOOKMARK_STORAGE_KEY = 'firefox:bookmarks';

type BookmarkItem = {
  id: string;
  type: 'bookmark';
  label: string;
  url: string;
};

type BookmarkFolder = {
  id: string;
  type: 'folder';
  label: string;
  items: Array<BookmarkFolder | BookmarkItem>;
};

type BookmarkNode = BookmarkItem | BookmarkFolder;

const DEFAULT_BOOKMARKS: BookmarkNode[] = [
  { id: 'bookmark-offsec', type: 'bookmark', label: 'OffSec', url: 'https://www.offsec.com/?utm_source=kali&utm_medium=os&utm_campaign=firefox' },
  { id: 'bookmark-kali-linux', type: 'bookmark', label: 'Kali Linux', url: 'https://www.kali.org/' },
  { id: 'bookmark-kali-tools', type: 'bookmark', label: 'Kali Tools', url: 'https://www.kali.org/tools/' },
  { id: 'bookmark-kali-docs', type: 'bookmark', label: 'Kali Docs', url: 'https://www.kali.org/docs/' },
  { id: 'bookmark-kali-forums', type: 'bookmark', label: 'Kali Forums', url: 'https://forums.kali.org/' },
  { id: 'bookmark-kali-nethunter', type: 'bookmark', label: 'Kali NetHunter', url: 'https://www.kali.org/get-kali/#kali-platforms' },
  { id: 'bookmark-exploit-db', type: 'bookmark', label: 'Exploit-DB', url: 'https://www.exploit-db.com/' },
  {
    id: 'bookmark-google-hacking-db',
    type: 'bookmark',
    label: 'GoogleHackingDB',
    url: 'https://www.exploit-db.com/google-hacking-database',
  },
];

const cloneNodes = (nodes: BookmarkNode[]): BookmarkNode[] =>
  nodes.map((node) =>
    node.type === 'folder'
      ? { ...node, items: cloneNodes(node.items) }
      : { ...node }
  );

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `bookmark-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const containsNode = (node: BookmarkNode, id: string): boolean => {
  if (node.type !== 'folder') {
    return false;
  }
  return node.items.some((child) => child.id === id || containsNode(child, id));
};

type ExtractResult = {
  node: BookmarkNode;
  parentId: string | null;
  index: number;
  updatedNodes: BookmarkNode[];
};

const extractNode = (nodes: BookmarkNode[], id: string, parentId: string | null = null): ExtractResult | null => {
  const index = nodes.findIndex((item) => item.id === id);
  if (index !== -1) {
    const node = nodes[index];
    const updatedNodes = [...nodes.slice(0, index), ...nodes.slice(index + 1)];
    return { node, parentId, index, updatedNodes };
  }

  for (let i = 0; i < nodes.length; i += 1) {
    const item = nodes[i];
    if (item.type === 'folder') {
      const extracted = extractNode(item.items, id, item.id);
      if (extracted) {
        const updatedFolder: BookmarkFolder = { ...item, items: extracted.updatedNodes };
        const updatedNodes = [...nodes];
        updatedNodes[i] = updatedFolder;
        return { ...extracted, updatedNodes };
      }
    }
  }

  return null;
};

const insertNode = (
  nodes: BookmarkNode[],
  parentId: string | null,
  index: number,
  node: BookmarkNode
): BookmarkNode[] => {
  if (parentId === null) {
    const nextNodes = [...nodes];
    const clampedIndex = Math.max(0, Math.min(index, nextNodes.length));
    nextNodes.splice(clampedIndex, 0, node);
    return nextNodes;
  }

  let changed = false;
  const nextNodes = nodes.map((item) => {
    if (item.type !== 'folder') {
      return item;
    }
    if (item.id === parentId) {
      const nextItems = [...item.items];
      const clampedIndex = Math.max(0, Math.min(index, nextItems.length));
      nextItems.splice(clampedIndex, 0, node);
      changed = true;
      return { ...item, items: nextItems };
    }
    const nextItems = insertNode(item.items, parentId, index, node);
    if (nextItems !== item.items) {
      changed = true;
      return { ...item, items: nextItems };
    }
    return item;
  });

  return changed ? nextNodes : nodes;
};

const moveBookmark = (nodes: BookmarkNode[], id: string, targetParentId: string | null, targetIndex: number) => {
  const extracted = extractNode(nodes, id);
  if (!extracted) {
    return nodes;
  }

  const { node, parentId: sourceParentId, index: sourceIndex, updatedNodes } = extracted;
  if (node.type === 'folder' && targetParentId && containsNode(node, targetParentId)) {
    return nodes;
  }

  let nextIndex = targetIndex;
  if (sourceParentId === targetParentId && sourceIndex < targetIndex) {
    nextIndex -= 1;
  }

  return insertNode(updatedNodes, targetParentId, nextIndex, node);
};

const collectFolderIds = (nodes: BookmarkNode[], acc: Set<string> = new Set()): Set<string> => {
  nodes.forEach((node) => {
    if (node.type === 'folder') {
      acc.add(node.id);
      collectFolderIds(node.items, acc);
    }
  });
  return acc;
};

const sanitiseNodes = (value: unknown): BookmarkNode[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const nodes: BookmarkNode[] = [];

  value.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return;
    }
    const typed = item as Partial<BookmarkNode> & { items?: unknown };

    if (typed.type === 'bookmark' && typeof typed.label === 'string' && typeof typed.url === 'string') {
      nodes.push({
        id: typeof typed.id === 'string' ? typed.id : createId(),
        type: 'bookmark',
        label: typed.label,
        url: typed.url,
      });
      return;
    }

    if (typed.type === 'folder' && typeof typed.label === 'string') {
      const children = sanitiseNodes(typed.items);
      if (children) {
        nodes.push({
          id: typeof typed.id === 'string' ? typed.id : createId(),
          type: 'folder',
          label: typed.label,
          items: children,
        });
      }
    }
  });

  return nodes;
};

const findNodeById = (nodes: BookmarkNode[], id: string): BookmarkNode | null => {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    if (node.type === 'folder') {
      const found = findNodeById(node.items, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

const collectFolderIdsFromNode = (node: BookmarkNode, acc: Set<string> = new Set()): Set<string> => {
  if (node.type === 'folder') {
    acc.add(node.id);
    node.items.forEach((child) => collectFolderIdsFromNode(child, acc));
  }
  return acc;
};

const updateNodeById = (
  nodes: BookmarkNode[],
  id: string,
  updater: (node: BookmarkNode) => BookmarkNode | null
): BookmarkNode[] => {
  let changed = false;
  const nextNodes: BookmarkNode[] = [];

  nodes.forEach((node) => {
    if (node.id === id) {
      const updated = updater(node);
      if (updated) {
        nextNodes.push(updated);
      }
      changed = true;
      return;
    }

    if (node.type === 'folder') {
      const nextItems = updateNodeById(node.items, id, updater);
      if (nextItems !== node.items) {
        nextNodes.push({ ...node, items: nextItems });
        changed = true;
        return;
      }
    }

    nextNodes.push(node);
  });

  return changed ? nextNodes : nodes;
};

type DropZoneProps = {
  parentId: string | null;
  index: number;
  isDragging: boolean;
  onDrop: (parentId: string | null, index: number) => void;
};

const DropZone: React.FC<DropZoneProps> = ({ parentId, index, isDragging, onDrop }) => {
  const [isActive, setIsActive] = useState(false);

  return (
    <li role="presentation">
      <div
        data-testid="bookmark-dropzone"
        className={`my-1 h-2 w-full rounded border border-dashed transition-colors ${
          isActive ? 'border-blue-400 bg-blue-400/30' : isDragging ? 'border-transparent bg-gray-800/40' : 'border-transparent'
        }`}
        aria-hidden="true"
        onDragEnter={() => setIsActive(true)}
        onDragLeave={() => setIsActive(false)}
        onDragOver={(event) => {
          event.preventDefault();
          if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsActive(false);
          onDrop(parentId, index);
        }}
      />
    </li>
  );
};

type BookmarkListProps = {
  nodes: BookmarkNode[];
  parentId: string | null;
  expandedFolders: Set<string>;
  draggingId: string | null;
  onToggleFolder: (id: string) => void;
  onOpenBookmark: (url: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onDropAt: (parentId: string | null, index: number) => void;
  onDropInto: (parentId: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
};

const BookmarkList: React.FC<BookmarkListProps> = ({
  nodes,
  parentId,
  expandedFolders,
  draggingId,
  onToggleFolder,
  onOpenBookmark,
  onRename,
  onDelete,
  onDropAt,
  onDropInto,
  onDragStart,
  onDragEnd,
}) => (
  <ul className={`flex flex-col gap-1 ${parentId ? 'ml-4 border-l border-gray-800 pl-3' : ''}`}>
    {nodes.map((node, index) => {
      const isFolder = node.type === 'folder';
      const expanded = isFolder ? expandedFolders.has(node.id) : false;

      return (
        <React.Fragment key={node.id}>
          <DropZone parentId={parentId} index={index} isDragging={Boolean(draggingId)} onDrop={onDropAt} />
          <li
            className="flex flex-col gap-1"
            draggable
            onDragStart={(event) => {
              if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
              }
              onDragStart(node.id);
            }}
            onDragEnd={() => onDragEnd()}
            onDragOver={(event) => {
              if (!isFolder) {
                return;
              }
              event.preventDefault();
              if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'move';
              }
            }}
            onDrop={(event) => {
              if (!isFolder) {
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              onDropInto(node.id);
            }}
          >
            <div className="flex items-center justify-between gap-2 rounded bg-gray-800 px-3 py-1 text-gray-200 shadow-inner">
              <div className="flex flex-1 items-center gap-2">
                {isFolder ? (
                  <button
                    type="button"
                    onClick={() => onToggleFolder(node.id)}
                    className="flex items-center gap-2 rounded px-2 py-1 text-left font-semibold text-gray-100 transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    aria-expanded={expanded}
                    aria-controls={`bookmark-folder-${node.id}`}
                  >
                    <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
                    <span>{node.label}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenBookmark(node.url)}
                    className="flex-1 rounded px-2 py-1 text-left font-medium text-gray-100 transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {node.label}
                  </button>
                )}
              </div>
              <div className="flex flex-none items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => onRename(node.id)}
                  className="rounded bg-gray-700 px-2 py-1 text-gray-200 transition hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  aria-label={`Rename ${node.label}`}
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(node.id)}
                  className="rounded bg-gray-700 px-2 py-1 text-gray-200 transition hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-red-400"
                  aria-label={`Delete ${node.label}`}
                >
                  Delete
                </button>
              </div>
            </div>
            {isFolder && expanded ? (
              <div id={`bookmark-folder-${node.id}`} className="pl-4 pt-1">
                {node.items.length > 0 ? (
                  <BookmarkList
                    nodes={node.items}
                    parentId={node.id}
                    expandedFolders={expandedFolders}
                    draggingId={draggingId}
                    onToggleFolder={onToggleFolder}
                    onOpenBookmark={onOpenBookmark}
                    onRename={onRename}
                    onDelete={onDelete}
                    onDropAt={onDropAt}
                    onDropInto={onDropInto}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                  />
                ) : (
                  <p className="rounded bg-gray-900 px-3 py-2 text-[11px] text-gray-400">Empty folder</p>
                )}
              </div>
            ) : null}
          </li>
        </React.Fragment>
      );
    })}
    <DropZone parentId={parentId} index={nodes.length} isDragging={Boolean(draggingId)} onDrop={onDropAt} />
  </ul>
);

const normaliseUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_URL;
  }
  try {
    const hasProtocol = /^(https?:)?\/\//i.test(trimmed);
    if (hasProtocol) {
      const url = new URL(trimmed, window.location.href);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return url.toString();
      }
      return DEFAULT_URL;
    }
    const candidate = new URL(`https://${trimmed}`);
    return candidate.toString();
  } catch {
    return DEFAULT_URL;
  }
};

const getSimulation = (value: string) => {
  const key = toSimulationKey(value);
  if (!key) {
    return null;
  }
  return SIMULATIONS[key] ?? null;
};

const Firefox: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<BookmarkNode[]>(() => cloneNodes(DEFAULT_BOOKMARKS));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set());

  const initialUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_URL;
    }
    try {
      const start = sessionStorage.getItem(START_URL_KEY);
      if (start) {
        sessionStorage.removeItem(START_URL_KEY);
        const url = normaliseUrl(start);
        localStorage.setItem(STORAGE_KEY, url);
        return url;
      }
      const last = localStorage.getItem(STORAGE_KEY);
      return last ? normaliseUrl(last) : DEFAULT_URL;
    } catch {
      return DEFAULT_URL;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const stored = localStorage.getItem(BOOKMARK_STORAGE_KEY);
      if (stored) {
        const parsed = sanitiseNodes(JSON.parse(stored));
        if (parsed) {
          setBookmarks(parsed);
          setExpandedFolders((prev) => (prev.size === 0 ? collectFolderIds(parsed) : prev));
          return;
        }
      }
      const defaults = cloneNodes(DEFAULT_BOOKMARKS);
      setBookmarks(defaults);
      localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(defaults));
      setExpandedFolders((prev) => (prev.size === 0 ? collectFolderIds(defaults) : prev));
    } catch {
      const defaults = cloneNodes(DEFAULT_BOOKMARKS);
      setBookmarks(defaults);
      setExpandedFolders((prev) => (prev.size === 0 ? collectFolderIds(defaults) : prev));
    }
  }, []);

  const updateBookmarks = useCallback((updater: (current: BookmarkNode[]) => BookmarkNode[]) => {
    setBookmarks((current) => {
      const next = updater(current);
      if (next === current) {
        return current;
      }
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore persistence errors */
        }
      }
      return next;
    });
  }, []);

  const [address, setAddress] = useState(initialUrl);
  const [inputValue, setInputValue] = useState(initialUrl);
  const [simulation, setSimulation] = useState(() => getSimulation(initialUrl));

  const updateAddress = (value: string) => {
    const url = normaliseUrl(value);
    setAddress(url);
    setInputValue(url);
    setSimulation(getSimulation(url));
    try {
      localStorage.setItem(STORAGE_KEY, url);
    } catch {
      /* ignore persistence errors */
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateAddress(inputValue);
  };

  const handleCreateFolder = () => {
    const name = typeof window !== 'undefined' ? window.prompt('Folder name', 'New Folder') : null;
    if (!name) {
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    const newFolder: BookmarkFolder = { id: createId(), type: 'folder', label: trimmed, items: [] };
    updateBookmarks((current) => [...current, newFolder]);
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.add(newFolder.id);
      return next;
    });
  };

  const handleToggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRename = (id: string) => {
    const node = findNodeById(bookmarks, id);
    if (!node) {
      return;
    }
    const name = typeof window !== 'undefined' ? window.prompt('Enter a new name', node.label) : null;
    if (!name) {
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    updateBookmarks((current) => updateNodeById(current, id, (currentNode) => ({ ...currentNode, label: trimmed })));
  };

  const handleDelete = (id: string) => {
    const node = findNodeById(bookmarks, id);
    const foldersToRemove = node ? collectFolderIdsFromNode(node) : new Set<string>();
    updateBookmarks((current) => updateNodeById(current, id, () => null));
    if (foldersToRemove.size > 0) {
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        foldersToRemove.forEach((folderId) => next.delete(folderId));
        return next;
      });
    }
  };

  const handleDropAt = (parentId: string | null, index: number) => {
    setDraggingId((currentDraggingId) => {
      if (currentDraggingId) {
        updateBookmarks((current) => moveBookmark(current, currentDraggingId, parentId, index));
      }
      return null;
    });
  };

  const handleDropInto = (parentId: string) => {
    setDraggingId((currentDraggingId) => {
      if (currentDraggingId) {
        updateBookmarks((current) => {
          const parentNode = findNodeById(current, parentId);
          const index = parentNode && parentNode.type === 'folder' ? parentNode.items.length : 0;
          return moveBookmark(current, currentDraggingId, parentId, index);
        });
        setExpandedFolders((prev) => {
          const next = new Set(prev);
          next.add(parentId);
          return next;
        });
      }
      return null;
    });
  };

  const handleDragStart = (id: string) => {
    setDraggingId(id);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  return (
    <div className="flex h-full flex-col bg-ub-cool-grey text-gray-100">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-b border-gray-700 bg-gray-900 px-3 py-2"
      >
        <label htmlFor="firefox-address" className="sr-only">
          Address
        </label>
        <input
          id="firefox-address"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="Enter a URL"
          aria-label="Address"
          className="flex-1 rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          Go
        </button>
      </form>
      <nav className="border-b border-gray-800 bg-gray-900 px-3 py-2 text-xs">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold uppercase tracking-wide text-gray-400">Bookmarks</h2>
          <button
            type="button"
            onClick={handleCreateFolder}
            className="rounded bg-gray-800 px-3 py-1 font-medium text-gray-200 transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            New Folder
          </button>
        </div>
        {bookmarks.length > 0 ? (
          <BookmarkList
            nodes={bookmarks}
            parentId={null}
            expandedFolders={expandedFolders}
            draggingId={draggingId}
            onToggleFolder={handleToggleFolder}
            onOpenBookmark={updateAddress}
            onRename={handleRename}
            onDelete={handleDelete}
            onDropAt={handleDropAt}
            onDropInto={handleDropInto}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        ) : (
          <p className="rounded bg-gray-800 px-3 py-2 text-gray-400">No bookmarks yet.</p>
        )}
      </nav>
      <div className="flex-1 bg-black">
        {simulation ? (
          <FirefoxSimulationView simulation={simulation} />
        ) : (
          <iframe
            key={address}
            title="Firefox"
            src={address}
            className="h-full w-full border-0"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        )}
      </div>
    </div>
  );
};

export const displayFirefox = () => <Firefox />;

export default Firefox;
