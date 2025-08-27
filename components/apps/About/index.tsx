import React from 'react';
import Head from 'next/head';
import Image from 'next/image';

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
    <main className="p-4 w-full h-full overflow-y-auto bg-ub-cool-grey text-white text-block">
      <Head>
        <title>About</title>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }}
        />
      </Head>
      <Image
        src="/themes/Yaru/status/about.svg"
        alt="Profile icon"
        width={64}
        height={64}
        className="mb-4"
      />
      <h2 id="about-heading" className="text-2xl font-bold mb-4">About</h2>
      <section aria-labelledby="now-heading" className="mb-6">
        <h3 id="now-heading" className="text-xl font-semibold mb-2">Now</h3>
        <ul className="list-disc pl-5 space-y-1">
          {nowItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="cv-heading" className="mb-6">
        <h3 id="cv-heading" className="text-xl font-semibold mb-2">CV Highlights</h3>
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
    </main>
  );
}
