import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import ReactGA from 'react-ga4';

const GITHUB_USER = 'Alex-Unnippillil';

export default function ProjectGallery() {
  const [projects, setProjects] = useState([]);
  const [display, setDisplay] = useState([]);
  const [filter, setFilter] = useState('');
  const [tags, setTags] = useState([]);
  const [ariaMessage, setAriaMessage] = useState('');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    ReactGA.event({ category: 'Application', action: 'Loaded Project Gallery' });
    if (typeof window !== 'undefined') {
      setPrefersReducedMotion(
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
    }
  }, []);

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const res = await fetch(
          `https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=9`,
          { headers: { Accept: 'application/vnd.github.mercy-preview+json' } }
        );
        const data = await res.json();
        const mapped = data.map((repo) => ({
          id: repo.id,
          title: repo.name,
          description: repo.description || 'No description provided.',
          image: `https://opengraph.githubassets.com/1/${GITHUB_USER}/${repo.name}`,
          tags: [...(repo.topics || []), repo.language].filter(Boolean),
          live: repo.homepage,
          repo: repo.html_url,
        }));
        setProjects(mapped);
        setDisplay(mapped);
        setTags([...(new Set(mapped.flatMap((p) => p.tags)))]);
        setAriaMessage(`Showing ${mapped.length} projects`);
      } catch (err) {
        console.error('Failed to load repos', err);
      }
    };
    fetchRepos();
  }, []);

  const updateDisplay = useCallback(
    (selected) => {
      const filtered = selected
        ? projects.filter((p) => p.tags.includes(selected))
        : projects;
      setAriaMessage(
        `Showing ${filtered.length} project${
          filtered.length === 1 ? '' : 's'
        }${selected ? ` filtered by ${selected}` : ''}`
      );
      setDisplay((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]));
        const next = [];
        filtered.forEach((p) => {
          if (map.has(p.id)) {
            next.push({ ...map.get(p.id), status: 'entered' });
            map.delete(p.id);
          } else {
            next.push({ ...p, status: prefersReducedMotion ? 'entered' : 'entering' });
          }
        });
        map.forEach((p) => {
          next.push({ ...p, status: prefersReducedMotion ? 'exited' : 'exiting' });
        });
        return next.filter((p) => p.status !== 'exited');
      });
    },
    [projects, prefersReducedMotion]
  );

  useEffect(() => {
    updateDisplay(filter);
  }, [filter, projects, updateDisplay]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    display.forEach((p) => {
      if (p.status === 'entering') {
        requestAnimationFrame(() => {
          setDisplay((curr) =>
            curr.map((c) => (c.id === p.id ? { ...c, status: 'entered' } : c))
          );
        });
      }
    });
    if (display.some((p) => p.status === 'exiting')) {
      const timeout = setTimeout(() => {
        setDisplay((curr) => curr.filter((p) => p.status !== 'exiting'));
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [display, prefersReducedMotion]);

  const motionClass = prefersReducedMotion
    ? ''
    : 'transition transform duration-300 ease-out';

  return (
    <div className="p-4 w-full h-full overflow-y-auto bg-ub-cool-grey text-white">
      <div aria-live="polite" className="sr-only">
        {ariaMessage}
      </div>
      {projects.length === 0 ? (
        <p className="text-center">Loading projects...</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('')}
              className={`px-3 py-1 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                filter === ''
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-white'
              }`}
              aria-pressed={filter === ''}
            >
              All
            </button>
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  filter === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-white'
                }`}
                aria-pressed={filter === t}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {display.map((project) => (
              <div
                key={project.id}
                className={`mb-4 break-inside-avoid rounded-md bg-ub-grey bg-opacity-20 border border-gray-700 overflow-hidden flex flex-col opacity-100 translate-y-0 ${
                  project.status === 'entering'
                    ? 'opacity-0 translate-y-2'
                    : ''
                } ${
                  project.status === 'exiting'
                    ? 'opacity-0 -translate-y-2'
                    : ''
                } ${motionClass}`}
              >
                <div className="relative w-full h-48 md:h-56 lg:h-64">
                  <Image
                    src={project.image}
                    alt={project.title}
                    fill
                    className="object-cover"
                    sizes="100%"
                  />
                </div>
                <div className="p-3 flex flex-col flex-grow">
                  <h3 className="text-lg font-semibold">{project.title}</h3>
                  <p className="text-sm text-gray-200 mt-1 flex-grow">
                    {project.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {project.tags.map((t, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-xs rounded bg-gray-700 text-white"
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
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        Live Demo
                      </a>
                    )}
                    {project.repo && (
                      <a
                        href={project.repo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 text-sm border border-blue-600 rounded text-white hover:bg-blue-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        Repo
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

