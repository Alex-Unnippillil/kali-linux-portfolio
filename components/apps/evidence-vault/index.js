import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  getEvidenceStore,
  ingestEvidenceRecord,
  subscribeToEvidenceStore,
} from './helpers';

const buildTagTree = (items) => {
  const root = {};
  items.forEach((item) => {
    if (!item.tags || item.tags.length === 0) {
      return;
    }
    item.tags.forEach((tag) => {
      const parts = tag.split('/').filter(Boolean);
      let node = root;
      parts.forEach((part, idx) => {
        node[part] = node[part] || { children: {}, items: [] };
        if (idx === parts.length - 1) {
          node[part].items.push(item);
        }
        node = node[part].children;
      });
    });
  });
  return root;
};

const TagTree = ({ data, onSelect }) => (
  <ul className="pl-4">
    {Object.entries(data).map(([name, node]) => (
      <TagTreeNode key={name} name={name} node={node} onSelect={onSelect} />
    ))}
  </ul>
);

const TagTreeNode = ({ name, node, onSelect }) => {
  const hasChildren = Object.keys(node.children).length > 0;
  const showItemsButton = node.items && node.items.length > 0;
  return (
    <li className="mb-1">
      {hasChildren ? (
        <details>
          <summary className="cursor-pointer">{name}</summary>
          {showItemsButton && (
            <button
              onClick={() => onSelect(node)}
              className="ml-2 text-xs text-blue-400 hover:underline"
            >
              View items
            </button>
          )}
          <TagTree data={node.children} onSelect={onSelect} />
        </details>
      ) : (
        <button
          onClick={() => onSelect(node)}
          className="text-left hover:underline focus:outline-none"
        >
          {name}
        </button>
      )}
    </li>
  );
};

const EvidenceVaultApp = () => {
  const [items, setItems] = useState(getEvidenceStore());
  const [selectedNode, setSelectedNode] = useState(null);
  const [objectUrls, setObjectUrls] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribeToEvidenceStore(setItems);
    return unsubscribe;
  }, []);

  useEffect(() => {
    setSelectedNode(null);
  }, [items]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const next = {};
    items.forEach((item) => {
      item.assets.forEach((asset, index) => {
        if (asset.blob instanceof Blob) {
          const key = `${item.id}-${index}`;
          next[key] = URL.createObjectURL(asset.blob);
        }
      });
    });
    setObjectUrls((prev) => {
      Object.entries(prev).forEach(([key, url]) => {
        if (!next[key]) URL.revokeObjectURL(url);
      });
      return next;
    });
    return () => {
      Object.values(next).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [items]);

  const addNote = () => {
    const title = prompt('Note title');
    if (!title) return;
    const content = prompt('Note content') || '';
    const tagInput = prompt('Tags (comma separated, use / for hierarchy)') || '';
    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    ingestEvidenceRecord({
      id: `note-${Date.now()}`,
      label: title,
      description: content,
      tags,
      createdAt: Date.now(),
      assets: [],
      metadata: { type: 'note', content },
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const tagInput = prompt('Tags (comma separated, use / for hierarchy)') || '';
    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    ingestEvidenceRecord({
      id: `file-${Date.now()}`,
      label: file.name,
      tags,
      createdAt: Date.now(),
      assets: [
        {
          name: file.name,
          mimeType: file.type,
          size: file.size,
          blob: file,
        },
      ],
      metadata: { type: 'file' },
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const treeData = useMemo(() => buildTagTree(items), [items]);
  const displayItems = selectedNode ? selectedNode.items : items;

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex">
      <div className="w-1/3 border-r border-gray-700 pr-2 overflow-auto">
        <button
          onClick={() => setSelectedNode(null)}
          className="text-sm text-blue-400 hover:underline mb-2"
        >
          All Items
        </button>
        {Object.keys(treeData).length > 0 ? (
          <TagTree data={treeData} onSelect={setSelectedNode} />
        ) : (
          <p className="text-xs text-gray-400">No tags assigned yet.</p>
        )}
      </div>
      <div className="flex-1 pl-4 flex flex-col">
        <div className="mb-2 space-x-2">
          <button
            onClick={addNote}
            className="px-2 py-1 bg-blue-600 rounded"
          >
            Add Note
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2 py-1 bg-blue-600 rounded"
          >
            Add File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        <ul className="flex-1 overflow-auto space-y-2">
          {displayItems.length === 0 && (
            <li className="text-sm text-gray-400">No evidence captured yet.</li>
          )}
          {displayItems.map((item) => (
            <li key={item.id} className="p-3 bg-gray-800/80 rounded border border-gray-700/60">
              <div className="flex items-baseline justify-between">
                <h4 className="font-semibold text-sm">{item.label}</h4>
                <span className="text-xs text-gray-400">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
              {item.description && (
                <p className="mt-1 text-sm whitespace-pre-wrap text-gray-200">
                  {item.description}
                </p>
              )}
              {item.assets.length > 0 && (
                <div className="mt-2">
                  <h5 className="text-xs uppercase tracking-wide text-gray-400">
                    Assets
                  </h5>
                  <ul className="mt-1 space-y-1 text-sm">
                    {item.assets.map((asset, index) => {
                      const key = `${item.id}-${index}`;
                      const url = objectUrls[key];
                      return (
                        <li
                          key={key}
                          className="flex items-center justify-between gap-2 rounded bg-gray-900/60 px-2 py-1"
                        >
                          <span className="truncate" title={asset.name}>
                            {asset.name}
                          </span>
                          {url ? (
                            <a
                              href={url}
                              download={asset.name}
                              className="text-xs text-blue-400 hover:underline"
                            >
                              Download
                            </a>
                          ) : asset.path ? (
                            <span className="text-xs text-gray-400">{asset.path}</span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {item.tags.length > 0 && (
                <p className="mt-2 text-xs text-gray-400">
                  Tags: {item.tags.join(', ')}
                </p>
              )}
              {item.metadata && Object.keys(item.metadata).length > 0 && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-blue-300">
                    Metadata
                  </summary>
                  <pre className="mt-1 whitespace-pre-wrap break-words bg-gray-900/70 p-2 rounded">
                    {JSON.stringify(item.metadata, null, 2)}
                  </pre>
                </details>
              )}
              {item.annotations && item.annotations.length > 0 && (
                <p className="mt-2 text-xs text-gray-400">
                  {item.annotations.length} annotation(s) saved
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default EvidenceVaultApp;
