import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import ReactGA from 'react-ga4';

const GITHUB_USER = 'Alex-Unnippillil';

export default function ProjectGallery() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    ReactGA.event({ category: 'Application', action: 'Loaded Project Gallery' });
  }, []);

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const res = await fetch(
          `https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=9`
        );
        const data = await res.json();
        const mapped = data.map((repo) => ({
          title: repo.name,
          description: repo.description || 'No description provided.',
          image: `https://opengraph.githubassets.com/1/${GITHUB_USER}/${repo.name}`,
          tech: [repo.language].filter(Boolean),
          live: repo.homepage,
          repo: repo.html_url,
        }));
        setProjects(mapped);
      } catch (err) {
        console.error('Failed to load repos', err);
      }
    };
    fetchRepos();
  }, []);

  return (
    <div className="p-4 w-full h-full overflow-y-auto bg-ub-cool-grey text-white">
      {projects.length === 0 ? (
        <p className="text-center">Loading projects...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, index) => (
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

