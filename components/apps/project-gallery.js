import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import ReactGA from 'react-ga4';
import projectsData from '../../data/projects.json';

export default function ProjectGallery() {
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('All');
  const [pinned, setPinned] = useState([]);
  const [columns, setColumns] = useState(1);
  const cardRefs = useRef([]);

  useEffect(() => {
    ReactGA.event({ category: 'Application', action: 'Loaded Project Gallery' });
  }, []);

  useEffect(() => {
    setProjects(projectsData);
  }, []);

  useEffect(() => {
    const stored =
      typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem('pinnedProjects') || '[]')
        : [];
    setPinned(stored);
  }, []);

  useEffect(() => {
    const updateColumns = () => {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
      if (width >= 1024) setColumns(3);
      else if (width >= 640) setColumns(2);
      else setColumns(1);
    };
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  const tags = useMemo(
    () => ['All', ...Array.from(new Set(projects.flatMap((p) => p.tags)))],
    [projects]
  );

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return projects.filter(
      (p) =>
        (tag === 'All' || p.tags.includes(tag)) &&
        (p.title.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term) ||
          p.tech.some((t) => t.toLowerCase().includes(term)) ||
          p.tags.some((t) => t.toLowerCase().includes(term)))
    );
  }, [projects, search, tag]);

  const sorted = useMemo(() => {
    const pinnedProjects = filtered.filter((p) => pinned.includes(p.title));
    const otherProjects = filtered.filter((p) => !pinned.includes(p.title));
    return [...pinnedProjects, ...otherProjects];
  }, [filtered, pinned]);

  useEffect(() => {
    cardRefs.current = cardRefs.current.slice(0, sorted.length);
  }, [sorted]);

  const togglePinned = (title) => {
    setPinned((prev) => {
      const next = prev.includes(title)
        ? prev.filter((t) => t !== title)
        : [...prev, title];
      if (typeof window !== 'undefined') {
        localStorage.setItem('pinnedProjects', JSON.stringify(next));
      }
      return next;
    });
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') {
      const next = index + 1;
      if (next < sorted.length) {
        cardRefs.current[next]?.focus();
        e.preventDefault();
      }
    } else if (e.key === 'ArrowLeft') {
      const prev = index - 1;
      if (prev >= 0) {
        cardRefs.current[prev]?.focus();
        e.preventDefault();
      }
    } else if (e.key === 'ArrowDown') {
      const nextRow = index + columns;
      if (nextRow < sorted.length) {
        cardRefs.current[nextRow]?.focus();
        e.preventDefault();
      }
    } else if (e.key === 'ArrowUp') {
      const prevRow = index - columns;
      if (prevRow >= 0) {
        cardRefs.current[prevRow]?.focus();
        e.preventDefault();
      }
    }
  };

  return (
    <div className="p-4 w-full h-full overflow-y-auto bg-panel text-white">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="px-2 py-1 rounded bg-gray-800 text-white flex-grow"
        />
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => setTag(t)}
              className={`px-2 py-0.5 text-sm rounded ${
                tag === t ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      {sorted.length === 0 ? (
        <p className="text-center">No projects found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((project, index) => (
            <div
              key={index}
              ref={(el) => (cardRefs.current[index] = el)}
              tabIndex={0}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="relative rounded-md bg-surface bg-opacity-20 border border-gray-700 overflow-hidden flex flex-col"
            >
              <button
                onClick={() => togglePinned(project.title)}
                aria-label="Toggle pinned"
                className="absolute top-2 right-2 text-xl"
              >
                {pinned.includes(project.title) ? '★' : '☆'}
              </button>
              <div className="relative h-40 w-full">
                <Image
                  src={project.image}
                  alt={project.title}
                  fill
                  className="object-cover"
                  sizes="100%"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/images/logos/logo.png';
                  }}
                />
              </div>
              <div className="p-3 flex flex-col flex-grow">
                <h3 className="text-lg font-semibold">{project.title}</h3>
                <p className="text-sm text-gray-200 mt-1 flex-grow">
                  {project.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {[...project.tech, ...(project.tags || [])].map((t, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-xs rounded bg-gray-700"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  {project.live && (
                    <a
                      href={project.live}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 text-sm bg-blue-600 rounded hover:bg-blue-500"
                    >
                      Live Demo
                    </a>
                  )}
                  {project.repo && (
                    <a
                      href={project.repo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 text-sm border border-blue-600 rounded hover:bg-blue-600 hover:text-white"
                    >
                      Repo
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const displayProjectGallery = () => <ProjectGallery />;

