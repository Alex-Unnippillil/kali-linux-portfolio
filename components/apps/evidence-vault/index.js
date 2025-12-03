import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import toolTags from '../../../data/tools/tags.json';

const STATIC_TOOL_TAGS = Array.isArray(toolTags) ? toolTags : toolTags.tags ?? [];

marked.setOptions({ gfm: true, breaks: true });

// Build hierarchical tree from slash-delimited tags
const buildTagTree = (items) => {
  const root = {};
  items.forEach((item) => {
    (item.tags || []).forEach((tag) => {
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
  return root;
};

const TagTree = ({ data, onSelect }) => (
  <ul className="pl-4">
    {Object.entries(data)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, node]) => (
        <TagTreeNode key={name} name={name} node={node} onSelect={onSelect} />
      ))}
  </ul>
);

const TagTreeNode = ({ name, node, onSelect }) => {
  const hasChildren = Object.keys(node.children).length > 0;
  const itemCount = node.items.length;
  return (
    <li className="mb-1">
      {hasChildren ? (
        <details>
          <summary className="cursor-pointer">{name}</summary>
          {itemCount > 0 && (
            <button
              type="button"
              onClick={() => onSelect(node)}
              className="ml-2 text-xs text-blue-400 hover:underline"
            >
              View items ({itemCount})
            </button>
          )}
          <TagTree data={node.children} onSelect={onSelect} />
        </details>
      ) : (
        <button
          type="button"
          onClick={() => onSelect(node)}
          className="text-left hover:underline focus:outline-none"
        >
          {name} {itemCount > 0 && <span className="text-xs text-gray-400">({itemCount})</span>}
        </button>
      )}
    </li>
  );
};

const TagInput = ({
  selectedTags,
  onChange,
  suggestions,
  placeholder,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const normalizedSuggestions = useMemo(() => {
    const seen = new Set();
    return suggestions
      .map((tag) => tag.trim())
      .filter(Boolean)
      .filter((tag) => {
        const lower = tag.toLowerCase();
        if (seen.has(lower)) return false;
        seen.add(lower);
        return true;
      })
      .sort((a, b) => a.localeCompare(b));
  }, [suggestions]);

  const selectedLower = useMemo(
    () => new Set(selectedTags.map((tag) => tag.toLowerCase())),
    [selectedTags],
  );

  const filteredSuggestions = useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    return normalizedSuggestions
      .filter((tag) => {
        const lower = tag.toLowerCase();
        if (selectedLower.has(lower)) return false;
        return query ? lower.includes(query) : true;
      })
      .slice(0, 8);
  }, [inputValue, normalizedSuggestions, selectedLower]);

  const addTag = useCallback(
    (tag) => {
      const normalized = tag.trim();
      if (!normalized) return;
      const lower = normalized.toLowerCase();
      if (selectedLower.has(lower)) return;
      onChange([...selectedTags, normalized]);
      setInputValue('');
    },
    [onChange, selectedLower, selectedTags],
  );

  const removeTag = useCallback(
    (tag) => {
      onChange(selectedTags.filter((t) => t !== tag));
    },
    [onChange, selectedTags],
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' || event.key === 'Tab' || event.key === ',') {
        if (inputValue.trim()) {
          event.preventDefault();
          addTag(inputValue);
        }
      } else if (event.key === 'Backspace' && !inputValue && selectedTags.length) {
        event.preventDefault();
        removeTag(selectedTags[selectedTags.length - 1]);
      }
    },
    [addTag, inputValue, removeTag, selectedTags],
  );

  const handleSuggestionSelect = useCallback(
    (tag) => {
      addTag(tag);
    },
    [addTag],
  );

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2 rounded border border-gray-600 bg-gray-800 p-2 focus-within:border-blue-400">
        {selectedTags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded bg-gray-700 px-2 py-1 text-xs"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-gray-300 hover:text-white"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="min-w-[120px] flex-1 bg-transparent text-sm text-white outline-none"
          placeholder={selectedTags.length === 0 ? placeholder : ''}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setTimeout(() => setIsFocused(false), 100);
          }}
        />
      </div>
      {isFocused && filteredSuggestions.length > 0 && (
        <ul className="absolute left-0 top-full z-20 mt-1 max-h-40 w-full overflow-auto rounded border border-gray-600 bg-gray-900 shadow-lg">
          {filteredSuggestions.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-800"
                onMouseDown={(event) => {
                  event.preventDefault();
                  handleSuggestionSelect(tag);
                }}
              >
                {tag}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const timeThresholds = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

const EvidenceVaultApp = () => {
  const [items, setItems] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const fileInputRef = useRef(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showFileForm, setShowFileForm] = useState(false);
  const [noteForm, setNoteForm] = useState({
    title: '',
    ticket: '',
    tags: [],
    content: '',
  });
  const [fileForm, setFileForm] = useState({
    file: null,
    ticket: '',
    tags: [],
    description: '',
  });
  const [filters, setFilters] = useState({ tag: '', ticket: '', time: 'all' });

  useEffect(() => {
    setSelectedNode(null);
  }, [items]);

  const sanitizeContent = useCallback((raw) => {
    const parsed = marked.parse(raw ?? '');
    if (typeof window === 'undefined') {
      return parsed;
    }
    return DOMPurify.sanitize(parsed);
  }, []);

  const workspaceTags = useMemo(() => {
    const tagSet = new Set();
    items.forEach((item) => {
      (item.tags || []).forEach((tag) => {
        tagSet.add(tag);
      });
    });
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const tagSuggestions = useMemo(() => {
    const combined = new Set();
    STATIC_TOOL_TAGS.forEach((tag) => combined.add(tag));
    workspaceTags.forEach((tag) => combined.add(tag));
    return Array.from(combined).sort((a, b) => a.localeCompare(b));
  }, [workspaceTags]);

  const availableFilterTags = useMemo(() => workspaceTags, [workspaceTags]);

  const treeData = useMemo(() => buildTagTree(items), [items]);
  const displayItems = selectedNode ? selectedNode.items : items;

  const filteredItems = useMemo(() => {
    const now = Date.now();
    return displayItems.filter((item) => {
      if (filters.tag && !(item.tags || []).some((tag) => tag === filters.tag)) {
        return false;
      }
      if (
        filters.ticket &&
        !(item.ticket || '')
          .toLowerCase()
          .includes(filters.ticket.trim().toLowerCase())
      ) {
        return false;
      }
      if (filters.time !== 'all') {
        const threshold = timeThresholds[filters.time];
        if (threshold) {
          const created = new Date(item.createdAt).getTime();
          if (Number.isFinite(created) && now - created > threshold) {
            return false;
          }
        }
      }
      return true;
    });
  }, [displayItems, filters]);

  const resetNoteForm = useCallback(() => {
    setNoteForm({ title: '', ticket: '', tags: [], content: '' });
  }, []);

  const resetFileForm = useCallback(() => {
    setFileForm({ file: null, ticket: '', tags: [], description: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const toggleNoteForm = useCallback(() => {
    setShowNoteForm((prev) => {
      const next = !prev;
      if (next) {
        setShowFileForm(false);
      } else {
        resetNoteForm();
      }
      return next;
    });
  }, [resetNoteForm]);

  const toggleFileForm = useCallback(() => {
    setShowFileForm((prev) => {
      const next = !prev;
      if (next) {
        setShowNoteForm(false);
      } else {
        resetFileForm();
      }
      return next;
    });
  }, [resetFileForm]);

  const handleNoteSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const trimmedTitle = noteForm.title.trim();
      const trimmedContent = noteForm.content.trim();
      if (!trimmedTitle && !trimmedContent) {
        return;
      }
      const sanitized = sanitizeContent(trimmedContent);
      setItems((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: 'note',
          title: trimmedTitle || 'Untitled note',
          tags: noteForm.tags,
          ticket: noteForm.ticket.trim(),
          createdAt: new Date().toISOString(),
          noteMarkdown: trimmedContent,
          noteHtml: sanitized,
        },
      ]);
      resetNoteForm();
      setShowNoteForm(false);
    },
    [noteForm, resetNoteForm, sanitizeContent],
  );

  const handleFileSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const file = fileForm.file;
      if (!file) {
        return;
      }
      const url = URL.createObjectURL(file);
      const sanitizedDescription = fileForm.description
        ? sanitizeContent(fileForm.description)
        : '';
      setItems((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: 'file',
          name: file.name,
          fileUrl: url,
          tags: fileForm.tags,
          ticket: fileForm.ticket.trim(),
          createdAt: new Date().toISOString(),
          noteMarkdown: fileForm.description,
          noteHtml: sanitizedDescription,
        },
      ]);
      resetFileForm();
      setShowFileForm(false);
    },
    [fileForm, resetFileForm, sanitizeContent],
  );

  const notePreview = useMemo(() => {
    if (!showNoteForm || !noteForm.content.trim()) {
      return '';
    }
    if (typeof window === 'undefined') {
      return '';
    }
    return sanitizeContent(noteForm.content);
  }, [noteForm.content, sanitizeContent, showNoteForm]);

  const fileDescriptionPreview = useMemo(() => {
    if (!showFileForm || !fileForm.description.trim()) {
      return '';
    }
    if (typeof window === 'undefined') {
      return '';
    }
    return sanitizeContent(fileForm.description);
  }, [fileForm.description, sanitizeContent, showFileForm]);

  const formatTimestamp = useCallback((iso) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleString();
  }, []);

  return (
    <div className="flex h-full w-full flex-col bg-gray-900 p-4 text-white md:flex-row">
      <div className="md:w-1/3 md:border-r md:border-gray-700 md:pr-3">
        <div className="mb-3 flex items-center justify-between md:block">
          <button
            type="button"
            onClick={() => setSelectedNode(null)}
            className="text-sm text-blue-400 hover:underline"
          >
            All Items
          </button>
        </div>
        <div className="max-h-64 overflow-auto md:max-h-none">
          {Object.keys(treeData).length > 0 ? (
            <TagTree data={treeData} onSelect={setSelectedNode} />
          ) : (
            <p className="text-sm text-gray-400">No tags yet.</p>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-1 flex-col md:mt-0 md:pl-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={toggleNoteForm}
            className="rounded bg-blue-600 px-3 py-1 text-sm hover:bg-blue-500"
          >
            {showNoteForm ? 'Close note form' : 'New note'}
          </button>
          <button
            type="button"
            onClick={toggleFileForm}
            className="rounded bg-blue-600 px-3 py-1 text-sm hover:bg-blue-500"
          >
            {showFileForm ? 'Close file form' : 'Upload file'}
          </button>
        </div>

        {showNoteForm && (
          <form
            onSubmit={handleNoteSubmit}
            className="mb-4 space-y-3 rounded border border-gray-700 bg-gray-900 p-4"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-gray-400">
                  Title
                </label>
                <input
                  className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none"
                  value={noteForm.title}
                  onChange={(event) =>
                    setNoteForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Credential dump summary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-gray-400">
                  Ticket / Case ID
                </label>
                <input
                  className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none"
                  value={noteForm.ticket}
                  onChange={(event) =>
                    setNoteForm((prev) => ({ ...prev, ticket: event.target.value }))
                  }
                  placeholder="IR-2025-041"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-gray-400">
                Tags
              </label>
              <TagInput
                selectedTags={noteForm.tags}
                onChange={(next) => setNoteForm((prev) => ({ ...prev, tags: next }))}
                suggestions={tagSuggestions}
                placeholder="Add tags"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-gray-400">
                Markdown Note
              </label>
              <textarea
                className="h-32 w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none"
                value={noteForm.content}
                onChange={(event) =>
                  setNoteForm((prev) => ({ ...prev, content: event.target.value }))
                }
                placeholder="## Findings\nCaptured password hashes from target host."
              />
              <p className="mt-1 text-xs text-gray-400">Supports Markdown with live preview.</p>
            </div>
            {notePreview && (
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">Preview</p>
                <div
                  className="max-h-48 overflow-auto rounded border border-gray-700 bg-gray-800 p-3 text-sm leading-relaxed text-gray-100"
                  dangerouslySetInnerHTML={{ __html: notePreview }}
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  resetNoteForm();
                  setShowNoteForm(false);
                }}
                className="rounded border border-gray-600 px-3 py-1 text-sm hover:border-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded bg-green-600 px-3 py-1 text-sm hover:bg-green-500"
              >
                Save note
              </button>
            </div>
          </form>
        )}

        {showFileForm && (
          <form
            onSubmit={handleFileSubmit}
            className="mb-4 space-y-3 rounded border border-gray-700 bg-gray-900 p-4"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-gray-400">
                  Ticket / Case ID
                </label>
                <input
                  className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none"
                  value={fileForm.ticket}
                  onChange={(event) =>
                    setFileForm((prev) => ({ ...prev, ticket: event.target.value }))
                  }
                  placeholder="IR-2025-041"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-gray-400">
                  Evidence File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="w-full text-sm text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-blue-600 file:px-3 file:py-1 file:text-white hover:file:bg-blue-500"
                  onChange={(event) =>
                    setFileForm((prev) => ({
                      ...prev,
                      file: event.target.files?.[0] || null,
                    }))
                  }
                />
                {fileForm.file && (
                  <p className="mt-1 text-xs text-gray-400">{fileForm.file.name}</p>
                )}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-gray-400">
                Tags
              </label>
              <TagInput
                selectedTags={fileForm.tags}
                onChange={(next) => setFileForm((prev) => ({ ...prev, tags: next }))}
                suggestions={tagSuggestions}
                placeholder="Add tags"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-gray-400">
                Markdown Note
              </label>
              <textarea
                className="h-28 w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none"
                value={fileForm.description}
                onChange={(event) =>
                  setFileForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Document what this artifact proves."
              />
              <p className="mt-1 text-xs text-gray-400">Optional rich-text description for the uploaded artifact.</p>
            </div>
            {fileDescriptionPreview && (
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">Preview</p>
                <div
                  className="max-h-48 overflow-auto rounded border border-gray-700 bg-gray-800 p-3 text-sm leading-relaxed text-gray-100"
                  dangerouslySetInnerHTML={{ __html: fileDescriptionPreview }}
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  resetFileForm();
                  setShowFileForm(false);
                }}
                className="rounded border border-gray-600 px-3 py-1 text-sm hover:border-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded bg-green-600 px-3 py-1 text-sm hover:bg-green-500"
                disabled={!fileForm.file}
              >
                Save evidence
              </button>
            </div>
          </form>
        )}

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-gray-400">
              Filter by tag
            </label>
            <select
              className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none"
              value={filters.tag}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, tag: event.target.value }))
              }
            >
              <option value="">All tags</option>
              {availableFilterTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-gray-400">
              Filter by ticket
            </label>
            <input
              className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none"
              value={filters.ticket}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, ticket: event.target.value }))
              }
              placeholder="Search case ID"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-gray-400">
              Time window
            </label>
            <select
              className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none"
              value={filters.time}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, time: event.target.value }))
              }
            >
              <option value="all">Any time</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
        </div>

        <ul className="flex-1 space-y-3 overflow-auto">
          {filteredItems.length === 0 && (
            <li className="rounded border border-dashed border-gray-700 p-6 text-center text-sm text-gray-400">
              No evidence items match the current filters.
            </li>
          )}
          {filteredItems.map((item) => (
            <li key={item.id} className="rounded border border-gray-700 bg-gray-800 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="text-base font-semibold">
                    {item.type === 'note' ? item.title : item.name}
                  </h4>
                  {item.ticket && (
                    <p className="text-xs text-gray-400">Ticket: {item.ticket}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {formatTimestamp(item.createdAt)}
                </span>
              </div>
              {item.type === 'file' ? (
                <div className="mt-2 text-sm">
                  <a
                    href={item.fileUrl}
                    download={item.name}
                    className="text-blue-400 underline"
                  >
                    Download evidence
                  </a>
                  {item.noteHtml && (
                    <div
                      className="mt-2 space-y-2 text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: item.noteHtml }}
                    />
                  )}
                </div>
              ) : (
                <div
                  className="mt-2 space-y-2 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: item.noteHtml }}
                />
              )}
              {(item.tags || []).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {(item.tags || []).map((tag) => (
                    <span
                      key={tag}
                      className="rounded border border-blue-500/40 bg-blue-500/10 px-2 py-1"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default EvidenceVaultApp;
