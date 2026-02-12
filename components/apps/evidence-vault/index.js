import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  loadEvidenceRecords,
  persistEvidenceRecords,
} from '../../../utils/evidenceVaultStorage';

/**
 * @typedef {import('../../../utils/evidenceVaultStorage').EvidenceRecord} EvidenceRecord
 */

const UNTITLED_RECORD = 'Untitled evidence';
const UNTITLED_NOTE = 'Untitled note';
const UNTAGGED_LABEL = '(untagged)';

const normalizeTags = (value) => {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
};

const runPrompts = (steps) => {
  const responses = {};
  for (const step of steps) {
    const input = window.prompt(step.message, step.defaultValue ?? '');
    if (input === null) return null;
    responses[step.key] = step.transform ? step.transform(input) : input;
  }
  return responses;
};

const formatTimestamp = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().replace('T', ' ').replace('Z', ' UTC');
};

const formatSize = (size) => {
  if (typeof size !== 'number') return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `evidence-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

const readFileAsDataUrl = async (file) => {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  }
  const buffer = await file.arrayBuffer();
  if (typeof Buffer !== 'undefined') {
    return `data:${file.type || 'application/octet-stream'};base64,${Buffer.from(buffer).toString('base64')}`;
  }
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${file.type || 'application/octet-stream'};base64,${btoa(binary)}`;
};

const buildTagTree = (records) => {
  const root = {};
  records.forEach((record) => {
    const tags = record?.metadata?.tags?.length
      ? record.metadata.tags
      : [UNTAGGED_LABEL];
    tags.forEach((tag) => {
      const parts = tag.split('/').filter(Boolean);
      if (!parts.length) parts.push(UNTAGGED_LABEL);
      let node = root;
      parts.forEach((part) => {
        if (!node[part]) {
          node[part] = { children: {}, records: new Set() };
        }
        node[part].records.add(record);
        node = node[part].children;
      });
    });
  });

  const normalize = (node) =>
    Object.fromEntries(
      Object.entries(node).map(([key, value]) => {
        const normalizedChildren = normalize(value.children);
        const recordsArray = Array.from(value.records);
        return [
          key,
          {
            children: normalizedChildren,
            records: recordsArray,
            count: recordsArray.length,
          },
        ];
      })
    );

  return normalize(root);
};

const TagTree = ({ data, onSelect, selectedPath, parentPath = [] }) => {
  const entries = Object.entries(data);
  if (!entries.length) {
    return <p className="text-xs text-gray-500 mt-2">No tags defined yet.</p>;
  }
  return (
    <ul className="pl-2 space-y-1">
      {entries.map(([name, node]) => (
        <TagTreeNode
          key={name}
          name={name}
          node={node}
          onSelect={onSelect}
          selectedPath={selectedPath}
          path={[...parentPath, name]}
        />
      ))}
    </ul>
  );
};

const TagTreeNode = ({ name, node, onSelect, selectedPath, path }) => {
  const hasChildren = Object.keys(node.children).length > 0;
  const joinedPath = path.join('/');
  const isSelected = selectedPath === joinedPath;
  const handleSelect = (event) => {
    event.preventDefault();
    onSelect(joinedPath);
  };
  return (
    <li>
      {hasChildren ? (
        <details open>
          <summary className="flex items-center justify-between text-sm text-gray-200 cursor-pointer">
            <span>{name}</span>
            <button
              type="button"
              onClick={handleSelect}
              className={`ml-2 text-xs ${
                isSelected ? 'text-white underline' : 'text-blue-400 hover:underline'
              }`}
            >
              View ({node.count})
            </button>
          </summary>
          <TagTree
            data={node.children}
            onSelect={onSelect}
            selectedPath={selectedPath}
            parentPath={path}
          />
        </details>
      ) : (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            onSelect(joinedPath);
          }}
          className={`w-full text-left text-sm px-2 py-1 rounded transition-colors ${
            isSelected ? 'bg-blue-600 text-white' : 'text-gray-200 hover:bg-gray-800'
          }`}
        >
          <span>{name}</span>
          <span className="ml-2 text-xs text-gray-400">({node.count})</span>
        </button>
      )}
    </li>
  );
};

