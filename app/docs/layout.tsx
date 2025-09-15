import type { Metadata } from 'next';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

const containerStyle: CSSProperties = {
  margin: '0 auto',
  maxWidth: '960px',
  padding: '4rem 1.5rem 6rem',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: '1.5rem',
  marginBottom: '3rem',
  flexWrap: 'wrap',
};

const kickerStyle: CSSProperties = {
  margin: 0,
  fontSize: '0.75rem',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  opacity: 0.7,
};

const titleStyle: CSSProperties = {
  margin: '0.25rem 0 0',
  fontSize: '2rem',
  fontWeight: 600,
  lineHeight: 1.2,
};

const linkStyle: CSSProperties = {
  color: '#38bdf8',
  textDecoration: 'none',
  fontWeight: 500,
  fontSize: '0.95rem',
};

const mainStyle: CSSProperties = {
  display: 'grid',
  gap: '2.5rem',
  lineHeight: 1.7,
};

export const metadata: Metadata = {
  title: {
    default: 'Documentation',
    template: '%s | Documentation',
  },
  description:
    'In-depth usage guides for the Kali Linux Portfolio simulations and desktop utilities.',
};

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div>
          <p style={kickerStyle}>Documentation</p>
          <h1 style={titleStyle}>Kali Linux Portfolio</h1>
        </div>
        <Link href="/" style={linkStyle}>
          ← Back to desktop
        </Link>
      </header>
      <main style={mainStyle}>{children}</main>
    </div>
  );
}
