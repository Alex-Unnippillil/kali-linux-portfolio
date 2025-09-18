"use client";

import { useState, useEffect } from 'react';

interface Props {
  children: React.ReactNode;
}

export default function LabMode({ children }: Props) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('lab-mode');
      if (stored === 'true') setEnabled(true);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    try {
      localStorage.setItem('lab-mode', String(next));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="w-full h-full">
      <div className="bg-ub-yellow text-black p-2 text-xs flex justify-between items-center" aria-label="training banner">
        <span>{enabled ? 'Lab Mode enabled: all actions are simulated.' : 'Lab Mode disabled: enable to use training features.'}</span>
        <button onClick={toggle} className="btn btn--success btn--dense" type="button">
          {enabled ? 'Disable' : 'Enable'}
        </button>
      </div>
      {enabled && <div className="h-full overflow-auto">{children}</div>}
    </div>
  );
}

