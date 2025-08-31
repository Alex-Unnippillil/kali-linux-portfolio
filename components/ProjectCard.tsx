import { useEffect, useState } from 'react';

interface Project {
  id: number;
  title: string;
  description: string;
  stack: string[];
  thumbnail: string;
  repo: string;
  demo: string;
}

interface Props {
  project: Project;
}

const STORAGE_KEY = 'shortlistedProjects';

const Heart = ({ filled }: { filled: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill={filled ? '#ef4444' : 'none'}
    stroke="#ef4444"
    strokeWidth={2}
    className="w-5 h-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.995 4.8c2.487-2.86 7.494-.9 7.494 3.132 0 2.21-1.27 4.29-3.132 5.683L12 20.25l-4.357-6.636C5.78 12.222 4.5 10.145 4.5 7.932c0-4.032 5.008-5.99 7.495-3.132z"
    />
  </svg>
);

export default function ProjectCard({ project }: Props) {
  const [shortlisted, setShortlisted] = useState(false);
  const [isPointer, setIsPointer] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const isTouch = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;

  useEffect(() => {
    const match = window.matchMedia('(pointer: fine)');
    setIsPointer(match.matches);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const ids: number[] = raw ? JSON.parse(raw) : [];
      setShortlisted(ids.includes(project.id));
    } catch {
      /* ignore */
    }
  }, [project.id]);

  const toggleShortlist = () => {
    setShortlisted((prev) => {
      const next = !prev;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        let ids: number[] = raw ? JSON.parse(raw) : [];
        ids = next ? Array.from(new Set([...ids, project.id])) : ids.filter((id) => id !== project.id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPointer) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const midX = rect.width / 2;
    const midY = rect.height / 2;
    const rotateX = ((y - midY) / midY) * 5;
    const rotateY = -((x - midX) / midX) * 5;
    setStyle({ transform: `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)` });
  };

  const resetTilt = () => setStyle({});

  const link = project.demo || project.repo;

  return (
    <div
      className="relative group rounded-lg overflow-hidden"
      onMouseMove={handleMove}
      onMouseLeave={resetTilt}
      style={style}
    >
      <img
        src={project.thumbnail}
        alt={project.title}
        className="w-full h-48 object-cover transition-shadow duration-300 rounded-lg group-hover:shadow-xl"
      />
      <button
        aria-label={shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
        onClick={toggleShortlist}
        className="absolute top-2 right-2 w-10 h-10 flex items-center justify-center bg-black/60 rounded-full"
      >
        <Heart filled={shortlisted} />
      </button>
      <div
        className={`absolute inset-0 flex flex-col justify-end p-4 bg-black/70 text-white transition-opacity duration-300 ${
          isTouch ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <h3 className="text-lg font-semibold">{project.title}</h3>
        <p className="text-sm mb-2">{project.description}</p>
        <div className="flex flex-wrap gap-1 mb-2">
          {project.stack.map((tech) => (
            <span key={tech} className="text-xs bg-gray-700 px-2 py-0.5 rounded">
              {tech}
            </span>
          ))}
        </div>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block bg-blue-600 text-white text-sm px-3 py-1 rounded"
          >
            View
          </a>
        )}
      </div>
    </div>
  );
}

