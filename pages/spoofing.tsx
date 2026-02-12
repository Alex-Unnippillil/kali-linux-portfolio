import React from 'react';
import Head from 'next/head';
import Meta from '../components/SEO/Meta';
import { buildBreadcrumbList, buildDefinedTerm } from '../src/lib/seo/jsonld';

interface TileProps {
  title: string;
  link: string;
  children: React.ReactNode;
}

const ToolTile = ({ title, link, children }: TileProps) => (
  <a
    href={link}
    target="_blank"
    rel="noopener noreferrer"
    className="block p-4 bg-ub-grey text-white rounded shadow hover:bg-black focus:outline-none focus:ring"
  >
    <h2 className="text-xl mb-2">{title}</h2>
    {children}
    <p className="mt-2 underline text-sm">Documentation</p>
  </a>
);

const ArpDiagram = () => (
  <svg viewBox="0 0 300 120" className="w-full h-32">
    <defs>
      <marker id="arrow-arp" markerWidth="10" markerHeight="10" refX="10" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,6 L9,3 z" fill="#4ade80" />
      </marker>
    </defs>
    <rect x="10" y="40" width="80" height="40" fill="#1f2937" stroke="#4ade80" />
    <text x="50" y="65" fill="white" textAnchor="middle">Victim</text>
    <rect x="110" y="40" width="80" height="40" fill="#1f2937" stroke="#4ade80" />
    <text x="150" y="65" fill="white" textAnchor="middle">Attacker</text>
    <rect x="210" y="40" width="80" height="40" fill="#1f2937" stroke="#4ade80" />
    <text x="250" y="65" fill="white" textAnchor="middle">Gateway</text>
    <line x1="90" y1="60" x2="110" y2="60" stroke="#4ade80" strokeWidth="2" markerEnd="url(#arrow-arp)" />
    <line x1="190" y1="60" x2="210" y2="60" stroke="#4ade80" strokeWidth="2" markerEnd="url(#arrow-arp)" />
  </svg>
);

const DnsDiagram = () => (
  <svg viewBox="0 0 300 160" className="w-full h-40">
    <defs>
      <marker id="arrow-dns" markerWidth="10" markerHeight="10" refX="10" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,6 L9,3 z" fill="#4ade80" />
      </marker>
    </defs>
    <rect x="10" y="20" width="80" height="40" fill="#1f2937" stroke="#4ade80" />
    <text x="50" y="45" fill="white" textAnchor="middle">Client</text>
    <rect x="110" y="20" width="80" height="40" fill="#1f2937" stroke="#4ade80" />
    <text x="150" y="45" fill="white" textAnchor="middle">Attacker</text>
    <rect x="210" y="20" width="80" height="40" fill="#1f2937" stroke="#4ade80" />
    <text x="250" y="45" fill="white" textAnchor="middle">DNS</text>
    <line x1="90" y1="40" x2="110" y2="40" stroke="#4ade80" strokeWidth="2" markerEnd="url(#arrow-dns)" />
    <line x1="190" y1="40" x2="210" y2="40" stroke="#4ade80" strokeWidth="2" markerEnd="url(#arrow-dns)" />
    <line x1="150" y1="60" x2="50" y2="60" stroke="#4ade80" strokeWidth="2" markerEnd="url(#arrow-dns)" />
    <text x="100" y="75" fill="white" textAnchor="middle" fontSize="10">spoofed reply</text>
  </svg>
);

const baseUrl = 'https://example.com';
export const spoofingJsonLd = [
  buildDefinedTerm({
    name: 'Spoofing',
    description: 'Spoofing describes techniques used to impersonate another system or user.',
    url: `${baseUrl}/spoofing`,
  }),
  buildBreadcrumbList([
    { name: 'Home', url: baseUrl },
    { name: 'Spoofing', url: `${baseUrl}/spoofing` },
  ]),
];

const SpoofingOverview = () => {
  return (
    <>
      <Meta />
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(spoofingJsonLd),
          }}
        />
      </Head>
      <main className="p-4 grid gap-4 md:grid-cols-2 bg-ub-cool-grey min-h-screen">
        <ToolTile title="arpspoof" link="https://manpages.debian.org/unstable/dsniff/arpspoof.8.en.html">
          <ArpDiagram />
        </ToolTile>
        <ToolTile title="dnsspoof" link="https://manpages.debian.org/unstable/dsniff/dnsspoof.8.en.html">
          <DnsDiagram />
        </ToolTile>
      </main>
    </>
  );
};

export default SpoofingOverview;

