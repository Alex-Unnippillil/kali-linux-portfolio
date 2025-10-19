import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { VirtuosoGrid } from 'react-virtuoso';
import projectsData from '../../data/projects.json';

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
  projects?: Project[];
}

const PROJECT_VIRTUALIZATION_THRESHOLD = 12;
const PROJECT_CARD_WRAPPER =
  'mb-4 break-inside-avoid rounded shadow overflow-hidden bg-gray-800';
const PROJECT_VIRTUALIZED_HEIGHT_CLASS = 'mt-4 h-[70vh] max-h-[720px]';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const STORAGE_KEY = 'project-gallery-filters';
const STORAGE_FILE = 'project-gallery-filters.json';

const ProjectGallery: React.FC<Props> = ({ openApp, projects: projectsProp }) => {
  const projects: Project[] = (projectsProp ?? (projectsData as Project[])) as Project[];
  const [search, setSearch] = useState('');
  const [stack, setStack] = useState('');
  const [year, setYear] = useState('');
  const [type, setType] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [ariaMessage, setAriaMessage] = useState('');
  const [selected, setSelected] = useState<Project[]>([]);
  const statusId = 'project-gallery-status';

  const projectGridComponents = useMemo(() => {
    const List = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
      ({ style, className = '', ...props }, ref) => (
        <div
          {...props}
          ref={ref}
          role="list"
          aria-label="Project results"
          aria-describedby={statusId}
          style={{ ...style, display: 'grid' }}
          className={`grid content-start gap-4 sm:grid-cols-2 md:grid-cols-3 ${className}`.trim()}
        />
      ),
    );
    List.displayName = 'ProjectGalleryGrid';

    const Item = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
      ({ style, className = '', ...props }, ref) => (
        <div
          {...props}
          ref={ref}
          role="listitem"
          style={style}
          className={`${PROJECT_CARD_WRAPPER} ${className}`.trim()}
        />
      ),
    );
    Item.displayName = 'ProjectGalleryGridItem';

    return { List, Item };
  }, [statusId]);

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

  const renderProjectCard = (project: Project) => (
    <div className="flex h-full flex-col">
      <div className="flex h-48 flex-col md:flex-row">
        <img
          src={project.thumbnail}
          alt={project.title}
          className="h-48 w-full object-cover md:w-1/2"
          loading="lazy"
        />
        <div className="h-48 w-full md:w-1/2">
          <Editor
            height="100%"
            theme="vs-dark"
            language={project.language}
            value={project.snippet}
            options={{ readOnly: true, minimap: { enabled: false } }}
          />
        </div>
      </div>
      <div className="space-y-2 p-4">
        <h3 className="text-lg font-semibold">{project.title}</h3>
        <p className="text-sm">{project.description}</p>
        <button
          onClick={() => toggleSelect(project)}
          aria-label={`Select ${project.title} for comparison`}
          className="rounded-full bg-gray-700 px-2 py-1 text-xs"
        >
          {selected.some((p) => p.id === project.id) ? 'Deselect' : 'Compare'}
        </button>
        <div className="flex flex-wrap gap-1">
          {project.stack.map((s) => (
            <button
              key={s}
              onClick={() => setStack(s)}
              className="rounded-full bg-gray-700 px-2 py-1 text-xs"
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
                  prev.includes(t) ? prev.filter((tag) => tag !== t) : [...prev, t],
                )
              }
              className="rounded-full bg-gray-700 px-2 py-1 text-xs"
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 pt-2 text-sm">
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
                onClick={() => openInFirefox(project.demo)}
                className="text-blue-400 hover:underline"
              >
                Open in Firefox
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const shouldVirtualize = filtered.length > PROJECT_VIRTUALIZATION_THRESHOLD;

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
                <th scope="col">
                  <span className="sr-only">Attribute</span>
                </th>
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
        {shouldVirtualize ? (
          <div
            className={`${PROJECT_VIRTUALIZED_HEIGHT_CLASS} overflow-hidden`}
            data-testid="project-gallery-virtualized"
          >
            <VirtuosoGrid
              style={{ height: '100%' }}
              totalCount={filtered.length}
              overscan={200}
              data={filtered}
              components={projectGridComponents}
              itemContent={(_, project) => renderProjectCard(project)}
              useWindowScroll={false}
            />
          </div>
        ) : (
          <div
            role="list"
            aria-label="Project results"
            aria-describedby={statusId}
            className="mt-4 columns-1 gap-4 sm:columns-2 md:columns-3"
          >
            {filtered.map((project) => (
              <div key={project.id} role="listitem" className={PROJECT_CARD_WRAPPER}>
                {renderProjectCard(project)}
              </div>
            ))}
          </div>
        )}
        <div id={statusId} aria-live="polite" className="sr-only">
          {ariaMessage}
        </div>
    </div>
  );
};

export default ProjectGallery;
