import React from 'react';

const editions = [
  {
    name: 'Rootless',
    icon: '📱',
    description: 'Run NetHunter in Termux without root access.',
  },
  {
    name: 'Lite',
    icon: '🌟',
    description: 'Essential tools for rooted devices with minimal footprint.',
  },
  {
    name: 'Full',
    icon: '🛠️',
    description: 'Complete experience with Wi-Fi injection and HID attacks.',
  },
];

const Nethunter: React.FC = () => (
  <main className="p-4">
    <h1 className="text-2xl font-bold mb-4">Kali NetHunter</h1>
    <div className="grid gap-4 md:grid-cols-3">
      {editions.map(({ name, icon, description }) => (
        <div key={name} className="border rounded p-4 flex flex-col">
          <div className="flex items-center mb-2">
            <span className="text-2xl mr-2" aria-hidden>{icon}</span>
            <h2 className="text-xl font-semibold">{name}</h2>
          </div>
          <p className="mb-4">{description}</p>
        </div>
      ))}
    </div>
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
