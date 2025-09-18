import React, { useRef, useState, useEffect } from 'react';
import { trackEvent } from '@/lib/analytics-client';

// Build hierarchical tree from slash-delimited tags
const buildTagTree = (items) => {
  const root = {};
  items.forEach((item) => {
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
  return (
    <li className="mb-1">
      {hasChildren ? (
        <details>
          <summary className="cursor-pointer">{name}</summary>
          {node.items.length > 0 && (
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
  const [items, setItems] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const fileInputRef = useRef(null);
  const captureCountRef = useRef(0);
  const exportCountRef = useRef(0);

  useEffect(() => {
    // reset selection when items change
    setSelectedNode(null);
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
    setItems((prev) => [
      ...prev,
      { id: Date.now(), type: 'note', title, content, tags },
    ]);
    captureCountRef.current += 1;
    trackEvent('evidence_capture', {
      source: 'note',
      totalCaptures: captureCountRef.current,
      hasTags: tags.length > 0,
      contentLength: content.length,
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
    const url = URL.createObjectURL(file);
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: 'file',
        name: file.name,
        url,
        tags,
        size: file.size,
        mime: file.type,
      },
    ]);
    captureCountRef.current += 1;
    trackEvent('evidence_capture', {
      source: 'file',
      totalCaptures: captureCountRef.current,
      fileSize: file.size,
      hasTags: tags.length > 0,
      mimeType: file.type || undefined,
    });
    e.target.value = '';
  };

  const treeData = buildTagTree(items);
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
        <TagTree data={treeData} onSelect={setSelectedNode} />
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
            aria-label="Select evidence file"
            onChange={handleFileChange}
          />
        </div>
        <ul className="flex-1 overflow-auto space-y-2">
          {displayItems.map((item) => (
            <li key={item.id} className="p-2 bg-gray-800 rounded">
              {item.type === 'note' ? (
                <div>
                  <h4 className="font-semibold">{item.title}</h4>
                  <p className="text-sm whitespace-pre-wrap">{item.content}</p>
                </div>
              ) : (
                <div>
                  <h4 className="font-semibold">{item.name}</h4>
                  <a
                    href={item.url}
                    download
                    className="text-blue-400 underline text-sm"
                    onClick={() => {
                      exportCountRef.current += 1;
                      trackEvent('evidence_export', {
                        itemId: item.id,
                        totalExports: exportCountRef.current,
                        type: item.type,
                        fileSize: item.size,
                        hasTags: item.tags?.length > 0,
                      });
                    }}
                  >
                    Download
                  </a>
                </div>
              )}
              {item.tags.length > 0 && (
                <p className="text-xs mt-1 text-gray-400">
                  Tags: {item.tags.join(', ')}
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
