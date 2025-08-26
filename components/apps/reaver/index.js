import React from 'react';

export default function ReaverApp() {
  return (
    <div className="h-full w-full p-4 bg-ub-cool-grey text-white overflow-auto">
      <h2 className="text-lg mb-4">Reaver WPS PIN Attack</h2>
      <div className="flex justify-center mb-4">
        <img
          src="/images/reaver-diagram.svg"
          alt="Diagram of Reaver attacking a WPS-enabled router"
          className="max-w-full"
        />
      </div>
      <p className="mb-4">
        Reaver implements a brute force attack against Wi-Fi Protected Setup (WPS) PINs to recover WPA/WPA2 passphrases. Learn more on{' '}
        <a
          href="https://www.kali.org/tools/reaver/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 underline"
        >
          the official site
        </a>
        .
      </p>
    </div>
  );
}
