import React from 'react';

const OFFICIAL_URL = 'https://store.nethunter.com/en/';

const NethunterAppStore: React.FC = () => (
  <main className="p-4 flex items-center justify-center">
    <a
      href={OFFICIAL_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="px-4 py-2 bg-blue-600 text-white rounded"
    >
      Kali NetHunter App Store
    </a>
  </main>
);

export default NethunterAppStore;
