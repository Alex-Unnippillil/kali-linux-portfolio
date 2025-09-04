"use client";

import { useEffect, useState } from 'react';
import { Tour } from 'antd';

interface Step {
  title: string;
  description: string;
  target: () => HTMLElement | null;
}

export default function GuidedTour() {
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    const s: Step[] = [
      {
        title: 'Settings',
        description: 'Adjust theme, sound, and more in Quick Settings.',
        target: () => document.getElementById('status-bar'),
      },
      {
        title: 'Help',
        description: 'Access documentation or replay this tour.',
        target: () => document.getElementById('help-button'),
      },
      {
        title: 'Sample Data',
        description: 'Load example data for hands-on practice.',
        target: () => document.getElementById('load-sample'),
      },
    ].filter((step) => step.target());
    setSteps(s);
  }, []);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('replay-tour', handler as EventListener);
    try {
      const seen = localStorage.getItem('tour-seen');
      if (!seen) {
        setOpen(true);
        localStorage.setItem('tour-seen', 'true');
      }
    } catch {
      // ignore storage errors
    }
    return () => {
      window.removeEventListener('replay-tour', handler as EventListener);
    };
  }, []);

  return <Tour open={open} onClose={() => setOpen(false)} steps={steps} />;
}

