import React, { useMemo, useState } from 'react';
import type { ProfileMetadata } from '../../../modules/filesystem/metadata';
import type { SavedSearchWithResults } from '../../../utils/files/savedSearches';

interface SidebarProps {
  metadata: ProfileMetadata | null;
  selectedPath?: string | null;
  selectedName?: string | null;
  onAddTag?: (tag: string) => Promise<void> | void;
  onRemoveTag?: (tag: string) => Promise<void> | void;
  activeTags: string[];
  onToggleFilterTag: (tag: string) => void;
  onClearFilters: () => void;
  savedSearches: SavedSearchWithResults[];
  onSelectSavedSearch: (search: SavedSearchWithResults) => void;
  onDeleteSavedSearch: (id: string) => void;
  onCreateSavedSearch: (payload: { name: string; tags: string[] }) => void;
  activeSavedSearchId: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({
  metadata,
  selectedPath,
  selectedName,
  onAddTag,
  onRemoveTag,
  activeTags,
  onToggleFilterTag,
  onClearFilters,
  savedSearches,
  onSelectSavedSearch,
  onDeleteSavedSearch,
  onCreateSavedSearch,
  activeSavedSearchId,
}) => {
  const [newTag, setNewTag] = useState('');
  const [tagQuery, setTagQuery] = useState('');

  const currentTags = useMemo(() => {
    if (!metadata || !selectedPath) return [];
    return metadata.files[selectedPath]?.tags || [];
  }, [metadata, selectedPath]);

  const tagEntries = useMemo(() => {
    if (!metadata) return [];
    const query = tagQuery.trim().toLowerCase();
    return Object.entries(metadata.tagIndex)
      .map(([tag, paths]) => ({ tag, count: paths.length }))
      .filter((entry) => (!query ? true : entry.tag.includes(query)))
      .sort((a, b) => a.tag.localeCompare(b.tag));
  }, [metadata, tagQuery]);

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddTag) return;
    const tag = newTag.trim();
    if (!tag) return;
    await onAddTag(tag);
    setNewTag('');
  };

  const handleRemoveTag = async (tag: string) => {
    if (!onRemoveTag) return;
    await onRemoveTag(tag);
  };

  const handleCreateSmartFolder = () => {
    if (!activeTags.length) return;
    const defaultName = `${activeTags.join(', ')} smart folder`;
    const name =
      typeof window !== 'undefined'
        ? window.prompt('Name your smart folder', defaultName)
        : defaultName;
    if (!name) return;
    onCreateSavedSearch({ name, tags: activeTags });
  };

  return (
    <aside className="w-64 bg-ub-warm-grey bg-opacity-30 border-r border-black border-opacity-20 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-black border-opacity-20">
        <h2 className="text-sm font-semibold text-white mb-2">Current File</h2>
        {selectedPath ? (
          <div>
            <div className="text-xs text-ubt-blue truncate" title={selectedPath}>
              {selectedName || selectedPath}
            </div>
            <form onSubmit={handleAddTag} className="mt-2 flex items-center space-x-2">
              <input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag"
                className="flex-1 px-2 py-1 rounded bg-ub-cool-grey text-white text-xs focus:outline-none focus:ring"
              />
              <button
                type="submit"
                className="px-2 py-1 bg-ubt-blue text-white rounded text-xs hover:bg-ubt-blue/80"
              >
                Add
              </button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              {currentTags.length === 0 && (
                <span className="text-xs text-white/60">No tags assigned</span>
              )}
              {currentTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="px-2 py-0.5 bg-black bg-opacity-40 rounded text-xs text-white hover:bg-opacity-60"
                >
                  {tag}
                  <span className="ml-1 text-white/70">×</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-white/60">Select a file to manage tags.</p>
        )}
      </div>

      <div className="p-3 border-b border-black border-opacity-20">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-white">Tags</h3>
          {activeTags.length > 0 && (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-xs text-ubt-blue hover:underline"
            >
              Clear
            </button>
          )}
        </div>
        <input
          value={tagQuery}
          onChange={(e) => setTagQuery(e.target.value)}
          placeholder="Filter tags"
          className="w-full px-2 py-1 rounded bg-ub-cool-grey text-white text-xs focus:outline-none focus:ring"
        />
        <div className="mt-3 space-y-1 max-h-48 overflow-auto pr-1">
          {tagEntries.length === 0 && (
            <p className="text-xs text-white/60">No tags yet.</p>
          )}
          {tagEntries.map(({ tag, count }) => {
            const active = activeTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onToggleFilterTag(tag)}
                className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs transition-colors ${
                  active
                    ? 'bg-ubt-blue text-white'
                    : 'bg-black bg-opacity-30 text-white hover:bg-opacity-50'
                }`}
              >
                <span className="truncate" title={tag}>
                  {tag}
                </span>
                <span className="ml-2 text-white/70">{count}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={handleCreateSmartFolder}
          disabled={activeTags.length === 0}
          className={`mt-3 w-full px-2 py-1 rounded text-xs font-semibold transition-colors ${
            activeTags.length === 0
              ? 'bg-black bg-opacity-20 text-white/40 cursor-not-allowed'
              : 'bg-ubt-blue text-white hover:bg-ubt-blue/80'
          }`}
        >
          Save current filter
        </button>
      </div>

      <div className="p-3 flex-1 overflow-auto">
        <h3 className="text-sm font-semibold text-white mb-2">Smart Folders</h3>
        {savedSearches.length === 0 ? (
          <p className="text-xs text-white/60">Create smart folders from your tag filters.</p>
        ) : (
          <ul className="space-y-1">
            {savedSearches.map((search) => {
              const active = search.id === activeSavedSearchId;
              return (
                <li
                  key={search.id}
                  className={`group flex items-center justify-between px-2 py-1 rounded text-xs ${
                    active
                      ? 'bg-ubt-blue text-white'
                      : 'bg-black bg-opacity-20 text-white hover:bg-opacity-40'
                  }`}
                >
                  <button
                    type="button"
                    className="flex-1 text-left"
                    onClick={() => onSelectSavedSearch(search)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate" title={search.name}>
                        {search.name}
                      </span>
                      <span className="ml-2 text-white/70">{search.results.length}</span>
                    </div>
                    {search.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-white/70">
                        {search.tags.map((tag) => (
                          <span key={tag} className="px-1 py-0.5 bg-black/30 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteSavedSearch(search.id)}
                    className="ml-2 px-1 py-0.5 text-white/70 hover:text-white"
                    aria-label={`Delete smart folder ${search.name}`}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;

