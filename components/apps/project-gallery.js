import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import ReactGA from 'react-ga4';
import projectsData from '../../data/projects.json';

export default function ProjectGallery() {
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('All');
  const cardRefs = useRef([]);

  useEffect(() => {
    ReactGA.event({ category: 'Application', action: 'Loaded Project Gallery' });
  }, []);

  useEffect(() => {
    setProjects(projectsData);
  }, []);

  const tags = useMemo(
    () => ['All', ...Array.from(new Set(projects.flatMap((p) => p.tags)))],
    [projects]
  );

  const filtered = useMemo(
    () =>
      projects.filter(
        (p) =>
          (tag === 'All' || p.tags.includes(tag)) &&
          (p.title.toLowerCase().includes(search.toLowerCase()) ||
            p.description.toLowerCase().includes(search.toLowerCase()))
      ),
    [projects, search, tag]
  );

  useEffect(() => {
    cardRefs.current = cardRefs.current.slice(0, filtered.length);
  }, [filtered]);

  const handleKeyDown = (e, index) => {
    if (['ArrowRight', 'ArrowDown'].includes(e.key)) {
      const next = (index + 1) % filtered.length;
      cardRefs.current[next]?.focus();
      e.preventDefault();
    } else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) {
      const prev = (index - 1 + filtered.length) % filtered.length;
      cardRefs.current[prev]?.focus();
      e.preventDefault();
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
      {filtered.length === 0 ? (
        <p className="text-center">No projects found.</p>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
          {filtered.map((project, index) => (
            <div
              key={index}
              ref={(el) => (cardRefs.current[index] = el)}
              tabIndex={0}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="mb-4 break-inside-avoid rounded-md bg-surface bg-opacity-20 border border-gray-700 overflow-hidden flex flex-col"
            >
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
                  {project.tech.map((t, i) => (
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

