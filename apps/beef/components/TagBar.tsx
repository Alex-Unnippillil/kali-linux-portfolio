'use client';

import React, { useMemo, useState } from 'react';

interface TagBarProps {
  tags: string[];
  onAddTag?: (tag: string) => void;
  onRemoveTag?: (tag: string) => void;
  onToggleTag?: (tag: string) => void;
  selectedTags?: string[];
  label?: string;
  placeholder?: string;
  className?: string;
}

const toKey = (value: string) => value.toLowerCase();

const TagBar: React.FC<TagBarProps> = ({
  tags,
  onAddTag,
  onRemoveTag,
  onToggleTag,
  selectedTags = [],
  label,
  placeholder = 'Add tag',
  className = '',
}) => {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const normalizedTags = useMemo(() => new Set(tags.map(toKey)), [tags]);
  const selected = useMemo(() => new Set(selectedTags.map(toKey)), [selectedTags]);
  const canAddTag = typeof onAddTag === 'function';

  const resetDraft = () => {
    setDraft('');
    setError(null);
  };

  const handleAdd = () => {
    if (!canAddTag) {
      return;
    }
    const normalized = draft.trim().toLowerCase();
    if (!normalized) {
      setError('Enter a tag before adding.');
      return;
    }
    if (normalizedTags.has(normalized)) {
      setError('Tag already exists.');
      return;
    }
    onAddTag?.(normalized);
    resetDraft();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (event: React.MouseEvent<HTMLButtonElement>, tag: string) => {
    event.stopPropagation();
    onRemoveTag?.(tag);
  };

  const renderTag = (tag: string) => {
    const normalized = toKey(tag);
    const isSelected = selected.has(normalized);
    const toggleable = typeof onToggleTag === 'function';

    return (
      <div
        key={tag}
        className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors ${
          isSelected ? 'border-ub-primary bg-ub-primary/60 text-white' : 'border-gray-600 bg-gray-800 text-gray-100'
        }`}
      >
        <button
          type="button"
          onClick={toggleable ? () => onToggleTag?.(tag) : undefined}
          disabled={!toggleable}
          className={`focus:outline-none ${toggleable ? 'hover:underline' : ''}`}
        >
          {tag}
        </button>
        {onRemoveTag && (
          <button
            type="button"
            aria-label={`Remove tag ${tag}`}
            onClick={(event) => handleRemove(event, tag)}
            className="focus:outline-none text-gray-300 hover:text-white"
          >
            ×
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <span className="text-[11px] uppercase tracking-wide text-gray-300">{label}</span>}
      <div className="flex flex-wrap items-center gap-2">
        {canAddTag && (
          <div className="flex items-center gap-1">
            <input
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="h-7 rounded bg-gray-900 px-2 text-xs text-gray-100 focus:outline-none focus:ring-2 focus:ring-ub-primary"
            />
            <button
              type="button"
              onClick={handleAdd}
              className="h-7 rounded bg-ub-primary px-2 text-xs font-semibold text-white"
            >
              Add
            </button>
          </div>
        )}
        {tags.length === 0 && <span className="text-xs italic text-gray-400">No tags yet.</span>}
        {tags.map((tag) => renderTag(tag))}
      </div>
      {error && <span className="text-[11px] text-red-300">{error}</span>}
    </div>
  );
};

export default TagBar;
