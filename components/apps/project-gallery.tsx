import React, { useEffect, useMemo, useState } from 'react';

interface Project {
  id: number;
  title: string;
  description: string;
  stack: string[];
  year: number;
  type: string;
  thumbnail: string;
  repo: string;
  demo: string;
}

interface Props {
  openApp?: (id: string) => void;
}

const ProjectGallery: React.FC<Props> = ({ openApp }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [stack, setStack] = useState('');
  const [year, setYear] = useState('');
  const [type, setType] = useState('');
  const [ariaMessage, setAriaMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/projects.json');
        const data = await res.json();
        setProjects(data);
        setAriaMessage(`Showing ${data.length} projects`);
      } catch {
        setProjects([]);
        setAriaMessage('Failed to load projects');
      }
    };
    load();
  }, []);

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

  const filtered = useMemo(
    () =>
      projects.filter(
        (p) =>
          (!stack || p.stack.includes(stack)) &&
          (!year || String(p.year) === year) &&
          (!type || p.type === type) &&
          (search === '' ||
            p.title.toLowerCase().includes(search.toLowerCase()) ||
            p.description.toLowerCase().includes(search.toLowerCase()))
      ),
    [projects, stack, year, type, search]
  );

  useEffect(() => {
    setAriaMessage(
      `Showing ${filtered.length} project${filtered.length === 1 ? '' : 's'}${stack ? ` filtered by ${stack}` : ''}${year ? ` in ${year}` : ''}${type ? ` of type ${type}` : ''}${search ? ` matching "${search}"` : ''}`
    );
  }, [filtered.length, stack, year, type, search]);

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
      <div className="columns-1 sm:columns-2 md:columns-3 gap-4">
        {filtered.map((project) => (
          <div
            key={project.id}
            className="mb-4 break-inside-avoid bg-gray-800 rounded shadow overflow-hidden"
          >
            <img
              src={project.thumbnail}
              alt={project.title}
              className="w-full h-48 object-cover"
              loading="lazy"
            />
            <div className="p-4 space-y-2">
              <h3 className="text-lg font-semibold">{project.title}</h3>
              <p className="text-sm">{project.description}</p>
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
      <div aria-live="polite" className="sr-only">
        {ariaMessage}
      </div>
    </div>
  );
};

export default ProjectGallery;
