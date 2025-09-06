import React from 'react';
import WarningBanner from '../WarningBanner';

export default function AptSourcesHelp() {
  return (
    <div className="space-y-2 text-sm">
      <p>
        Add the official Kali repository to{' '}
        <code>/etc/apt/sources.list</code>:
      </p>
      <pre className="bg-gray-800 text-green-400 p-2 rounded font-mono overflow-x-auto">
        deb http://http.kali.org/kali kali-rolling main contrib non-free non-free-firmware
      </pre>
      <WarningBanner>
        Adding unofficial, Debian, or third-party repositories can break your
        system or introduce security risks. Only use official Kali Linux
        sources.
      </WarningBanner>
    </div>
  );
}

