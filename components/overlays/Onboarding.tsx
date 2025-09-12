import { useEffect, useState } from 'react';
import Tour, { type TourStepProps } from '@rc-component/tour';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';

const STORAGE_KEY = 'onboarding-complete';

const steps: TourStepProps[] = [
  {
    title: 'Dock',
    description: 'Your favorite apps live here.',
    target: () => document.querySelector('nav[aria-label="Dock"]') as HTMLElement,
  },
  {
    title: 'Launcher',
    description: 'Open the app launcher to explore all applications.',
    target: () =>
      document.querySelector('nav[aria-label="Dock"] img[alt="Ubuntu view app"]') as HTMLElement,
  },
  {
    title: 'Terminal',
    description: 'Access the Terminal from the dock.',
    target: () =>
      document.querySelector('nav[aria-label="Dock"] [aria-label="Terminal"]') as HTMLElement,
  },
];

export default function Onboarding() {
  const [open, setOpen] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, []);

  const handleFinish = () => {
    setOpen(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, '1');
    }
  };

  if (!open) return null;

  return (
    <Tour
      open={open}
      onClose={handleFinish}
      onFinish={handleFinish}
      steps={steps}
      mask
      animated={!prefersReducedMotion}
    />
  );
}

