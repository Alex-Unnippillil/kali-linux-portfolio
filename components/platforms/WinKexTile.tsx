import React from 'react';

interface WinKexTileProps {
  className?: string;
}

const features = [
  'Full Kali desktop in a window',
  'Seamless integration on Windows',
  'Enhanced session with RDP'
];

export default function WinKexTile({ className = '' }: WinKexTileProps) {
  return (
    <div className={`border rounded p-4 flex flex-col ${className}`}>
      <h3 className="font-semibold mb-2">Win-KeX</h3>
      <ul className="list-disc list-inside text-sm space-y-1 mb-4">
        {features.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <a
        href="https://www.kali.org/docs/wsl/win-kex/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:underline mt-auto"
      >
        Win-KeX documentation
      </a>
    </div>
  );
}
