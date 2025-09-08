import React from 'react';

interface FilterChipsProps {
  categories: string[];
  platforms: string[];
  tags: string[];
  selectedCategories: string[];
  selectedPlatforms: string[];
  selectedTags: string[];
  onToggleCategory: (category: string) => void;
  onTogglePlatform: (platform: string) => void;
  onToggleTag: (tag: string) => void;
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        selected ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
      }`}
    >
      {label}
    </button>
  );
}

export default function FilterChips({
  categories,
  platforms,
  tags,
  selectedCategories,
  selectedPlatforms,
  selectedTags,
  onToggleCategory,
  onTogglePlatform,
  onToggleTag,
}: FilterChipsProps) {
  return (
    <div className="space-y-4">
      {categories.length > 0 && (
        <div>
          <h3 className="mb-1 font-semibold">Categories</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Chip key={c} label={c} selected={selectedCategories.includes(c)} onClick={() => onToggleCategory(c)} />
            ))}
          </div>
        </div>
      )}
      {platforms.length > 0 && (
        <div>
          <h3 className="mb-1 font-semibold">Platforms</h3>
          <div className="flex flex-wrap gap-2">
            {platforms.map((p) => (
              <Chip key={p} label={p} selected={selectedPlatforms.includes(p)} onClick={() => onTogglePlatform(p)} />
            ))}
          </div>
        </div>
      )}
      {tags.length > 0 && (
        <div>
          <h3 className="mb-1 font-semibold">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <Chip key={t} label={t} selected={selectedTags.includes(t)} onClick={() => onToggleTag(t)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

