import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import ReactGA from 'react-ga4';
import { useRouter } from 'next/router';
import projects from './project-gallery.json';

export default function ProjectGallery() {
  const router = useRouter();
  const [selectedTag, setSelectedTag] = useState('All');
  const [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(() => {
    ReactGA.event({ category: 'Application', action: 'Loaded Project Gallery' });
  }, []);

  const allTags = useMemo(() => {
    const tags = new Set();
    projects.forEach((p) => p.tags.forEach((t) => tags.add(t)));
    return Array.from(tags);
  }, []);

  const filtered = useMemo(() => {
    if (selectedTag === 'All') return projects;
    return projects.filter((p) => p.tags.includes(selectedTag));
  }, [selectedTag]);

  useEffect(() => {
    if (!router.isReady) return;
    const param = router.query.project;
    if (param) {
      const id = Array.isArray(param) ? param[0] : param;
      const idx = projects.findIndex((p) => p.id === id);
      if (idx !== -1) setLightboxIndex(idx);
    }
  }, [router.isReady, router.query.project]);

  const openLightbox = (index) => {
    setLightboxIndex(index);
    router.push({ pathname: router.pathname, query: { project: projects[index].id } }, undefined, { shallow: true });
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
    router.push(router.pathname, undefined, { shallow: true });
  };

  const showPrev = () => {
    setLightboxIndex((i) => {
      const next = (i - 1 + projects.length) % projects.length;
      router.push({ pathname: router.pathname, query: { project: projects[next].id } }, undefined, { shallow: true });
      return next;
    });
  };

  const showNext = () => {
    setLightboxIndex((i) => {
      const next = (i + 1) % projects.length;
      router.push({ pathname: router.pathname, query: { project: projects[next].id } }, undefined, { shallow: true });
      return next;
    });
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') showPrev();
      if (e.key === 'ArrowRight') showNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxIndex]);

  return (
    <div className="p-4 w-full h-full overflow-y-auto bg-ub-cool-grey text-white">
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedTag('All')}
          className={`px-3 py-1 rounded ${selectedTag === 'All' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          All
        </button>
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`px-3 py-1 rounded ${selectedTag === tag ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            {tag}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="text-center">No projects found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => {
            const index = projects.findIndex((p) => p.id === project.id);
            return (
              <div
                key={project.id}
                className="rounded-md bg-ub-grey bg-opacity-20 border border-gray-700 overflow-hidden flex flex-col"
              >
                <button
                  className="relative h-40 w-full"
                  onClick={() => openLightbox(index)}
                  aria-label={`Open ${project.title}`}
                >
                  <Image
                    src={project.image}
                    alt={project.title}
                    fill
                    className="object-cover"
                    sizes="100%"
                    loading="lazy"
                  />
                </button>
                <div className="p-3 flex flex-col flex-grow">
                  <h3 className="text-lg font-semibold">{project.title}</h3>
                  <p className="text-sm text-gray-200 mt-1 flex-grow">{project.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {project.tags.map((t, i) => (
                      <span key={i} className="px-2 py-0.5 text-xs rounded bg-gray-700">
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
            );
          })}
        </div>
      )}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <button
            className="absolute top-4 right-4 text-white text-2xl"
            onClick={closeLightbox}
            aria-label="Close"
          >
            ×
          </button>
          <button
            className="absolute left-4 text-white text-2xl"
            onClick={showPrev}
            aria-label="Previous"
          >
            ‹
          </button>
          <div className="max-w-3xl w-full p-4">
            <div className="relative w-full h-64 sm:h-96 mb-4">
              <Image
                src={projects[lightboxIndex].image}
                alt={projects[lightboxIndex].title}
                fill
                className="object-contain"
                sizes="100%"
                loading="lazy"
              />
            </div>
            <h3 className="text-xl font-semibold">{projects[lightboxIndex].title}</h3>
            <p className="mt-2 text-gray-200">{projects[lightboxIndex].description}</p>
          </div>
          <button
            className="absolute right-4 text-white text-2xl"
            onClick={showNext}
            aria-label="Next"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

export const displayProjectGallery = () => <ProjectGallery />;
