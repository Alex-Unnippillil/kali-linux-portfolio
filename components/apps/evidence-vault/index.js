import React, { useRef, useState, useEffect } from 'react';

const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

const ensureArrayBuffer = (input) => {
  if (input instanceof ArrayBuffer) {
    return input;
  }
  if (ArrayBuffer.isView(input)) {
    return input.buffer.slice(
      input.byteOffset,
      input.byteOffset + input.byteLength,
    );
  }
  throw new TypeError('Unsupported data type for hashing');
};

const bufferToHex = (buffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const computeSha256 = async (data) => {
  try {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      return 'sha256:unsupported';
    }
    const digest = await crypto.subtle.digest('SHA-256', ensureArrayBuffer(data));
    return `sha256:${bufferToHex(digest)}`;
  } catch (err) {
    console.error('Unable to compute SHA-256 hash', err);
    return 'sha256:error';
  }
};

const encodeText = (value) => {
  if (!textEncoder) {
    return new Uint8Array();
  }
  return textEncoder.encode(value);
};

const sanitizeFilename = (value) => {
  const cleaned = value.replace(/[^a-z0-9_.-]+/gi, '_');
  return cleaned || 'evidence';
};

const formatTimestamp = (isoString) => {
  if (!isoString) return 'Unknown time';
  try {
    return new Date(isoString).toLocaleString();
  } catch (error) {
    console.error('Failed to format timestamp', error);
    return isoString;
  }
};

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

const TagTree = ({ data, onSelect, path = [] }) => (
  <ul className="pl-4">
    {Object.entries(data).map(([name, node]) => (
      <TagTreeNode
        key={name}
        name={name}
        node={node}
        onSelect={onSelect}
        path={[...path, name]}
      />
    ))}
  </ul>
);

const TagTreeNode = ({ name, node, onSelect, path }) => {
  const hasChildren = Object.keys(node.children).length > 0;
  return (
    <li className="mb-1">
      {hasChildren ? (
        <details>
          <summary className="cursor-pointer">{name}</summary>
          {node.items.length > 0 && (
            <button
              type="button"
              onClick={() => onSelect(node, path)}
              className="ml-2 text-xs text-blue-400 hover:underline"
            >
              View items
            </button>
          )}
          <TagTree data={node.children} onSelect={onSelect} path={path} />
        </details>
      ) : (
        <button
          type="button"
          onClick={() => onSelect(node, path)}
          className="text-left hover:underline focus:outline-none"
        >
          {name}
        </button>
      )}
    </li>
  );
};