const EvidenceVaultApp = () => {
  const [records, setRecords] = useState([]);
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [selectedTagPath, setSelectedTagPath] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const pendingFileTarget = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const stored = await loadEvidenceRecords();
        if (cancelled) return;
        if (stored.length) {
          setRecords(stored);
        } else {
          const res = await fetch('/demo-data/evidence-vault/records.json');
          if (!res.ok) throw new Error('Unable to load demo dataset');
          const data = await res.json();
          if (!cancelled) {
            setRecords(data);
          }
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError('Unable to load evidence records. Try refreshing the app.');
          setRecords([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    persistEvidenceRecords(records).catch((err) => {
      console.warn('Failed to persist evidence records', err);
    });
  }, [records, loading]);

  const tagTree = useMemo(() => buildTagTree(records), [records]);

  const filteredRecords = useMemo(() => {
    if (!selectedTagPath) return records;
    return records.filter((record) => {
      const tags = record?.metadata?.tags || [];
      if (!tags.length) {
        return selectedTagPath === UNTAGGED_LABEL;
      }
      return tags.some((tag) => {
        const normalized = tag.split('/').filter(Boolean).join('/');
        return (
          normalized === selectedTagPath ||
          normalized.startsWith(`${selectedTagPath}/`)
        );
      });
    });
  }, [records, selectedTagPath]);

  useEffect(() => {
    if (!filteredRecords.length) {
      setSelectedRecordId(null);
      return;
    }
    const exists = filteredRecords.some((record) => record.id === selectedRecordId);
    if (!exists) {
      setSelectedRecordId(filteredRecords[0].id);
    }
  }, [filteredRecords, selectedRecordId]);

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedRecordId) || null,
    [records, selectedRecordId]
  );

  const handleCreateRecord = () => {
    const responses = runPrompts([
      { key: 'title', message: 'Record title', transform: (value) => value.trim() },
      { key: 'summary', message: 'Summary', transform: (value) => value.trim() },
      {
        key: 'status',
        message: 'Status',
        defaultValue: 'Draft',
        transform: (value) => value.trim() || 'Draft',
      },
      {
        key: 'classification',
        message: 'Classification',
        defaultValue: 'Unclassified',
        transform: (value) => value.trim(),
      },
      { key: 'caseId', message: 'Case ID', transform: (value) => value.trim() },
      { key: 'source', message: 'Source', transform: (value) => value.trim() },
      { key: 'location', message: 'Location', transform: (value) => value.trim() },
      { key: 'analyst', message: 'Analyst', transform: (value) => value.trim() },
      {
        key: 'collectedAt',
        message: 'Collected at (ISO timestamp)',
        transform: (value) => value.trim(),
      },
      {
        key: 'tags',
        message: 'Tags (comma separated)',
        transform: normalizeTags,
      },
    ]);
    if (!responses) return;
    const newRecord = {
      id: generateId(),
      title: responses.title || UNTITLED_RECORD,
      summary: responses.summary || '',
      status: responses.status || 'Draft',
      metadata: {
        classification: responses.classification || '',
        caseId: responses.caseId || '',
        source: responses.source || '',
        location: responses.location || '',
        analyst: responses.analyst || '',
        collectedAt: responses.collectedAt || '',
        tags: Array.isArray(responses.tags) ? responses.tags : [],
      },
      attachments: [],
    };
    setRecords((prev) => [newRecord, ...prev]);
    setSelectedTagPath(null);
    setSelectedRecordId(newRecord.id);
  };

  const handleEditRecord = (record) => {
    const responses = runPrompts([
      {
        key: 'title',
        message: 'Record title',
        defaultValue: record.title,
        transform: (value) => value.trim(),
      },
      {
        key: 'summary',
        message: 'Summary',
        defaultValue: record.summary,
        transform: (value) => value.trim(),
      },
      {
        key: 'status',
        message: 'Status',
        defaultValue: record.status,
        transform: (value) => value.trim() || record.status,
      },
      {
        key: 'classification',
        message: 'Classification',
        defaultValue: record.metadata.classification || '',
        transform: (value) => value.trim(),
      },
      {
        key: 'caseId',
        message: 'Case ID',
        defaultValue: record.metadata.caseId || '',
        transform: (value) => value.trim(),
      },
      {
        key: 'source',
        message: 'Source',
        defaultValue: record.metadata.source || '',
        transform: (value) => value.trim(),
      },
      {
        key: 'location',
        message: 'Location',
        defaultValue: record.metadata.location || '',
        transform: (value) => value.trim(),
      },
      {
        key: 'analyst',
        message: 'Analyst',
        defaultValue: record.metadata.analyst || '',
        transform: (value) => value.trim(),
      },
      {
        key: 'collectedAt',
        message: 'Collected at (ISO timestamp)',
        defaultValue: record.metadata.collectedAt || '',
        transform: (value) => value.trim(),
      },
      {
        key: 'tags',
        message: 'Tags (comma separated)',
        defaultValue: record.metadata.tags.join(', '),
        transform: normalizeTags,
      },
    ]);
    if (!responses) return;
    setRecords((prev) =>
      prev.map((item) =>
        item.id === record.id
          ? {
              ...item,
              title: responses.title || UNTITLED_RECORD,
              summary: responses.summary || '',
              status: responses.status || item.status,
              metadata: {
                classification: responses.classification || '',
                caseId: responses.caseId || '',
                source: responses.source || '',
                location: responses.location || '',
                analyst: responses.analyst || '',
                collectedAt: responses.collectedAt || '',
                tags: Array.isArray(responses.tags)
                  ? responses.tags
                  : item.metadata.tags,
              },
            }
          : item
      )
    );
  };

  const handleDeleteRecord = (recordId) => {
    if (!window.confirm('Delete this evidence record?')) return;
    setRecords((prev) => prev.filter((record) => record.id !== recordId));
  };

  const handleAddNote = (recordId) => {
    const responses = runPrompts([
      {
        key: 'title',
        message: 'Note title',
        defaultValue: 'New note',
        transform: (value) => value.trim(),
      },
      {
        key: 'body',
        message: 'Note body',
        defaultValue: '',
      },
      {
        key: 'description',
        message: 'Note description (optional)',
        defaultValue: '',
        transform: (value) => value.trim(),
      },
      {
        key: 'tags',
        message: 'Note tags (comma separated)',
        defaultValue: '',
        transform: normalizeTags,
      },
    ]);
    if (!responses) return;
    const newNote = {
      id: generateId(),
      kind: 'note',
      title: responses.title || UNTITLED_NOTE,
      description: responses.description || undefined,
      body: responses.body || '',
      createdAt: new Date().toISOString(),
      tags: Array.isArray(responses.tags) ? responses.tags : [],
    };
    setRecords((prev) =>
      prev.map((record) =>
        record.id === recordId
          ? { ...record, attachments: [...record.attachments, newNote] }
          : record
      )
    );
  };

  const handleRequestFile = (recordId) => {
    pendingFileTarget.current = recordId;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const [file] = event.target.files || [];
    const recordId = pendingFileTarget.current;
    event.target.value = '';
    if (!file || !recordId) return;
    pendingFileTarget.current = null;
    const responses = runPrompts([
      {
        key: 'title',
        message: 'Attachment title',
        defaultValue: file.name,
        transform: (value) => value.trim(),
      },
      {
        key: 'description',
        message: 'Attachment description (optional)',
        defaultValue: '',
        transform: (value) => value.trim(),
      },
      {
        key: 'tags',
        message: 'Attachment tags (comma separated)',
        defaultValue: '',
        transform: normalizeTags,
      },
    ]);
    if (!responses) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const mimeType = file.type || 'application/octet-stream';
      const attachment = {
        id: generateId(),
        kind: 'file',
        title: responses.title || file.name,
        description: responses.description || undefined,
        createdAt: new Date().toISOString(),
        tags: Array.isArray(responses.tags) ? responses.tags : [],
        fileName: file.name,
        mimeType,
        sizeBytes: file.size,
        downloadUrl: typeof dataUrl === 'string' ? dataUrl : undefined,
      };
      setRecords((prev) =>
        prev.map((record) =>
          record.id === recordId
            ? { ...record, attachments: [...record.attachments, attachment] }
            : record
        )
      );
    } catch (err) {
      console.error('Unable to read attachment', err);
      setError('Unable to read attachment. Please try again with a different file.');
      setTimeout(() => setError(''), 4000);
    }
  };

  const handleRemoveAttachment = (recordId, attachmentId) => {
    if (!window.confirm('Remove this attachment?')) return;
    setRecords((prev) =>
      prev.map((record) =>
        record.id === recordId
          ? {
              ...record,
              attachments: record.attachments.filter(
                (attachment) => attachment.id !== attachmentId
              ),
            }
          : record
      )
    );
  };

  const handleReloadDemo = async () => {
    try {
      const res = await fetch('/demo-data/evidence-vault/records.json');
      if (!res.ok) throw new Error('Unable to load demo dataset');
      const data = await res.json();
      setRecords(data);
      setSelectedTagPath(null);
      setSelectedRecordId(data[0]?.id || null);
    } catch (err) {
      console.error(err);
      setError('Unable to reload demo dataset. Check the network tab and try again.');
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full bg-gray-900 text-white flex items-center justify-center">
        Loading evidence dataset...
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gray-900 text-white flex">
      <aside className="w-64 border-r border-gray-800 p-4 flex flex-col">
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleCreateRecord}
            className="w-full px-3 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded"
          >
            New record
          </button>
          <button
            type="button"
            onClick={handleReloadDemo}
            className="w-full px-3 py-2 text-sm font-medium bg-gray-800 hover:bg-gray-700 rounded"
          >
            Reload demo dataset
          </button>
        </div>
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-400">
            <span>Tag filter</span>
            <button
              type="button"
              onClick={() => setSelectedTagPath(null)}
              className={`text-xs ${
                selectedTagPath ? 'text-blue-400 hover:underline' : 'text-gray-500'
              }`}
            >
              Clear
            </button>
          </div>
          <div className="mt-2" data-testid="tag-tree">
            <button
              type="button"
              onClick={() => setSelectedTagPath(null)}
              className={`w-full text-left text-sm px-2 py-1 rounded ${
                !selectedTagPath
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-200 hover:bg-gray-800'
              }`}
            >
              All evidence
            </button>
            <TagTree
              data={tagTree}
              onSelect={setSelectedTagPath}
              selectedPath={selectedTagPath}
            />
          </div>
        </div>
        {error && (
          <div className="mt-6 text-xs text-red-300 bg-red-900/30 border border-red-700 rounded p-2">
            {error}
          </div>
        )}
      </aside>
      <section className="w-80 border-r border-gray-800 p-4 overflow-y-auto">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Evidence records
        </h2>
        <div className="mt-3 space-y-2" data-testid="record-list">
          {filteredRecords.map((record) => {
            const isActive = record.id === selectedRecordId;
            return (
              <button
                type="button"
                key={record.id}
                onClick={() => setSelectedRecordId(record.id)}
                className={`w-full text-left px-3 py-2 rounded border transition-colors ${
                  isActive
                    ? 'border-blue-500 bg-blue-600/20'
                    : 'border-gray-800 bg-gray-800 hover:border-gray-600'
                }`}
              >
                <p className="text-sm font-semibold text-white">
                  {record.title || UNTITLED_RECORD}
                </p>
                <p className="text-xs text-blue-300">{record.status}</p>
                <p className="mt-1 text-xs text-gray-400 line-clamp-2">
                  {record.summary || 'No summary provided.'}
                </p>
              </button>
            );
          })}
          {!filteredRecords.length && (
            <p className="text-xs text-gray-500">
              No records found for this tag selection.
            </p>
          )}
        </div>
      </section>
      <section className="flex-1 p-6 overflow-y-auto">
        {selectedRecord ? (
          <div className="space-y-6" data-testid="record-detail">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold text-white">
                  {selectedRecord.title || UNTITLED_RECORD}
                </h1>
                <p className="text-sm text-blue-300">{selectedRecord.status}</p>
                <p className="mt-2 text-sm text-gray-200 whitespace-pre-wrap">
                  {selectedRecord.summary || 'No summary documented yet.'}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleEditRecord(selectedRecord)}
                  className="px-3 py-2 text-sm font-medium bg-gray-800 hover:bg-gray-700 rounded"
                >
                  Edit details
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteRecord(selectedRecord.id)}
                  data-testid="delete-record"
                  className="px-3 py-2 text-sm font-medium bg-red-700 hover:bg-red-600 rounded"
                >
                  Delete record
                </button>
              </div>
            </header>
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Metadata
              </h2>
              <dl
                className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm"
                data-testid="metadata-list"
              >
                <div>
                  <dt className="text-gray-400">Case ID</dt>
                  <dd className="text-white">{selectedRecord.metadata.caseId || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Classification</dt>
                  <dd className="text-white">
                    {selectedRecord.metadata.classification || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-400">Source</dt>
                  <dd className="text-white">{selectedRecord.metadata.source || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Location</dt>
                  <dd className="text-white">
                    {selectedRecord.metadata.location || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-400">Analyst</dt>
                  <dd className="text-white">{selectedRecord.metadata.analyst || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Collected</dt>
                  <dd className="text-white">
                    {formatTimestamp(selectedRecord.metadata.collectedAt)}
                  </dd>
                </div>
              </dl>
              <div
                className="mt-3 flex flex-wrap gap-2"
                data-testid="record-tags"
              >
                {selectedRecord.metadata.tags.length ? (
                  selectedRecord.metadata.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-gray-800 text-gray-200 px-2 py-1 rounded"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-500">No tags applied.</span>
                )}
              </div>
            </section>
            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Attachments
                </h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddNote(selectedRecord.id)}
                    data-testid="add-note"
                    className="px-3 py-2 text-xs font-medium bg-gray-800 hover:bg-gray-700 rounded"
                  >
                    Add note
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRequestFile(selectedRecord.id)}
                    data-testid="add-file"
                    className="px-3 py-2 text-xs font-medium bg-gray-800 hover:bg-gray-700 rounded"
                  >
                    Add file
                  </button>
                </div>
              </div>
              <input
                aria-label="Upload attachment"
                ref={fileInputRef}
                type="file"
                data-testid="file-input"
                className="hidden"
                onChange={handleFileChange}
              />
              <ul className="mt-3 space-y-3" data-testid="attachments-list">
                {selectedRecord.attachments.map((attachment) => (
                  <li key={attachment.id} className="border border-gray-800 rounded p-4 bg-gray-800">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {attachment.title}
                        </p>
                        <p className="text-xs text-gray-400">
                          {attachment.description || 'No description provided.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(selectedRecord.id, attachment.id)}
                        className="text-xs text-red-300 hover:text-red-200"
                      >
                        Remove
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Added {formatTimestamp(attachment.createdAt)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {attachment.tags?.length ? (
                        attachment.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[0.65rem] bg-gray-800 text-gray-300 px-2 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-[0.65rem] text-gray-500">No tags</span>
                      )}
                    </div>
                    {attachment.kind === 'note' ? (
                      <pre className="mt-3 whitespace-pre-wrap text-sm text-gray-200">
                        {attachment.body || 'No note content provided.'}
                      </pre>
                    ) : (
                      <div className="mt-3 text-sm text-gray-200 space-y-1">
                        <p>
                          <span className="font-semibold">File:</span> {attachment.fileName || '—'}
                        </p>
                        <p>
                          <span className="font-semibold">Type:</span> {attachment.mimeType || '—'}
                        </p>
                        <p>
                          <span className="font-semibold">Size:</span> {formatSize(attachment.sizeBytes)}
                        </p>
                        {attachment.downloadUrl ? (
                          <a
                            href={attachment.downloadUrl}
                            download={attachment.fileName || attachment.title}
                            className="inline-block text-blue-400 hover:underline"
                          >
                            Download attachment
                          </a>
                        ) : (
                          <p className="text-xs text-gray-400">
                            Download unavailable for this attachment.
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                ))}
                {!selectedRecord.attachments.length && (
                  <li className="text-sm text-gray-400">
                    No attachments captured yet.
                  </li>
                )}
              </ul>
            </section>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Select or create a record to review its details.
          </div>
        )}
      </section>
    </div>
  );
};

export default EvidenceVaultApp;
