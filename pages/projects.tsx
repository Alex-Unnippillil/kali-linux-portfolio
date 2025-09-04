import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import ProjectFilterBar from '../components/ProjectFilterBar';

interface Project {
  id: number;
  title: string;
  description: string;
  tags: string[];
  domain: string;
  year: number;
  impact: number;
  complexity: number;
  thumbnail: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch('/projects.json')
      .then((r) => r.json())
      .then((data) => setProjects(data as Project[]))
      .catch(() => setProjects([]));
  }, []);

  const selectedTags = useMemo(() => {
    const t = router.query.tags;
    return typeof t === 'string' && t ? t.split(',') : [];
  }, [router.query.tags]);

  const selectedDomains = useMemo(() => {
    const d = router.query.domains;
    return typeof d === 'string' && d ? d.split(',') : [];
  }, [router.query.domains]);

  const sort = typeof router.query.sort === 'string' ? router.query.sort : 'recency';

  const filtered = useMemo(() => {
    return projects
      .filter(
        (p) =>
          (selectedTags.length === 0 || selectedTags.every((t) => p.tags.includes(t))) &&
          (selectedDomains.length === 0 || selectedDomains.includes(p.domain))
      )
      .sort((a, b) => {
        if (sort === 'impact') return b.impact - a.impact;
        if (sort === 'complexity') return b.complexity - a.complexity;
        return b.year - a.year;
      });
  }, [projects, selectedTags, selectedDomains, sort]);

  const tags = useMemo(() => Array.from(new Set(projects.flatMap((p) => p.tags))), [projects]);
  const domains = useMemo(() => Array.from(new Set(projects.map((p) => p.domain))), [projects]);

  return (
    <div className="p-4 space-y-4">
      <ProjectFilterBar tags={tags} domains={domains} />
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {filtered.map((p) => (
          <div key={p.id} className="border rounded p-4 bg-white text-black">
            <img src={p.thumbnail} alt={p.title} className="w-full h-40 object-cover mb-2" />
            <h3 className="font-semibold">{p.title}</h3>
            <p className="text-sm">{p.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

