import React from 'react';

const Wordlists: React.FC = () => (
  <section className="p-4 rounded bg-ub-grey text-white">
    <h2 className="text-xl font-bold mb-2">Wordlists</h2>
    <p className="text-sm mb-2">
      Curated lists of common passwords for cracking and testing.
    </p>
    <a
      href="https://www.kali.org/tools/wordlists/"
      target="_blank"
      rel="noopener noreferrer"
      className="text-ub-orange underline"
    >
      Official package page
    </a>
  </section>
);

export default Wordlists;
