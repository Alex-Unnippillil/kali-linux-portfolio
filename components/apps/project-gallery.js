import React, { useEffect } from 'react';
import Image from 'next/image';
import ReactGA from 'react-ga4';

const projects = [
  {
    title: 'Kali Linux Portfolio',
    description: 'Desktop-style personal portfolio built with Next.js and Tailwind CSS.',
    image: '/images/wallpapers/wall-1.webp',
    tech: ['Next.js', 'TailwindCSS', 'React'],
    live: 'https://unnippillil.com',
    repo: 'https://github.com/Alex-Unnippillil/kali-linux-portfolio',
  },
  {
    title: 'Population of Canadian Provinces',
    description: 'Race bar graph visualizing population of Canadian provinces from 1950-2024.',
    image: '/images/wallpapers/wall-2.webp',
    tech: ['HTML5', 'JavaScript'],
    repo: 'https://github.com/Alex-Unnippillil/Population-of-Canadian-Provinces',
  },
  {
    title: 'Tic Tac Toe',
    description: 'Classic Tic Tac Toe game implemented in vanilla HTML.',
    image: '/images/wallpapers/wall-3.webp',
    tech: ['HTML5', 'CSS'],
    live: 'https://alex-unnippillil.github.io/tictactoe',
    repo: 'https://github.com/Alex-Unnippillil/tictactoe',
  },
];

export default function ProjectGallery() {
  useEffect(() => {
    ReactGA.event({ category: 'Application', action: 'Loaded Project Gallery' });
  }, []);

  return (
    <div className="p-4 w-full h-full overflow-y-auto bg-ub-cool-grey text-white">
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
              <p className="text-sm text-gray-200 mt-1 flex-grow">{project.description}</p>
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
    </div>
  );
}

export const displayProjectGallery = () => <ProjectGallery />;

