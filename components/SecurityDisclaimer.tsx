import React from 'react';

const SecurityDisclaimer: React.FC = () => (
  <div className="bg-yellow-200 text-black p-2 text-xs mb-2 rounded">
    <p>
      This demonstration uses only static, simulated data and performs no real network activity or exploits.
      For responsible and lawful use of security tools, see the{' '}
      <a
        href="https://www.kali.org/docs/"
        target="_blank"
        rel="noreferrer"
        className="underline text-blue-700"
      >
        Kali documentation
      </a>
      .
    </p>
  </div>
);

export default SecurityDisclaimer;
