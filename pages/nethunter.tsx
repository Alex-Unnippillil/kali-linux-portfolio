import React from 'react';
import NetHunterTile from '../components/get-kali/NetHunterTile';

const Nethunter: React.FC = () => (
  <main className="p-4">
    <h1 className="text-2xl font-bold mb-4">Kali NetHunter</h1>
    <NetHunterTile />
    <div className="mt-6 flex flex-col gap-4">
      <a
        href="https://www.kali.org/docs/nethunter/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:underline"
      >
        NetHunter Documentation
      </a>
      <a
        href="https://store.nethunter.com/en/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:underline"
      >
        Kali NetHunter App Store
      </a>
    </div>
  </main>
);

export default Nethunter;
