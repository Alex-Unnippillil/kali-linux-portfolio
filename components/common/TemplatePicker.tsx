import React, { useEffect, useMemo, useState } from 'react';

export interface ToolTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  metadata?: Record<string, string>;
  fields: Record<string, unknown>;
}

interface TemplatePickerProps {
  tool: string;
  templates: ToolTemplate[];
  onSelect: (template: ToolTemplate) => void;
  recentLimit?: number;
}

const storageKey = (tool: string) => `template-recent-${tool}`;

const TemplatePicker: React.FC<TemplatePickerProps> = ({
  tool,
  templates,
  onSelect,
  recentLimit = 3,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey(tool));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setRecent(parsed.filter((id) => templates.some((t) => t.id === id)));
      }
    } catch {
      // ignore storage errors
    }
  }, [tool, templates]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    templates.forEach((template) => {
      template.tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return templates.filter((template) => {
      const matchesSearch = term
        ? [
            template.name,
            template.description,
            ...(template.tags || []),
            ...Object.values(template.metadata || {}),
          ]
            .join(' ')
            .toLowerCase()
            .includes(term)
        : true;

      const matchesTags = activeTags.length
        ? activeTags.every((tag) => template.tags.includes(tag))
        : true;

      return matchesSearch && matchesTags;
    });
  }, [templates, searchTerm, activeTags]);

  const updateRecent = (templateId: string) => {
    if (typeof window === 'undefined') return;
    setRecent((prev) => {
      const next = [templateId, ...prev.filter((id) => id !== templateId)].slice(
        0,
        recentLimit
      );
      try {
        window.localStorage.setItem(storageKey(tool), JSON.stringify(next));
      } catch {
        // ignore storage write errors
      }
      return next;
    });
  };

  const handleSelect = (template: ToolTemplate) => {
    updateRecent(template.id);
    onSelect(template);
  };

  const toggleTag = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <section className="mb-4" aria-label={`${tool} template picker`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
        <input
          type="search"
          placeholder="Search templates"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="w-full md:w-64 px-2 py-1 rounded text-black"
          aria-label="Search templates"
        />
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => {
              const isActive = activeTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-2 py-1 rounded text-xs uppercase tracking-wide transition-colors ${
                    isActive
                      ? 'bg-ub-yellow text-black'
                      : 'bg-ub-grey text-black hover:bg-ub-mid'
                  }`}
                  aria-pressed={isActive}
                >
                  {tag}
                </button>
              );
            })}
            {activeTags.length > 0 && (
              <button
                type="button"
                className="px-2 py-1 rounded text-xs bg-gray-700 text-white"
                onClick={() => setActiveTags([])}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {recent.length > 0 && (
        <div className="mb-3" aria-label="Recent templates">
          <p className="text-xs uppercase text-gray-300 mb-1">Recent</p>
          <div className="flex flex-wrap gap-2">
            {recent
              .map((id) => templates.find((template) => template.id === id))
              .filter(Boolean)
              .map((template) => (
                <button
                  key={template!.id}
                  type="button"
                  className="px-3 py-1 rounded bg-gray-700 text-sm hover:bg-gray-600 transition"
                  onClick={() => handleSelect(template!)}
                >
                  {template!.name}
                </button>
              ))}
          </div>
        </div>
      )}

      <div className="grid gap-3" role="list">
        {filteredTemplates.map((template) => (
          <article
            key={template.id}
            className="border border-gray-700 rounded p-3 bg-black/40"
            role="listitem"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-white">{template.name}</h3>
                <p className="text-sm text-gray-300 mb-2">{template.description}</p>
              </div>
              <button
                type="button"
                className="px-3 py-1 bg-ub-yellow text-black rounded font-semibold"
                onClick={() => handleSelect(template)}
                aria-label={`Load template ${template.name}`}
              >
                Load template
              </button>
            </div>
            {template.metadata && (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-400 mb-2">
                {Object.entries(template.metadata).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <dt className="uppercase tracking-wide text-gray-500">
                      {key}
                    </dt>
                    <dd className="text-gray-300">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="flex flex-wrap gap-2">
              {template.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full bg-gray-800 text-xs text-gray-200"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <p className="text-sm text-gray-400 mt-4">No templates match your search.</p>
      )}
    </section>
  );
};

export default TemplatePicker;
