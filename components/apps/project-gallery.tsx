import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  filterProjects,
  getProjectOptions,
  projectCatalog,
  Project,
} from '../../apps/project-gallery/lib/projects';

interface Props {
  openApp?: (id: string) => void;
}

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const STORAGE_KEY = 'project-gallery-filters';
const STORAGE_FILE = 'project-gallery-filters.json';

const ProjectGallery: React.FC<Props> = ({ openApp }) => {
  const projects = projectCatalog;
  const [search, setSearch] = useState('');
  const [stack, setStack] = useState('');
  const [year, setYear] = useState('');
  const [type, setType] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [ariaMessage, setAriaMessage] = useState('');
  const [selected, setSelected] = useState<Project[]>([]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { stacks, years, types, tags: allTags } = useMemo(
    () => getProjectOptions(projects),
    [projects]
  );

  const filtered = useMemo(
    () =>
      filterProjects(projects, {
        stack,
        year,
        type,
        tags,
        search,
      }),
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

  const openInFirefox = (url: string) => {
    try {
      sessionStorage.setItem('firefox:start-url', url);
    } catch {
      /* ignore */
    }
    openApp && openApp('firefox');
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
                <th scope="col">Attribute</th>
                {selected.map((p) => (
                  <th key={p.id} scope="col">
                    {p.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Stack</th>
                {selected.map((p) => (
                  <td key={`${p.id}-stack`}>{p.stack.join(', ')}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">Highlights</th>
                {selected.map((p) => (
                  <td key={`${p.id}-tags`}>{p.tags.join(', ')}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <div className="columns-1 sm:columns-2 md:columns-3 gap-4">
        {filtered.map((project) => {
          const demoUrl = project.demo;
          const repoUrl = project.repo;

          return (
            <div
              key={project.id}
              className="mb-4 break-inside-avoid bg-gray-800 rounded shadow overflow-hidden"
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
                    language={project.language ?? 'plaintext'}
                    value={project.snippet ?? '// Snippet unavailable'}
                    options={{ readOnly: true, minimap: { enabled: false } }}
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
                  {selected.some((p) => p.id === project.id) ? 'Deselect' : 'Compare'}
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
                  {repoUrl && (
                    <a
                      href={repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                      aria-label={`View the ${project.title} repository`}
                    >
                      Repository
                    </a>
                  )}
                  {demoUrl && (
                    <>
                      <a
                        href={demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                        aria-label={`Launch the ${project.title} live demo`}
                      >
                        Live Demo
                      </a>
                      <button
                        onClick={() => openInFirefox(demoUrl)}
                        className="text-blue-400 hover:underline"
                        aria-label={`Open ${project.title} live demo in the Firefox app`}
                      >
                        Open in Firefox
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div aria-live="polite" className="sr-only">
        {ariaMessage}
      </div>
    </div>
  );
};

export default ProjectGallery;