const triggerDownload = (blob, filename) => {
  if (typeof window === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const EvidenceVaultApp = () => {
  const [items, setItems] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [isManifestDownloading, setIsManifestDownloading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // reset selection when items change
    setSelectedBranch(null);
    setSelectedIds((prev) => {
      const validIds = new Set(items.map((item) => item.id));
      const filtered = Array.from(prev).filter((id) => validIds.has(id));
      return new Set(filtered);
    });
  }, [items]);

  useEffect(
    () => () => {
      if (typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') {
        return;
      }
      items.forEach((item) => {
        if (item.type === 'file' && item.url) {
          URL.revokeObjectURL(item.url);
        }
      });
    },
    [items],
  );

  const addNote = () => {
    const title = prompt('Note title');
    if (!title) return;
    const content = prompt('Note content') || '';
    const tagInput = prompt('Tags (comma separated, use / for hierarchy)') || '';
    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const createdAt = new Date().toISOString();
    setItems((prev) => [
      ...prev,
      { id: Date.now(), type: 'note', title, content, tags, createdAt },
    ]);
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
    const createdAt = new Date().toISOString();
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: 'file',
        name: file.name,
        file,
        url,
        tags,
        createdAt,
      },
    ]);
    e.target.value = '';
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const visibleItems = selectedBranch ? selectedBranch.node.items : items;
      visibleItems.forEach((item) => {
        next.add(item.id);
      });
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const prepareManifest = async (selectedItems) => {
    const exportedAt = new Date().toISOString();
    const uniqueTags = new Set();
    const manifestItems = [];
    const fileEntries = [];
    let noteCount = 0;
    let fileCount = 0;

    for (const item of selectedItems) {
      const itemTags = item.tags.length ? item.tags : ['uncategorized'];
      itemTags.forEach((tag) => uniqueTags.add(tag));
      if (item.type === 'note') {
        const encodedContent = encodeText(item.content || '');
        const hash = await computeSha256(encodedContent);
        manifestItems.push({
          id: item.id,
          type: 'note',
          title: item.title,
          content: item.content,
          tags: itemTags,
          createdAt: item.createdAt,
          size: encodedContent.byteLength,
          hash,
        });
        noteCount += 1;
      } else if (item.type === 'file' && item.file) {
        const arrayBuffer = await item.file.arrayBuffer();
        const hash = await computeSha256(arrayBuffer);
        const safeName = sanitizeFilename(item.name || 'evidence');
        const fileName = `${item.id}-${safeName}`;
        manifestItems.push({
          id: item.id,
          type: 'file',
          name: item.name,
          tags: itemTags,
          createdAt: item.createdAt,
          size: item.file.size,
          hash,
          path: `files/${fileName}`,
          mimeType: item.file.type || undefined,
          lastModified: item.file.lastModified
            ? new Date(item.file.lastModified).toISOString()
            : undefined,
        });
        fileEntries.push({
          fileName,
          file: item.file,
        });
        fileCount += 1;
      }
    }

    const manifest = {
      version: 1,
      generatedAt: exportedAt,
      workspace: {
        origin: typeof window !== 'undefined' ? window.location.origin : 'unknown',
        path: typeof window !== 'undefined' ? window.location.pathname : '/',
        exportedBy: 'Evidence Vault Simulation',
        filter: selectedBranch ? selectedBranch.path.join('/') : 'all-items',
        totalSelected: selectedItems.length,
        totalAvailable: items.length,
        tagSummary: Array.from(uniqueTags).sort(),
        notesSelected: noteCount,
        filesSelected: fileCount,
        appVersion: 'simulated-1.0',
      },
      items: manifestItems,
    };

    return { manifest, fileEntries };
  };

  const exportSelected = async () => {
    if (selectedIds.size === 0) {
      alert('Select at least one item to export.');
      return;
    }
    try {
      setIsExporting(true);
      const selectedItems = items.filter((item) => selectedIds.has(item.id));
      const { manifest, fileEntries } = await prepareManifest(selectedItems);
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const filesFolder = zip.folder('files');
      fileEntries.forEach(({ fileName, file }) => {
        filesFolder?.file(fileName, file);
      });
      zip.file('index.json', JSON.stringify(manifest, null, 2));
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      triggerDownload(blob, `evidence-export-${Date.now()}.zip`);
    } catch (error) {
      console.error('Failed to export evidence package', error);
      alert('Failed to export evidence package. Check the console for details.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportManifestOnly = async () => {
    if (selectedIds.size === 0) {
      alert('Select at least one item to export.');
      return;
    }
    try {
      setIsManifestDownloading(true);
      const selectedItems = items.filter((item) => selectedIds.has(item.id));
      const { manifest } = await prepareManifest(selectedItems);
      const sanitizedManifest = {
        ...manifest,
        items: manifest.items.map(({ content, ...rest }) => rest),
      };
      const response = await fetch('/api/evidence/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ manifest: sanitizedManifest }),
      });
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
      const blob = await response.blob();
      triggerDownload(blob, `evidence-manifest-${Date.now()}.zip`);
    } catch (error) {
      console.error('Failed to export manifest', error);
      alert('Unable to download manifest archive. See console for more information.');
    } finally {
      setIsManifestDownloading(false);
    }
  };

  const treeData = buildTagTree(items);
  const displayItems = selectedBranch ? selectedBranch.node.items : items;
  const selectedCount = selectedIds.size;
  const activeFilterLabel = selectedBranch ? selectedBranch.path.join(' / ') : null;

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex">
      <div className="w-1/3 border-r border-gray-700 pr-2 overflow-auto">
        <button
          type="button"
          onClick={() => setSelectedBranch(null)}
          className="text-sm text-blue-400 hover:underline mb-2"
        >
          All Items
        </button>
        <TagTree data={treeData} onSelect={(node, path) => setSelectedBranch({ node, path })} />
      </div>
      <div className="flex-1 pl-4 flex flex-col">
        <div className="mb-2 flex flex-wrap gap-2">
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
          <button
            type="button"
            onClick={selectVisible}
            className="px-2 py-1 bg-gray-700 rounded"
            disabled={displayItems.length === 0}
          >
            Select Visible
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="px-2 py-1 bg-gray-700 rounded"
            disabled={selectedCount === 0}
          >
            Clear Selection
          </button>
          <button
            type="button"
            onClick={exportSelected}
            className="px-2 py-1 bg-green-600 rounded disabled:opacity-60"
            disabled={selectedCount === 0 || isExporting}
          >
            {isExporting ? 'Packaging…' : 'Export Selected'}
          </button>
          <button
            type="button"
            onClick={exportManifestOnly}
            className="px-2 py-1 bg-purple-600 rounded disabled:opacity-60"
            disabled={selectedCount === 0 || isManifestDownloading}
          >
            {isManifestDownloading ? 'Preparing…' : 'Manifest via API'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-2">
          {selectedCount} item(s) selected
          {activeFilterLabel ? ` in ${activeFilterLabel}` : ''}
        </p>
        {displayItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            No items to display. Add notes or files to begin building your evidence set.
          </div>
        ) : (
          <ul className="flex-1 overflow-auto space-y-2">
            {displayItems.map((item) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <li
                  key={item.id}
                  className={`p-2 bg-gray-800 rounded border ${
                    isSelected ? 'border-blue-500' : 'border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={isSelected}
                      onChange={() => toggleSelect(item.id)}
                      aria-label={`Select ${item.type}`}
                    />
                    <div className="flex-1">
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
                          >
                            Download original
                          </a>
                        </div>
                      )}
                      {item.tags.length > 0 && (
                        <p className="text-xs mt-1 text-gray-400">
                          Tags: {item.tags.join(', ')}
                        </p>
                      )}
                      <p className="text-xs mt-1 text-gray-500">
                        Recorded: {formatTimestamp(item.createdAt)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default EvidenceVaultApp;
