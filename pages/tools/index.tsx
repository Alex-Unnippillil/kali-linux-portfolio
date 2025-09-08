import { useMemo, useState } from 'react';
import Link from 'next/link';
import Fuse from 'fuse.js';
import toolsData from '../../data/tools.json';
import FilterChips from '@/components/tools/FilterChips';

interface Tool {
  id: string;
  name: string;
  summary: string;
  category: string;
  platforms: string[];
  tags: string[];
}

export default function ToolsExplorer() {
  const tools = toolsData as Tool[];
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [platformFilter, setPlatformFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);

  const fuse = useMemo(() => new Fuse(tools, { keys: ['name', 'summary', 'tags'], threshold: 0.3 }), [tools]);

  const allCategories = useMemo(
    () => Array.from(new Set(tools.map((t) => t.category))).sort(),
    [tools],
  );
  const allPlatforms = useMemo(
    () => Array.from(new Set(tools.flatMap((t) => t.platforms))).sort(),
    [tools],
  );
  const allTags = useMemo(
    () => Array.from(new Set(tools.flatMap((t) => t.tags))).sort(),
    [tools],
  );

  const toggle = (list: string[], setter: (v: string[]) => void, value: string) => {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const searched = useMemo(() => {
    if (!query) return tools;
    return fuse.search(query).map((r) => r.item);
  }, [query, tools, fuse]);

  const filtered = searched.filter((tool) => {
    if (categoryFilter.length && !categoryFilter.includes(tool.category)) return false;
    if (platformFilter.length && !platformFilter.some((p) => tool.platforms.includes(p))) return false;
    if (tagFilter.length && !tagFilter.every((t) => tool.tags.includes(t))) return false;
    return true;
  });

  return (
    <div className="p-4 space-y-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search tools"
        className="w-full rounded border p-2"
      />
      <FilterChips
        categories={allCategories}
        platforms={allPlatforms}
        tags={allTags}
        selectedCategories={categoryFilter}
        selectedPlatforms={platformFilter}
        selectedTags={tagFilter}
        onToggleCategory={(c) => toggle(categoryFilter, setCategoryFilter, c)}
        onTogglePlatform={(p) => toggle(platformFilter, setPlatformFilter, p)}
        onToggleTag={(t) => toggle(tagFilter, setTagFilter, t)}
      />
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {filtered.map((tool) => (
          <li key={tool.id} className="border rounded p-4">
            <Link href={`/tools/${tool.id}`}>{tool.name}</Link>
            <p className="mt-2 text-sm">{tool.summary}</p>
          </li>
        ))}
        {filtered.length === 0 && <li>No tools found.</li>}
      </ul>
    </div>
  );
}

