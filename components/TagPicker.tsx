"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { TagRecord, TagInput } from '../utils/fileExplorerStorage';
import {
  listTags,
  createTag,
  updateTag,
  deleteTag,
  applyTagToPaths,
  removeTagFromPaths,
  getTagAssignmentsForPaths,
} from '../utils/fileExplorerStorage';

interface TagPickerProps {
  selectedPaths: string[];
  onTagsChange?: (tags: TagRecord[]) => void;
  onAssignmentsChange?: () => void;
  refreshKey?: number;
}

interface TagEditorState {
  id: string | null;
  label: string;
  color: string;
  description: string;
}

const DEFAULT_COLORS = [
  '#f87171',
  '#fbbf24',
  '#34d399',
  '#60a5fa',
  '#a78bfa',
  '#f472b6',
  '#facc15',
  '#4ade80',
];

const ensureColor = (color?: string) => color && /^#([0-9a-f]{3}){1,2}$/i.test(color) ? color : '#60a5fa';

function useAssignments(selectedPaths: string[], refreshSignal: number) {
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let cancelled = false;
    if (!selectedPaths.length) {
      setAssignments({});
      return;
    }
    (async () => {
      const data = await getTagAssignmentsForPaths(selectedPaths);
      if (!cancelled) setAssignments(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPaths, refreshSignal]);

  return assignments;
}

const TagPicker: React.FC<TagPickerProps> = ({
  selectedPaths,
  onTagsChange,
  onAssignmentsChange,
  refreshKey = 0,
}) => {
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<TagEditorState | null>(null);
  const [assignmentRefresh, setAssignmentRefresh] = useState(0);

  const assignments = useAssignments(selectedPaths, assignmentRefresh);

  const loadTags = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listTags();
      setTags(data);
      setError(null);
      onTagsChange?.(data);
    } catch (err) {
      console.error('Failed to load tags', err);
      setError('Unable to load tags');
    } finally {
      setLoading(false);
    }
  }, [onTagsChange]);

  useEffect(() => {
    loadTags();
  }, [loadTags, refreshKey]);

  useEffect(() => {
    setAssignmentRefresh((value) => value + 1);
  }, [refreshKey]);

  const resetEditor = () => setEditor(null);

  const openEditor = (tag?: TagRecord) => {
    if (tag) {
      setEditor({
        id: tag.id,
        label: tag.label,
        color: ensureColor(tag.color),
        description: tag.description || '',
      });
    } else {
      setEditor({
        id: null,
        label: '',
        color: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
        description: '',
      });
    }
  };

  const appliedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const path of selectedPaths) {
      const ids = assignments[path] || [];
      for (const id of ids) {
        counts.set(id, (counts.get(id) || 0) + 1);
      }
    }
    return counts;
  }, [assignments, selectedPaths]);

  const toggleTag = async (tagId: string, shouldApply: boolean) => {
    if (!selectedPaths.length) return;
    const uniquePaths = Array.from(new Set(selectedPaths));
    try {
      if (shouldApply) {
        await applyTagToPaths(tagId, uniquePaths);
      } else {
        await removeTagFromPaths(tagId, uniquePaths);
      }
    } catch (err) {
      console.error('Failed to update tag assignments', err);
    } finally {
      setAssignmentRefresh((value) => value + 1);
      onAssignmentsChange?.();
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor) return;
    const input: TagInput = {
      label: editor.label,
      color: ensureColor(editor.color),
      description: editor.description,
    };
    try {
      if (editor.id) {
        await updateTag(editor.id, input);
      } else {
        await createTag(input);
      }
      resetEditor();
      await loadTags();
    } catch (err) {
      console.error('Failed to save tag', err);
      setError('Unable to save tag');
    } finally {
      setAssignmentRefresh((value) => value + 1);
      onAssignmentsChange?.();
    }
  };

  const handleDelete = async (tagId: string) => {
    try {
      await deleteTag(tagId);
      resetEditor();
      await loadTags();
    } catch (err) {
      console.error('Failed to delete tag', err);
      setError('Unable to delete tag');
    } finally {
      setAssignmentRefresh((value) => value + 1);
      onAssignmentsChange?.();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Tags</h3>
        <button
          type="button"
          className="px-2 py-1 text-xs bg-black bg-opacity-30 rounded"
          onClick={() => openEditor()}
        >
          New Tag
        </button>
      </div>
      {error && <div className="text-xs text-red-300" role="status">{error}</div>}
      {loading && <div className="text-xs text-gray-300">Loading tags...</div>}
      {!loading && tags.length === 0 && (
        <div className="text-xs text-gray-300">No tags yet. Create one to get started.</div>
      )}
      {tags.length > 0 && (
        <ul className="space-y-1">
          {tags.map((tag) => {
            const applied = appliedCounts.get(tag.id) || 0;
            const isChecked = applied > 0 && applied === selectedPaths.length && selectedPaths.length > 0;
            const isIndeterminate = applied > 0 && applied < selectedPaths.length;
            return (
              <li key={tag.id} className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 flex-1 text-xs">
                  <input
                    type="checkbox"
                    disabled={!selectedPaths.length}
                    checked={isChecked}
                    ref={(element) => {
                      if (element) element.indeterminate = isIndeterminate;
                    }}
                    onChange={(event) => toggleTag(tag.id, event.target.checked || isIndeterminate)}
                  />
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block w-3 h-3 rounded"
                      style={{ backgroundColor: ensureColor(tag.color) }}
                    />
                    <span className="font-medium text-white">{tag.label}</span>
                  </span>
                </label>
                <button
                  type="button"
                  className="text-xs underline"
                  onClick={() => openEditor(tag)}
                >
                  Edit
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {selectedPaths.length === 0 && (
        <div className="text-xs text-gray-300">Select files to assign tags.</div>
      )}
      {editor && (
        <form onSubmit={handleSubmit} className="p-2 border border-gray-600 rounded space-y-2 bg-black bg-opacity-20">
          <div className="text-xs font-semibold">
            {editor.id ? 'Edit Tag' : 'Create Tag'}
          </div>
          <label className="flex flex-col text-xs gap-1">
            <span>Label</span>
            <input
              className="px-1 py-1 text-black text-sm"
              value={editor.label}
              onChange={(event) => setEditor((current) =>
                current ? { ...current, label: event.target.value } : current,
              )}
              placeholder="Tag label"
            />
          </label>
          <label className="flex items-center gap-2 text-xs">
            <span>Color</span>
            <input
              type="color"
              value={ensureColor(editor.color)}
              onChange={(event) =>
                setEditor((current) =>
                  current ? { ...current, color: ensureColor(event.target.value) } : current,
                )
              }
            />
          </label>
          <label className="flex flex-col text-xs gap-1">
            <span>Description</span>
            <textarea
              className="px-1 py-1 text-black text-sm"
              value={editor.description}
              onChange={(event) =>
                setEditor((current) =>
                  current ? { ...current, description: event.target.value } : current,
                )
              }
              placeholder="Optional description"
              rows={3}
            />
          </label>
          <div className="flex items-center gap-2 text-xs">
            <button type="submit" className="px-2 py-1 bg-ub-orange text-black rounded">
              {editor.id ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              className="px-2 py-1 bg-black bg-opacity-30 rounded"
              onClick={resetEditor}
            >
              Cancel
            </button>
            {editor.id && (
              <button
                type="button"
                className="px-2 py-1 bg-red-500 text-black rounded"
                onClick={() => handleDelete(editor.id!)}
              >
                Delete
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

export default TagPicker;

