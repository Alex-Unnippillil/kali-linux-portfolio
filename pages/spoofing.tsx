import React from 'react';
import Meta from '../components/SEO/Meta';
import { tokenVar } from '../lib/designTokens';

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
    className="block p-lg bg-surface-panel text-text-primary rounded-lg shadow-md transition-colors duration-fast hover:bg-surface-elevated focus:outline-none focus:ring focus:ring-brand-secondary"
  >
    <h2 className="text-xl mb-sm font-semibold">{title}</h2>
    {children}
    <p className="mt-sm underline text-sm text-brand-secondary">Documentation</p>
  </a>
);

const ArpDiagram = () => (
  <svg viewBox="0 0 300 120" className="w-full h-32">
    <defs>
      <marker id="arrow-arp" markerWidth="10" markerHeight="10" refX="10" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,6 L9,3 z" fill={tokenVar('status', 'success')} />
      </marker>
    </defs>
    <rect x="10" y="40" width="80" height="40" fill={tokenVar('surface', 'muted')} stroke={tokenVar('status', 'success')} />
    <text x="50" y="65" fill={tokenVar('text', 'primary')} textAnchor="middle">
      Victim
    </text>
    <rect x="110" y="40" width="80" height="40" fill={tokenVar('surface', 'muted')} stroke={tokenVar('status', 'success')} />
    <text x="150" y="65" fill={tokenVar('text', 'primary')} textAnchor="middle">
      Attacker
    </text>
    <rect x="210" y="40" width="80" height="40" fill={tokenVar('surface', 'muted')} stroke={tokenVar('status', 'success')} />
    <text x="250" y="65" fill={tokenVar('text', 'primary')} textAnchor="middle">
      Gateway
    </text>
    <line x1="90" y1="60" x2="110" y2="60" stroke={tokenVar('status', 'success')} strokeWidth={2} markerEnd="url(#arrow-arp)" />
    <line x1="190" y1="60" x2="210" y2="60" stroke={tokenVar('status', 'success')} strokeWidth={2} markerEnd="url(#arrow-arp)" />
  </svg>
);

const DnsDiagram = () => (
  <svg viewBox="0 0 300 160" className="w-full h-40">
    <defs>
      <marker id="arrow-dns" markerWidth="10" markerHeight="10" refX="10" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,6 L9,3 z" fill={tokenVar('status', 'success')} />
      </marker>
    </defs>
    <rect x="10" y="20" width="80" height="40" fill={tokenVar('surface', 'muted')} stroke={tokenVar('status', 'success')} />
    <text x="50" y="45" fill={tokenVar('text', 'primary')} textAnchor="middle">
      Client
    </text>
    <rect x="110" y="20" width="80" height="40" fill={tokenVar('surface', 'muted')} stroke={tokenVar('status', 'success')} />
    <text x="150" y="45" fill={tokenVar('text', 'primary')} textAnchor="middle">
      Attacker
    </text>
    <rect x="210" y="20" width="80" height="40" fill={tokenVar('surface', 'muted')} stroke={tokenVar('status', 'success')} />
    <text x="250" y="45" fill={tokenVar('text', 'primary')} textAnchor="middle">
      DNS
    </text>
    <line x1="90" y1="40" x2="110" y2="40" stroke={tokenVar('status', 'success')} strokeWidth={2} markerEnd="url(#arrow-dns)" />
    <line x1="190" y1="40" x2="210" y2="40" stroke={tokenVar('status', 'success')} strokeWidth={2} markerEnd="url(#arrow-dns)" />
    <line x1="150" y1="60" x2="50" y2="60" stroke={tokenVar('status', 'success')} strokeWidth={2} markerEnd="url(#arrow-dns)" />
    <text x="100" y="75" fill={tokenVar('text', 'primary')} textAnchor="middle" fontSize={10}>
      spoofed reply
    </text>
  </svg>
);

const SpoofingOverview = () => (
  <>
    <Meta />
    <main className="p-lg grid gap-md md:grid-cols-2 bg-surface-panel min-h-screen text-text-primary">
      <ToolTile title="arpspoof" link="https://manpages.debian.org/unstable/dsniff/arpspoof.8.en.html">
        <ArpDiagram />
      </ToolTile>
      <ToolTile title="dnsspoof" link="https://manpages.debian.org/unstable/dsniff/dnsspoof.8.en.html">
        <DnsDiagram />
      </ToolTile>
    </main>
  </>
);

export default SpoofingOverview;

