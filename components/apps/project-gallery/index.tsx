import React, { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import ReactGA from 'react-ga4';
import projectsData from './projects.json';

type Project = {
  title: string;
  description: string;
  image: string;
  tech: string[];
  live?: string;
  repo?: string;
};

const fuzzyMatch = (query: string, text: string) => {
  if (!query) return true;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let ti = 0;
  for (const qc of q) {
    ti = t.indexOf(qc, ti);
    if (ti === -1) return false;
    ti++;
  }
  return true;
};

export default function ProjectGallery() {
  const projects: Project[] = projectsData as Project[];
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState<string | null>(null);

  useEffect(() => {
    ReactGA.event({ category: 'Application', action: 'Loaded Project Gallery' });
  }, []);

  const tags = useMemo(
    () => Array.from(new Set(projects.flatMap((p) => p.tech))),
    [projects]
  );

  const filtered = projects.filter((p) => {
    const matchesTag = tag ? p.tech.includes(tag) : true;
    const matchesSearch = fuzzyMatch(search, p.title + ' ' + p.description);
    return matchesTag && matchesSearch;
  });

  const toggleTag = (t: string) => setTag((prev) => (prev === t ? null : t));

  return (
    <div className="p-4 w-full h-full overflow-y-auto bg-ub-cool-grey text-white">
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-2 py-1 rounded text-black"
        />
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => toggleTag(t)}
            className={`px-2 py-1 text-sm rounded border ${
              tag === t ? 'bg-blue-600 border-blue-600' : 'border-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="text-center">No projects found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project, index) => (
            <div
              key={index}
              data-testid="project-card"
              className="rounded-md bg-ub-grey bg-opacity-20 border border-gray-700 overflow-hidden flex flex-col"
            >
              <div className="relative h-40 w-full">
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

