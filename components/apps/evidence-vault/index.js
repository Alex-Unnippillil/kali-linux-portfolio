import React, { useRef, useState, useEffect } from 'react';
import useEvidenceStore from '../../../hooks/useEvidenceStore';

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = value < 10 && unitIndex > 0 ? 1 : 0;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
};

const readFileAsDataURL = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(typeof event.target?.result === 'string' ? event.target.result : undefined);
    };
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });

const buildTagTree = (items) => {
  const root = {};
  const untagged = [];
  items.forEach((item) => {
    if (!item.tags || item.tags.length === 0) {
      untagged.push(item);
      return;
    }
    item.tags.forEach((tag) => {
      const parts = tag.split('/').filter(Boolean);
      if (parts.length === 0) return;
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
  if (untagged.length) {
    root.Untagged = root.Untagged || { children: {}, items: [] };
    root.Untagged.items.push(...untagged);
  }
  return root;
};

const TagTree = ({ data, onSelect }) => {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return <p className="text-xs text-gray-400">No tags yet.</p>;
  }
  return (
    <ul className="pl-4">
      {entries.map(([name, node]) => (
        <TagTreeNode key={name} name={name} node={node} onSelect={onSelect} />
      ))}
    </ul>
  );
};

const TagTreeNode = ({ name, node, onSelect }) => {
  const hasChildren = Object.keys(node.children).length > 0;
  return (
    <li className="mb-1">
      {hasChildren ? (
        <details>
          <summary className="cursor-pointer text-sm">{name}</summary>
          {node.items.length > 0 && (
            <button
              type="button"
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
          type="button"
          onClick={() => onSelect(node)}
          className="text-left hover:underline focus:outline-none text-sm"
        >
          {name}
        </button>
      )}
    </li>
  );
};

const formatMetadataValue = (key, value) => {
  if (typeof value === 'number' && /size/i.test(key)) {
    return `${formatBytes(value)} (${value} B)`;
  }
  return String(value);
};

const EvidenceCard = ({ item, onRemove }) => {
  const metadataEntries = Object.entries(item.metadata || {});
  return (
    <li className="p-3 bg-gray-800 rounded border border-gray-700/60 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {item.thumbnail ? (
            <img
              src={item.thumbnail}
              alt=""
              className="w-12 h-12 rounded object-cover flex-shrink-0"
            />
          ) : (
            <div
              aria-hidden="true"
              className="w-12 h-12 rounded bg-gray-700 flex items-center justify-center text-xl"
            >
              📁
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold leading-tight">{item.label}</h4>
              <span className="text-xs uppercase tracking-wide text-gray-400">
                {item.kind}
              </span>
            </div>
            <div className="text-[11px] text-gray-500">
              {new Date(item.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-red-300 hover:text-red-200"
        >
          Remove
        </button>
      </div>
      {item.summary && (
        <p className="mt-2 text-sm text-gray-200 whitespace-pre-wrap">{item.summary}</p>
      )}
      {item.tags.length > 0 && (
        <div className="mt-2 text-xs text-gray-400">
          Tags: {item.tags.join(', ')}
        </div>
      )}
      {metadataEntries.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
          {metadataEntries.map(([key, value]) => (
            <React.Fragment key={key}>
              <dt className="uppercase tracking-wide text-gray-500">{key}</dt>
              <dd className="text-gray-200 break-words">
                {formatMetadataValue(key, value)}
              </dd>
            </React.Fragment>
          ))}
        </dl>
      )}
      {item.attachment && (
        <div className="mt-3 text-xs">
          <a
            href={item.attachment}
            download={item.attachmentName || `${item.label}.bin`}
            className="text-blue-400 hover:underline"
          >
            Download attachment
          </a>
          {item.attachmentType && (
            <span className="ml-2 text-gray-400">{item.attachmentType}</span>
          )}
        </div>
      )}
    </li>
  );
};

const EvidenceVaultApp = () => {
  const { items, addEvidence, removeEvidence } = useEvidenceStore();
  const [selectedNode, setSelectedNode] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setSelectedNode(null);
  }, [items]);

  const addNote = () => {
    const title = prompt('Note title')?.trim();
    if (!title) return;
    const content = prompt('Note content') || '';
    const tagInput = prompt('Tags (comma separated, use / for hierarchy)') || '';
    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const summary = content.length > 160 ? `${content.slice(0, 157)}…` : content;
    addEvidence({
      label: title,
      kind: 'note',
      summary,
      tags,
      metadata: {
        content,
        source: 'manual-entry',
      },
    });
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const tagInput = prompt('Tags (comma separated, use / for hierarchy)') || '';
    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const dataUrl = await readFileAsDataURL(file);
    const isImage = file.type?.startsWith('image/');
    addEvidence({
      label: file.name,
      kind: isImage ? 'image' : 'file',
      summary: [file.type || 'file', formatBytes(file.size)].filter(Boolean).join(' • '),
      tags,
      thumbnail: isImage ? dataUrl : undefined,
      attachment: dataUrl,
      attachmentType: file.type || 'application/octet-stream',
      attachmentName: file.name,
      metadata: {
        mimeType: file.type || 'unknown',
        sizeBytes: file.size,
        aliasPath: file.webkitRelativePath || file.name,
      },
    });
    event.target.value = '';
  };

  const treeData = buildTagTree(items);
  const selectedItems = selectedNode ? selectedNode.items : items;
  const displayItems = [...selectedItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex">
      <div className="w-1/3 border-r border-gray-700 pr-2 overflow-auto">
        <button
          type="button"
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
            type="button"
            onClick={addNote}
            className="px-2 py-1 bg-blue-600 rounded"
          >
            Add Note
          </button>
          <button
            type="button"
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
        {displayItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            No evidence captured yet.
          </div>
        ) : (
          <ul className="flex-1 overflow-auto space-y-3">
            {displayItems.map((item) => (
              <EvidenceCard
                key={item.id}
                item={item}
                onRemove={() => removeEvidence(item.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default EvidenceVaultApp;
