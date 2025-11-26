'use client';

import { useEffect } from 'react';

const KaliDesktop: React.FC = () => {
  useEffect(() => {
    const launch = async () => {
      try {
        const res = await fetch('/api/kasm/launch');
        const data = await res.json();
        if (data?.url) {
          window.location.href = data.url;
        }
      } catch {
        // ignore errors
      }
    };
    launch();
  }, []);

  return (
    <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
      Launching Kali Desktop...
    </div>
  );
};

export default KaliDesktop;

