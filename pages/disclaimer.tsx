import React from 'react';

const DisclaimerPage: React.FC = () => (
  <div className="p-8 max-w-3xl mx-auto">
    <h1 className="text-2xl font-bold mb-6">Disclaimer</h1>
    <p className="mb-4">
      This site is a personal portfolio that imitates the look of Kali Linux. It is
      not an official Kali project and is not endorsed by Kali Linux, Offensive
      Security, or any related organization.
    </p>
    <p>
      For authoritative information, visit the{' '}
      <a
        href="https://www.kali.org/docs/policy/official-kali-linux-properties/"
        className="text-blue-500 underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        official Kali Linux sites list
      </a>.
    </p>
  </div>
);

export default DisclaimerPage;
