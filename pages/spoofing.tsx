import React, { useEffect, useRef, useState } from 'react';
import { baseMetadata } from '../lib/metadata';

export const metadata = baseMetadata;

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

const SpoofingOverview = () => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const tiles = [
    {
      id: 'arpspoof',
      title: 'arpspoof',
      link: 'https://manpages.debian.org/unstable/dsniff/arpspoof.8.en.html',
      content: <ArpDiagram />,
    },
    {
      id: 'dnsspoof',
      title: 'dnsspoof',
      link: 'https://manpages.debian.org/unstable/dsniff/dnsspoof.8.en.html',
      content: <DnsDiagram />,
    },
  ];

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;

    const onScroll = () => {
      const index = Math.round(el.scrollLeft / el.clientWidth);
      setActive(index);
    };

    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (i: number) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth * i, behavior: 'smooth' });
  };

  return (
    <>
      <main className="p-4 bg-ub-cool-grey min-h-screen">
        <div
          ref={carouselRef}
          aria-roledescription="carousel"
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-2 md:gap-4 md:overflow-visible"
        >
          {tiles.map((t, i) => (
            <div key={t.id} id={t.id} className="w-full flex-shrink-0 snap-center">
              <ToolTile title={t.title} link={t.link}>
                {t.content}
              </ToolTile>
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-4 gap-2 md:hidden">
          {tiles.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`w-2 h-2 rounded-full ${active === i ? 'bg-white' : 'bg-gray-500'}`}
            />
          ))}
        </div>
      </main>
    </>
  );
};

export default SpoofingOverview;

