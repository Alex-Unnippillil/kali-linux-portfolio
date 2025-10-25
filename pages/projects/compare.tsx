'use client';

import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import projectsData from '../../data/projects.json';

interface Project {
  id: number;
  title: string;
  goals: string;
  stack: string[];
  results: string;
}

export default function CompareProjects() {
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>([]);

  // initialize from query string
  useEffect(() => {
    if (!router.isReady) return;
    const { ids } = router.query;
    if (typeof ids === 'string') {
      const parsed = ids
        .split(',')
        .map((i) => parseInt(i, 10))
        .filter((n) => !isNaN(n))
        .slice(0, 3);
      setSelected(parsed);
    }
  }, [router.isReady, router.query]);

  // encode selection in query string
  useEffect(() => {
    const query = selected.length ? { ids: selected.join(',') } : {};
    router.replace({ pathname: router.pathname, query }, undefined, {
      shallow: true,
    });
  }, [router, selected]);

  const toggle = (id: number) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((p) => p !== id);
      }
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const allProjects = projectsData as Project[];
  const projects = useMemo(
    () => allProjects.filter((p) => selected.includes(p.id)),
    [allProjects, selected],
  );

  return (
    <div className="p-4 space-y-4 text-black">
      <h1 className="text-2xl font-bold">Compare Projects</h1>
      <p>Select up to three projects to compare.</p>
      <div className="flex flex-wrap gap-2">
        {allProjects.map((p) => {
          const checked = selected.includes(p.id);
          const disabled = !checked && selected.length >= 3;
          return (
            <label key={p.id} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(p.id)}
              />
              {p.title}
            </label>
          );
        })}
      </div>
      {projects.length > 0 && (
        <div className="overflow-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky top-0 bg-gray-200 p-2 text-left">Category</th>
                {projects.map((p) => (
                  <th
                    key={p.id}
                    className="sticky top-0 bg-gray-200 p-2"
                  >
                    <a
                      href={`/projects/${p.id}`}
                      className="text-blue-600 underline"
                    >
                      {p.title}
                    </a>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th className="sticky left-0 bg-gray-100 p-2 text-left">Goals</th>
                {projects.map((p) => (
                  <td key={p.id} className="border p-2 align-top">
                    {p.goals}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="sticky left-0 bg-gray-100 p-2 text-left">Stack</th>
                {projects.map((p) => (
                  <td key={p.id} className="border p-2 align-top">
                    {p.stack.join(', ')}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="sticky left-0 bg-gray-100 p-2 text-left">Results</th>
                {projects.map((p) => (
                  <td key={p.id} className="border p-2 align-top">
                    {p.results}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

