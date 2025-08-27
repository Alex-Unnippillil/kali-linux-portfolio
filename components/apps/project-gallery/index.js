import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import ReactGA from 'react-ga4';
import projectsData from './projects.json';

export default function ProjectGallery() {
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    ReactGA.event({ category: 'Application', action: 'Loaded Project Gallery' });
  }, []);

  useEffect(() => {
    setProjects(projectsData);
  }, []);

  const filtered = projects.filter((project) => {
    const query = filter.toLowerCase();
    return (
      project.title.toLowerCase().includes(query) ||
      project.tech.some((t) => t.toLowerCase().includes(query))
    );
  });

  return (
    <div className="p-4 w-full h-full overflow-y-auto bg-ub-cool-grey text-white">
      <input
        type="text"
        placeholder="Search projects..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mb-4 w-full px-2 py-1 rounded bg-gray-700 placeholder-gray-300 focus:outline-none"
      />
      {projects.length === 0 ? (
        <p className="text-center">Loading projects...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center">No matching projects.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project, index) => (
            <div
              key={index}
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
                      Open Repo
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

