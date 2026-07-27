'use client';

import Head from 'next/head';
import { useTheme } from '../hooks/useTheme';
import { isDarkTheme } from '../utils/theme';
import '../styles/docs.css';

export default function AboutPage() {
  const { theme, setTheme } = useTheme();
  const toggleTheme = () => {
    const next = isDarkTheme(theme) ? 'default' : 'dark';
    setTheme(next);
  };

  return (
    <div className="docs-container">
      <Head>
        <title>About</title>
      </Head>
      <main className="docs-content">
        <h1>About This Portfolio</h1>
        <p>
          This project showcases security-focused modules and experiments inspired by
          Kali Linux. It aims to provide practical examples and educational
          resources.
        </p>
      </main>
      <footer className="docs-footer">
        <button onClick={toggleTheme}>
          {isDarkTheme(theme) ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        </button>
      </footer>
    </div>
  );
}
