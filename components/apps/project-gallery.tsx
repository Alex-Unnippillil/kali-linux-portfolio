import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import List, { type ListRef } from 'rc-virtual-list';
import projectsData from '../../data/projects.json';
import { useVirtualGrid } from '../../hooks/useVirtualGrid';

interface Project {
  id: number;
  title: string;
  description: string;
  stack: string[];
  tags: string[];
  year: number;
  type: string;
  thumbnail: string;
  repo: string;
  demo: string;
  snippet: string;
  language: string;
}

interface Props {
  openApp?: (id: string) => void;
}

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const STORAGE_KEY = 'project-gallery-filters';
const STORAGE_FILE = 'project-gallery-filters.json';

const getStoredFilters = () => {
  if (typeof window === 'undefined') {
    return { search: '', stack: '', year: '', type: '', tags: [] as string[] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { search: '', stack: '', year: '', type: '', tags: [] };
    }
    const parsed = JSON.parse(raw);
    return {
      search: typeof parsed.search === 'string' ? parsed.search : '',
      stack: typeof parsed.stack === 'string' ? parsed.stack : '',
      year: typeof parsed.year === 'string' ? parsed.year : '',
      type: typeof parsed.type === 'string' ? parsed.type : '',
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter((tag: unknown): tag is string => typeof tag === 'string')
        : [],
    };
  } catch {
    return { search: '', stack: '', year: '', type: '', tags: [] };
  }
};

