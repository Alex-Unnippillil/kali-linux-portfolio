import React, { useMemo, useRef, useState } from 'react';
import toolsData from '../../data/tools.json';

interface Tool {
  id: number;
  name: string;
  description: string;
  tags: string[];
}

const ToolGrid: React.FC = () => {
  const tools = toolsData as Tool[];
  const allTags = useMemo(
    () => Array.from(new Set(tools.flatMap((t) => t.tags))).sort(),
    [tools]
  );
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const tagRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const toggleTag = (tag: string) =>
    setActiveTags((t) =>
      t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]
    );

  const onKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number
  ) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      tagRefs.current[(idx + 1) % allTags.length]?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      tagRefs.current[(idx - 1 + allTags.length) % allTags.length]?.focus();
    }
  };

  const filtered = useMemo(
    () =>
      tools.filter(
        (t) =>
          activeTags.length === 0 ||
          activeTags.every((tag) => t.tags.includes(tag))
      ),
    [activeTags, tools]
  );

  return (
    <section>
      <div
        className="flex flex-wrap gap-2 mb-4"
        role="toolbar"
        aria-label="Filter tools by tag"
      >
        {allTags.map((tag, i) => (
          <button
            key={tag}
            ref={(el) => (tagRefs.current[i] = el)}
            onClick={() => toggleTag(tag)}
            onKeyDown={(e) => onKeyDown(e, i)}
            aria-pressed={activeTags.includes(tag)}
            className={`px-3 py-1 rounded-full border text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              activeTags.includes(tag)
                ? 'bg-blue-600 border-blue-600'
                : 'bg-gray-800 border-gray-700'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {filtered.map((tool) => (
          <div
            key={tool.id}
            className="border border-gray-700 rounded p-4 bg-gray-900"
          >
            <h2 className="font-semibold mb-1">{tool.name}</h2>
            <p className="text-sm mb-2">{tool.description}</p>
            <div className="flex flex-wrap gap-1">
              {tool.tags.map((t) => (
                <span
                  key={t}
                  className="text-xs px-2 py-1 bg-gray-800 rounded"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ToolGrid;
