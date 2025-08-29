'use client';

import { useEffect, useState } from 'react';
import html2pdf from 'html2pdf.js';

interface Project {
  name: string;
  link: string;
}

interface Experience {
  company: string;
  role: string;
  start: string;
  end: string;
  tags: string[];
}

interface ResumeData {
  name: string;
  title: string;
  skills: string[];
  projects: Project[];
  experience: Experience[];
}

export default function About() {
  const [data, setData] = useState<ResumeData | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    fetch('/resume.json')
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data) {
    return <div className="p-4">Loading...</div>;
  }

  const tags = Array.from(new Set(data.experience.flatMap((e) => e.tags)));
  const filtered = data.experience.filter((e) => !filter || e.tags.includes(filter));

  const downloadPdf = () => {
    const element = document.getElementById('resume-root');
    if (element) {
      html2pdf().from(element).save('resume.pdf');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4" id="resume-root">
      <h1 className="text-3xl font-bold">{data.name}</h1>
      <p className="mb-6 text-gray-400">{data.title}</p>

      <section className="mb-8">
        <h2 className="text-2xl mb-2">Skills</h2>
        <div className="flex flex-wrap gap-2">
          {data.skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-blue-600 px-3 py-1 text-sm"
            >
              {skill}
            </span>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl mb-2">Projects</h2>
        <ul className="list-disc pl-5 space-y-1">
          {data.projects.map((p) => (
            <li key={p.name}>
              <a
                href={p.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline"
              >
                {p.name}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl mb-2">Experience</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter(null)}
            className={`px-3 py-1 rounded-full text-sm ${
              filter === null ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            All
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilter(tag)}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === tag ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
        <ul className="space-y-4">
          {filtered.map((exp, i) => (
            <li
              key={i}
              className="border-l-2 border-blue-600 pl-4 relative opacity-0 animate-slidein"
            >
              <div className="font-semibold">{exp.role}</div>
              <div className="text-sm text-gray-400 mb-1">
                {exp.company} • {exp.start} - {exp.end}
              </div>
              <div className="flex flex-wrap gap-2">
                {exp.tags.map((t) => (
                  <span key={t} className="bg-gray-700 px-2 py-0.5 text-xs rounded-full">
                    {t}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <button
        onClick={downloadPdf}
        className="rounded bg-green-600 px-4 py-2"
      >
        Download PDF
      </button>

      <style jsx>{`
        @keyframes slidein {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slidein {
          animation: slidein 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

