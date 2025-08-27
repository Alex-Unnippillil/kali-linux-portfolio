import React from 'react';
import Head from 'next/head';

const nowItems = [
  'Building accessible security tooling',
  'Exploring new web technologies',
];

const highlights = [
  { role: 'Security Engineer', company: 'ACME Corp', period: '2022-present' },
  { role: 'CTF Organizer', company: 'HackClub', period: '2021-2022' },
];

export default function AboutApp() {
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Alex Unnippillil',
    url: 'https://unnippillil.com',
  };

  return (
    <div className="p-4 w-full h-full overflow-y-auto bg-ub-cool-grey text-white">
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }}
        />
      </Head>
      <h1 className="text-2xl font-bold mb-4">About</h1>
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Now</h2>
        <ul className="list-disc pl-5 space-y-1">
          {nowItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">CV Highlights</h2>
        <ul className="list-disc pl-5 space-y-1">
          {highlights.map((h, i) => (
            <li key={i}>
              <span className="font-medium">{h.role}</span> – {h.company} ({h.period})
            </li>
          ))}
        </ul>
      </section>
      <a
        href="/resume.pdf"
        download
        className="underline text-ubt-blue"
      >
        Download Resume
      </a>
    </div>
  );
}
