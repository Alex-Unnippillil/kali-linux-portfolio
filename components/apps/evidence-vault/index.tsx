import React, { useEffect, useMemo, useRef, useState } from 'react';
import share, { ShareFailureReason, ShareResult } from '../../../utils/share';

type EvidenceNote = {
  id: number;
  type: 'note';
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
};

type EvidenceFile = {
  id: number;
  type: 'file';
  name: string;
  tags: string[];
  dataUrl: string;
  mimeType: string;
  size: number;
  objectUrl: string;
};

type EvidenceItem = EvidenceNote | EvidenceFile;

type TagNode = {
  children: Record<string, TagNode>;
  items: EvidenceItem[];
};

interface EvidenceVaultProps {
  initialItems?: EvidenceItem[];
}

interface StoredSharePayload {
  title?: string;
  text?: string;
  url?: string;
  files?: {
    name: string;
    type: string;
    size: number;
    dataUrl: string;
  }[];
  createdAt: number;
  source: 'share-target';
}

const SHARE_STORAGE_PREFIX = 'share-target:payload:';

const buildTagTree = (items: EvidenceItem[]): Record<string, TagNode> => {
  const root: Record<string, TagNode> = {};
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

const TagTree: React.FC<{
  data: Record<string, TagNode>;
  onSelect: (node: TagNode | null) => void;
}> = ({ data, onSelect }) => (
  <ul className="pl-4">
    {Object.entries(data).map(([name, node]) => (
      <TagTreeNode key={name} name={name} node={node} onSelect={onSelect} />
    ))}
  </ul>
);

const TagTreeNode: React.FC<{
  name: string;
  node: TagNode;
  onSelect: (node: TagNode | null) => void;
}> = ({ name, node, onSelect }) => {
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

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

const dataUrlToBlob = (dataUrl: string, fallbackType?: string) => {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header?.match(/data:(.*?);base64/);
  const mimeType = mimeMatch?.[1] ?? fallbackType ?? 'application/octet-stream';
  const binary = typeof atob === 'function' ? atob(base64 ?? '') : '';
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
};

const createFileFromDataUrl = (item: EvidenceFile) => {
  if (typeof File !== 'function') return undefined;
  const blob = dataUrlToBlob(item.dataUrl, item.mimeType);
  try {
    return new File([blob], item.name, { type: item.mimeType });
  } catch {
    return undefined;
  }
};

const describeFailure = (reason?: ShareFailureReason) => {
  switch (reason) {
    case 'unsupported':
      return 'Sharing is not supported on this device.';
    case 'unsupported-payload':
      return 'This payload cannot be shared by the current browser.';
    case 'permission-denied':
      return 'Permission to share was denied.';
    case 'invalid':
      return 'The generated share data was rejected.';
    default:
      return 'The share action could not be completed.';
  }
};

const buildNoteFromSharedPayload = (payload: Pick<StoredSharePayload, 'title' | 'text' | 'url'>) => {
  const parts = [payload.title, payload.text, payload.url].filter(Boolean);
  return parts.length ? parts.join('\n\n') : undefined;
};

const triggerDownload = (name: string, data: object) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};

const EvidenceVaultApp: React.FC<EvidenceVaultProps> = ({ initialItems = [] }) => {
  const [items, setItems] = useState<EvidenceItem[]>(initialItems);
  const [selectedNode, setSelectedNode] = useState<TagNode | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [shareState, setShareState] = useState<{
    phase: 'idle' | 'preparing' | 'sharing' | 'success' | 'error';
    message?: string;
  }>({ phase: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileUrlsRef = useRef(new Set<string>());

  useEffect(() => {
    return () => {
      fileUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      fileUrlsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const shareKey = params.get('shareKey');
    if (!shareKey) return;
    try {
      const storageKey = shareKey.startsWith(SHARE_STORAGE_PREFIX)
        ? shareKey
        : `${SHARE_STORAGE_PREFIX}${shareKey}`;
      const raw = window.sessionStorage.getItem(shareKey) ?? window.sessionStorage.getItem(storageKey);
      if (!raw) {
        setStatusMessage('Shared content was not found. It may have expired.');
        return;
      }
      window.sessionStorage.removeItem(shareKey);
      window.sessionStorage.removeItem(storageKey);
      const payload = JSON.parse(raw) as StoredSharePayload;
      const imported: EvidenceItem[] = [];
      const timestamp = Date.now();
      const noteContent = buildNoteFromSharedPayload(payload);
      if (noteContent) {
        imported.push({
          id: timestamp,
          type: 'note',
          title: payload.title || 'Shared Note',
          content: noteContent,
          tags: ['shared/imported'],
          createdAt: timestamp,
        });
      }
      payload.files?.forEach((file, idx) => {
        const blob = dataUrlToBlob(file.dataUrl, file.type);
        const objectUrl = URL.createObjectURL(blob);
        fileUrlsRef.current.add(objectUrl);
        imported.push({
          id: timestamp + idx + 1,
          type: 'file',
          name: file.name,
          tags: ['shared/imported'],
          dataUrl: file.dataUrl,
          mimeType: file.type,
          size: file.size,
          objectUrl,
        });
      });
      if (imported.length) {
        setItems((prev) => [...imported, ...prev]);
        setStatusMessage(`Imported ${imported.length} item${imported.length === 1 ? '' : 's'} from share sheet.`);
      } else {
        setStatusMessage('No importable content found in the share payload.');
      }
    } catch (error) {
      console.error('Failed to import shared payload', error);
      setStatusMessage('Failed to import shared content.');
    }
  }, []);

  useEffect(() => {
    // Reset selection when items change significantly
    setSelectedNode(null);
    setSelectedIds([]);
  }, [items.length]);

  const addNote = () => {
    const title = prompt('Note title');
    if (!title) return;
    const content = prompt('Note content') || '';
    const tagInput = prompt('Tags (comma separated, use / for hierarchy)') || '';
    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const id = Date.now();
    setItems((prev) => [
      ...prev,
      { id, type: 'note', title, content, tags, createdAt: Date.now() },
    ]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const tagInput = prompt('Tags (comma separated, use / for hierarchy)') || '';
    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const objectUrl = URL.createObjectURL(file);
      fileUrlsRef.current.add(objectUrl);
      const id = Date.now();
      setItems((prev) => [
        ...prev,
        {
          id,
          type: 'file',
          name: file.name,
          tags,
          dataUrl,
          mimeType: file.type,
          size: file.size,
          objectUrl,
        },
      ]);
    } catch (error) {
      console.error('Failed to import file', error);
      setStatusMessage('Unable to import that file.');
    } finally {
      e.target.value = '';
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((existing) => existing !== id) : [...prev, id]
    );
  };

  const clearSelection = () => setSelectedIds([]);

  const shareSelected = async () => {
    const chosen = items.filter((item) => selectedIds.includes(item.id));
    if (!chosen.length) {
      setShareState({ phase: 'error', message: 'Select at least one item to share.' });
      return;
    }
    setShareState({ phase: 'preparing', message: 'Preparing evidence bundle…' });

    const noteSegments: string[] = [];
    const files: File[] = [];
    chosen.forEach((item) => {
      if (item.type === 'note') {
        noteSegments.push(`${item.title}\n${item.content}`);
      } else {
        const file = createFileFromDataUrl(item);
        if (file) files.push(file);
      }
    });

    if (!noteSegments.length && !files.length) {
      setShareState({ phase: 'error', message: 'No shareable content selected.' });
      return;
    }

    const text = noteSegments.length ? noteSegments.join('\n\n---\n\n') : undefined;
    setShareState({ phase: 'sharing', message: 'Opening share sheet…' });
    let result: ShareResult;
    try {
      result = await share(
        {
          text,
          files: files.length ? files : undefined,
        },
        { reason: 'evidence-vault-share' }
      );
    } catch (error) {
      console.error('Share API threw unexpectedly', error);
      result = { ok: false, reason: 'unknown', error };
    }

    if (result.ok) {
      setShareState({ phase: 'success', message: 'Shared successfully.' });
      clearSelection();
      return;
    }

    if (result.reason === 'cancelled') {
      setShareState({ phase: 'idle', message: 'Share cancelled.' });
      return;
    }

    const fallbackData = {
      generatedAt: new Date().toISOString(),
      items: chosen.map((item) =>
        item.type === 'note'
          ? {
              id: item.id,
              type: item.type,
              title: item.title,
              content: item.content,
              tags: item.tags,
              createdAt: item.createdAt,
            }
          : {
              id: item.id,
              type: item.type,
              name: item.name,
              tags: item.tags,
              mimeType: item.mimeType,
              size: item.size,
              dataUrl: item.dataUrl,
            }
      ),
    };
    triggerDownload('evidence-vault-share.json', fallbackData);
    const message = `${describeFailure(result.reason)} Downloaded a JSON bundle instead.`;
    setShareState({ phase: 'error', message });
  };

  const treeData = useMemo(() => buildTagTree(items), [items]);
  const displayItems = selectedNode ? selectedNode.items : items;
  const hasSelection = selectedIds.length > 0;
  const shareDisabled =
    !hasSelection || shareState.phase === 'preparing' || shareState.phase === 'sharing';

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
        <div className="mb-2 flex flex-wrap items-center gap-2">
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
            onClick={shareSelected}
            className={`px-2 py-1 rounded ${
              shareDisabled ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600'
            }`}
            disabled={shareDisabled}
          >
            Share Selected
          </button>
          {shareState.message && (
            <span role="status" className="text-xs text-gray-200">
              {shareState.message}
            </span>
          )}
        </div>
        {statusMessage && (
          <div className="mb-2 rounded border border-blue-500 bg-blue-900/40 p-2 text-xs">
            {statusMessage}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
        <ul className="flex-1 overflow-auto space-y-2">
          {displayItems.map((item) => (
            <li key={item.id} className="p-2 bg-gray-800 rounded">
              <div className="flex items-start justify-between gap-2">
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => toggleSelection(item.id)}
                    aria-label={`Select ${item.type === 'note' ? item.title : item.name}`}
                  />
                  <span>Select</span>
                </label>
                {item.type === 'file' && (
                  <span className="text-[10px] text-gray-400">
                    {(item.size / 1024).toFixed(1)} KB
                  </span>
                )}
              </div>
              {item.type === 'note' ? (
                <div>
                  <h4 className="font-semibold">{item.title}</h4>
                  <p className="text-sm whitespace-pre-wrap">{item.content}</p>
                </div>
              ) : (
                <div>
                  <h4 className="font-semibold">{item.name}</h4>
                  <a
                    href={item.objectUrl}
                    download={item.name}
                    className="text-blue-400 underline text-sm"
                  >
                    Download
                  </a>
                </div>
              )}
              {item.tags.length > 0 && (
                <p className="text-xs mt-1 text-gray-400">Tags: {item.tags.join(', ')}</p>
              )}
            </li>
          ))}
          {displayItems.length === 0 && (
            <li className="p-4 text-sm text-gray-400">No items yet. Add notes or files to begin.</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default EvidenceVaultApp;
