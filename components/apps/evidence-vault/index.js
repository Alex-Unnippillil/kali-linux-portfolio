import React, { useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';

const parseTags = (input) =>
  input
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

const getTimestamps = () => {
  const now = new Date();
  return {
    createdAtUtc: now.toISOString(),
    createdAtLocal: now.toLocaleString(),
  };
};

const hexFromBuffer = (buffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const formatFileSize = (size) => {
  if (!Number.isFinite(size)) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const digestSha256 = async (input) => {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('SHA-256 hashing requires SubtleCrypto support in the browser.');
  }

  let data;
  if (typeof input === 'string') {
    data = new TextEncoder().encode(input);
  } else if (input instanceof ArrayBuffer) {
    data = new Uint8Array(input);
  } else if (ArrayBuffer.isView(input)) {
    data = input;
  } else {
    throw new Error('Unsupported input provided for hashing.');
  }

  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return hexFromBuffer(hashBuffer);
};

const dataUrlToUint8Array = async (dataUrl) => {
  const response = await fetch(dataUrl);
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
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
  const [progressMessage, setProgressMessage] = useState('');
  const [pendingCapture, setPendingCapture] = useState(null);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const progressTimeoutRef = useRef(null);

  useEffect(() => {
    // reset selection when items change
    setSelectedNode(null);
  }, [items]);

  useEffect(() => () => {
    if (progressTimeoutRef.current) {
      clearTimeout(progressTimeoutRef.current);
    }
  }, []);

  const showProgress = (message, autoClear = false) => {
    if (progressTimeoutRef.current) {
      clearTimeout(progressTimeoutRef.current);
      progressTimeoutRef.current = null;
    }

    setProgressMessage(message);

    if (autoClear && message) {
      progressTimeoutRef.current = setTimeout(() => {
        setProgressMessage('');
        progressTimeoutRef.current = null;
      }, 2000);
    }
  };

  const addNote = async () => {
    const title = prompt('Note title');
    if (!title) return;
    const content = prompt('Note content') || '';
    const tagInput = prompt('Tags (comma separated, use / for hierarchy)') || '';
    const tags = parseTags(tagInput);

    try {
      showProgress('Computing note hash...');
      const hash = await digestSha256(`${title}\n${content}`);
      const timestamps = getTimestamps();
      setItems((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: 'note',
          title,
          content,
          tags,
          hash,
          ...timestamps,
        },
      ]);
      showProgress('Note saved to evidence vault.', true);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Unable to hash note content.');
      showProgress('');
    }
  };

  const handleFileChange = async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    const tagInput = prompt('Tags (comma separated, use / for hierarchy)') || '';
    const tags = parseTags(tagInput);

    try {
      showProgress(`Hashing ${file.name}...`);
      const arrayBuffer = await file.arrayBuffer();
      const hash = await digestSha256(arrayBuffer);
      const timestamps = getTimestamps();
      const url = URL.createObjectURL(file);
      setItems((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: 'file',
          name: file.name,
          url,
          tags,
          hash,
          size: file.size,
          ...timestamps,
        },
      ]);
      showProgress('File stored with hash.', true);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Unable to hash file.');
      showProgress('');
    } finally {
      input.value = '';
    }
  };

  const capturePanel = async () => {
    if (!containerRef.current) return;
    try {
      showProgress('Rendering panel snapshot...');
      const dataUrl = await toPng(containerRef.current, { pixelRatio: 2 });
      setPendingCapture({
        imageDataUrl: dataUrl,
        source: 'panel',
        annotation: '',
        tagsText: '',
      });
      showProgress('Panel captured. Annotate before saving.', true);
    } catch (error) {
      console.error(error);
      alert('Panel capture failed.');
      showProgress('');
    }
  };

  const captureScreen = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      alert('Screen capture is not supported in this browser.');
      return;
    }

    let stream;
    try {
      showProgress('Requesting screen share...');
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();

      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;

      await new Promise((resolve, reject) => {
        const cleanup = () => {
          video.onloadedmetadata = null;
          video.onerror = null;
        };
        video.onloadedmetadata = async () => {
          try {
            await video.play();
          } catch (err) {
            console.warn('Video play was interrupted', err);
          }
          cleanup();
          resolve();
        };
        video.onerror = (event) => {
          cleanup();
          reject(event);
        };
      });

      const width = settings.width || video.videoWidth;
      const height = settings.height || video.videoHeight;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Unable to acquire canvas context for capture.');
      }
      context.drawImage(video, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/png');
      setPendingCapture({
        imageDataUrl: dataUrl,
        source: 'screen',
        annotation: '',
        tagsText: '',
      });
      showProgress('Screen captured. Annotate before saving.', true);
    } catch (error) {
      console.error(error);
      alert('Screen capture failed or was denied.');
      showProgress('');
    } finally {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    }
  };

  const savePendingCapture = async () => {
    if (!pendingCapture) return;

    try {
      showProgress('Hashing snapshot...');
      const tags = parseTags(pendingCapture.tagsText || '');
      const binary = await dataUrlToUint8Array(pendingCapture.imageDataUrl);
      const hash = await digestSha256(binary);
      const timestamps = getTimestamps();

      setItems((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: 'snapshot',
          source: pendingCapture.source,
          imageDataUrl: pendingCapture.imageDataUrl,
          annotation: pendingCapture.annotation,
          tags,
          hash,
          ...timestamps,
        },
      ]);

      setPendingCapture(null);
      showProgress('Snapshot saved to evidence vault.', true);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Unable to save snapshot.');
      showProgress('');
    }
  };

  const cancelPendingCapture = () => {
    setPendingCapture(null);
    showProgress('Snapshot capture discarded.', true);
  };

  const treeData = buildTagTree(items);
  const displayItems = selectedNode ? selectedNode.items : items;

  return (
    <div ref={containerRef} className="h-full w-full bg-gray-900 text-white p-4 flex">
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
        <div className="mb-2 space-x-2 flex flex-wrap gap-2">
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
          <button
            onClick={capturePanel}
            className="px-2 py-1 bg-blue-600 rounded"
          >
            Capture Panel
          </button>
          <button
            onClick={captureScreen}
            className="px-2 py-1 bg-blue-600 rounded"
          >
            Capture Screen
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        {progressMessage && (
          <div
            className="mb-2 text-xs text-blue-300 bg-gray-800 border border-blue-500/40 rounded px-2 py-1 animate-pulse"
            role="status"
            aria-live="polite"
          >
            {progressMessage}
          </div>
        )}
        {pendingCapture && (
          <div className="mb-4 border border-gray-700 rounded bg-gray-900/60 p-3 space-y-3">
            <h3 className="font-semibold text-sm">
              Review {pendingCapture.source === 'screen' ? 'Screen' : 'Panel'} Snapshot
            </h3>
            <img
              src={pendingCapture.imageDataUrl}
              alt="Snapshot preview"
              className="w-full max-h-60 object-contain border border-gray-700"
            />
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wide text-gray-400">
                Annotation
              </label>
              <textarea
                value={pendingCapture.annotation}
                onChange={(event) =>
                  setPendingCapture((prev) =>
                    prev
                      ? {
                          ...prev,
                          annotation: event.target.value,
                        }
                      : prev,
                  )
                }
                className="w-full rounded bg-gray-900 border border-gray-700 p-2 text-sm"
                rows={3}
                placeholder="Describe what this capture shows..."
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs uppercase tracking-wide text-gray-400">
                Tags
              </label>
              <input
                type="text"
                value={pendingCapture.tagsText}
                onChange={(event) =>
                  setPendingCapture((prev) =>
                    prev
                      ? {
                          ...prev,
                          tagsText: event.target.value,
                        }
                      : prev,
                  )
                }
                className="w-full rounded bg-gray-900 border border-gray-700 p-2 text-sm"
                placeholder="e.g. case123/screenshots, host/web"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={savePendingCapture}
                className="flex-1 px-2 py-1 bg-green-600 rounded"
              >
                Save Snapshot
              </button>
              <button
                onClick={cancelPendingCapture}
                className="flex-1 px-2 py-1 bg-gray-700 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        <ul className="flex-1 overflow-auto space-y-2">
          {displayItems.map((item) => (
            <li key={item.id} className="p-2 bg-gray-800 rounded">
              {item.type === 'note' && (
                <div className="space-y-1">
                  <h4 className="font-semibold">{item.title}</h4>
                  <p className="text-sm whitespace-pre-wrap">{item.content}</p>
                </div>
              )}
              {item.type === 'file' && (
                <div className="space-y-1">
                  <h4 className="font-semibold">{item.name}</h4>
                  <a
                    href={item.url}
                    download
                    className="text-blue-400 underline text-sm"
                  >
                    Download
                  </a>
                  {typeof item.size === 'number' && (
                    <p className="text-xs text-gray-400">
                      Size: {formatFileSize(item.size)}
                    </p>
                  )}
                </div>
              )}
              {item.type === 'snapshot' && (
                <div className="space-y-2">
                  <h4 className="font-semibold capitalize">{item.source} snapshot</h4>
                  <img
                    src={item.imageDataUrl}
                    alt={`${item.source} capture`}
                    className="w-full max-h-64 object-contain border border-gray-700"
                  />
                  {item.annotation && (
                    <p className="text-sm whitespace-pre-wrap">{item.annotation}</p>
                  )}
                </div>
              )}
              {(item.createdAtLocal || item.createdAtUtc || item.hash) && (
                <div className="mt-2 space-y-1 text-xs text-gray-400">
                  {item.createdAtLocal && (
                    <p>
                      Local: <span className="font-mono text-gray-300">{item.createdAtLocal}</span>
                    </p>
                  )}
                  {item.createdAtUtc && (
                    <p>
                      UTC: <span className="font-mono text-gray-300">{item.createdAtUtc}</span>
                    </p>
                  )}
                  {item.hash && (
                    <p className="break-all">
                      SHA-256: <span className="font-mono text-gray-300">{item.hash}</span>
                    </p>
                  )}
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