const ProjectGallery: React.FC<Props> = ({ openApp }) => {
  const projects: Project[] = projectsData as Project[];
  const storedFiltersRef = useRef(getStoredFilters());
  const [search, setSearch] = useState(storedFiltersRef.current.search);
  const [stack, setStack] = useState(storedFiltersRef.current.stack);
  const [year, setYear] = useState(storedFiltersRef.current.year);
  const [type, setType] = useState(storedFiltersRef.current.type);
  const [tags, setTags] = useState<string[]>(storedFiltersRef.current.tags);
  const [ariaMessage, setAriaMessage] = useState('');
  const [selected, setSelected] = useState<Project[]>([]);

  const {
    containerRef: projectsContainerRef,
    height: projectsHeight,
    columns: projectColumns,
    recalculate: recalcProjects,
  } = useVirtualGrid({ minHeight: 320, viewportOffset: 40 });
  const listRef = useRef<ListRef | null>(null);

  const readFilters = async () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      /* ignore */
    }
    try {
      // @ts-ignore - OPFS not yet in TypeScript libs
      const root = await navigator.storage?.getDirectory();
      const handle = await root?.getFileHandle(STORAGE_FILE);
      const file = await handle?.getFile();
      const text = await file?.text();
      return text ? JSON.parse(text) : {};
    } catch {
      /* ignore */
    }
    return {};
  };

  const writeFilters = async (data: {
    search: string;
    stack: string;
    year: string;
    type: string;
    tags: string[];
  }) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return;
    } catch {
      /* ignore */
    }
    try {
      // @ts-ignore - OPFS not yet in TypeScript libs
      const root = await navigator.storage?.getDirectory();
      const handle = await root?.getFileHandle(STORAGE_FILE, { create: true });
      const writable = await handle?.createWritable();
      await writable?.write(JSON.stringify(data));
      await writable?.close();
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    readFilters().then((data) => {
      setSearch(data.search || '');
      setStack(data.stack || '');
      setYear(data.year || '');
      setType(data.type || '');
      setTags(data.tags || []);
      setAriaMessage(`Showing ${projects.length} projects`);
    });
  }, [projects.length]);

  const stacks = useMemo(
    () => Array.from(new Set(projects.flatMap((p) => p.stack))),
    [projects]
  );
  const years = useMemo(
    () => Array.from(new Set(projects.map((p) => p.year))).sort((a, b) => b - a),
    [projects]
  );
  const types = useMemo(
    () => Array.from(new Set(projects.map((p) => p.type))),
    [projects]
  );
  const allTags = useMemo(
    () => Array.from(new Set(projects.flatMap((p) => p.tags))),
    [projects]
  );

  const filtered = useMemo(
    () =>
      projects.filter(
        (p) =>
          (!stack || p.stack.includes(stack)) &&
          (!year || String(p.year) === year) &&
          (!type || p.type === type) &&
          (tags.length === 0 || tags.every((t) => p.tags.includes(t))) &&
          (search === '' ||
            p.title.toLowerCase().includes(search.toLowerCase()) ||
            p.description.toLowerCase().includes(search.toLowerCase()))
      ),
    [projects, stack, year, type, tags, search]
  );

  useEffect(() => {
    writeFilters({ search, stack, year, type, tags });
  }, [search, stack, year, type, tags]);

  useEffect(() => {
    setAriaMessage(
      `Showing ${filtered.length} project${filtered.length === 1 ? '' : 's'}${stack ? ` filtered by ${stack}` : ''}${tags.length ? ` with tags ${tags.join(', ')}` : ''}${year ? ` in ${year}` : ''}${type ? ` of type ${type}` : ''}${search ? ` matching "${search}"` : ''}`
    );
  }, [filtered.length, stack, year, type, tags, search]);

  const projectRows = useMemo(() => {
    if (!filtered.length) return [] as Project[][];
    const size = Math.max(projectColumns, 1);
    const rows: Project[][] = [];
    for (let i = 0; i < filtered.length; i += size) {
      rows.push(filtered.slice(i, i + size));
    }
    return rows;
  }, [filtered, projectColumns]);

  const estimatedProjectRowHeight = useMemo(() => {
    if (projectColumns >= 3) return 420;
    if (projectColumns === 2) return 460;
    return 520;
  }, [projectColumns]);

  useEffect(() => {
    listRef.current?.scrollTo(0);
  }, [projectRows]);

  useEffect(() => {
    recalcProjects();
  }, [stack, year, type, tags, search, selected.length, filtered.length, recalcProjects]);

  const openInChrome = (url: string) => {
    try {
      const id = Date.now();
      const tab = { id, url, history: [url], historyIndex: 0, scroll: 0 };
      localStorage.setItem('chrome-tabs', JSON.stringify({ tabs: [tab], active: id }));
    } catch {
      /* ignore */
    }
    openApp && openApp('chrome');
  };

  const toggleSelect = (project: Project) => {
    setSelected((prev) => {
      const exists = prev.find((p) => p.id === project.id);
      if (exists) return prev.filter((p) => p.id !== project.id);
      if (prev.length === 2) return [prev[1], project];
      return [...prev, project];
    });
  };

  return (
    <div className="p-4 h-full overflow-auto bg-ub-cool-grey text-white">
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          aria-label="Search"
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-2 py-1 text-black"
        />
        <select
          aria-label="Stack"
          value={stack}
          onChange={(e) => setStack(e.target.value)}
          className="px-2 py-1 text-black"
        >
          <option value="">All Stacks</option>
          {stacks.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          aria-label="Year"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="px-2 py-1 text-black"
        >
          <option value="">All Years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          aria-label="Type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-2 py-1 text-black"
        >
          <option value="">All Types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {allTags.map((t) => (
          <label key={t} className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              aria-label={t}
              checked={tags.includes(t)}
              onChange={(e) =>
                setTags((prev) =>
                  e.target.checked
                    ? [...prev, t]
                    : prev.filter((tag) => tag !== t)
                )
              }
              className="text-black"
            />
            {t}
          </label>
        ))}
      </div>
      {selected.length === 2 && (
        <div className="mb-4 overflow-auto">
          <table className="w-full text-sm text-left" role="table">
            <thead>
              <tr>
                <th />
                {selected.map((p) => (
                  <th key={p.id}>{p.title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Stack</th>
                {selected.map((p) => (
                  <td key={`${p.id}-stack`}>{p.stack.join(', ')}</td>
                ))}
              </tr>
              <tr>
                <th>Highlights</th>
                {selected.map((p) => (
                  <td key={`${p.id}-tags`}>{p.tags.join(', ')}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {projectRows.length === 0 ? (
        <p className="text-sm text-gray-300">
          No projects match your filters.
        </p>
      ) : (
        <div ref={projectsContainerRef} className="mt-4">
          <List
            ref={listRef}
            data={projectRows}
            height={projectsHeight}
            itemHeight={estimatedProjectRowHeight}
            itemKey={(row, rowIndex) =>
              row.map((item) => item.id).join('|') || `row-${rowIndex}`
            }
            fullHeight={false}
            style={{ width: '100%' }}
          >
            {(row, rowIndex, { style }) => (
              <div
                style={{
                  ...style,
                  width: '100%',
                  paddingBottom:
                    rowIndex === projectRows.length - 1 ? 0 : 16,
                }}
                className="box-border"
              >
                <div
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(
                      projectColumns,
                      row.length
                    )}, minmax(0, 1fr))`,
                  }}
                >
                  {row.map((project) => (
                    <div
                      key={project.id}
                      className="break-inside-avoid bg-gray-800 rounded shadow overflow-hidden"
                    >
                      <div className="flex flex-col md:flex-row h-48">
                        <img
                          src={project.thumbnail}
                          alt={project.title}
                          className="w-full md:w-1/2 h-48 object-cover"
                          loading="lazy"
                        />
                        <div className="w-full md:w-1/2 h-48">
                          <Editor
                            height="100%"
                            theme="vs-dark"
                            language={project.language}
                            value={project.snippet}
                            options={{
                              readOnly: true,
                              minimap: { enabled: false },
                            }}
                          />
                        </div>
                      </div>
                      <div className="p-4 space-y-2">
                        <h3 className="text-lg font-semibold">{project.title}</h3>
                        <p className="text-sm">{project.description}</p>
                        <button
                          onClick={() => toggleSelect(project)}
                          aria-label={`Select ${project.title} for comparison`}
                          className="bg-gray-700 text-xs px-2 py-1 rounded-full"
                        >
                          {selected.some((p) => p.id === project.id)
                            ? 'Deselect'
                            : 'Compare'}
                        </button>
                        <div className="flex flex-wrap gap-1">
                          {project.stack.map((s) => (
                            <button
                              key={s}
                              onClick={() => setStack(s)}
                              className="bg-gray-700 text-xs px-2 py-1 rounded-full"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {project.tags.map((t) => (
                            <button
                              key={t}
                              onClick={() =>
                                setTags((prev) =>
                                  prev.includes(t)
                                    ? prev.filter((tag) => tag !== t)
                                    : [...prev, t]
                                )
                              }
                              className="bg-gray-700 text-xs px-2 py-1 rounded-full"
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm pt-2">
                          <a
                            href={project.repo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                          >
                            Repo
                          </a>
                          {project.demo && (
                            <>
                              <a
                                href={project.demo}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:underline"
                              >
                                Live Demo
                              </a>
                              <button
                                onClick={() => openInChrome(project.demo)}
                                className="text-blue-400 hover:underline"
                              >
                                Open in Chrome
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </List>
        </div>
      )}
      <div aria-live="polite" className="sr-only">
        {ariaMessage}
      </div>
    </div>
  );
};

export default ProjectGallery;
