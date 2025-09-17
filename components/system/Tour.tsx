'use client';

import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

export type TourMode = 'fast' | 'detailed';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  duration: number;
  tip?: string;
}

export const TOUR_PRESETS: Record<TourMode, TourStep[]> = {
  fast: [
    {
      id: 'desktop-overview',
      title: 'Desktop overview',
      description:
        'Get oriented with the Kali-inspired desktop. Use the dock for favourites and right-click anywhere to access desktop actions.',
      duration: 4500,
      tip: 'Drag apps from the launcher into the dock for one-click access.',
    },
    {
      id: 'window-control',
      title: 'Window control essentials',
      description:
        'Open any tool and try the window controls. You can drag, snap, or pop out windows with built-in Picture-in-Picture support.',
      duration: 4500,
    },
    {
      id: 'explore-apps',
      title: 'Explore the tool catalog',
      description:
        'Launch the application grid to browse cybersecurity simulations, utilities, and retro games. Search to filter instantly.',
      duration: 4500,
      tip: 'Press the Super key or click the menu button to open the launcher.',
    },
  ],
  detailed: [
    {
      id: 'desktop-dock',
      title: 'Desktop, dock, and context menus',
      description:
        'The dock keeps pinned tools within reach while the top bar lists workspaces and status icons. Right-click the desktop for quick settings and backgrounds.',
      duration: 8000,
      tip: 'Use the workspace switcher on the top bar to juggle focused tasks.',
    },
    {
      id: 'launcher-search',
      title: 'Launcher & global search',
      description:
        'Open the launcher from the panel or with the Super key. Browse curated categories, search across security labs, and star favourites for faster access.',
      duration: 8000,
    },
    {
      id: 'window-management',
      title: 'Window management & layouts',
      description:
        'Every app window supports snapping, tiling, and picture-in-picture. Drag to screen edges for snap previews or use the keyboard shortcuts overlay for focus control.',
      duration: 8000,
      tip: 'Press ? to view the full shortcut overlay and discover advanced moves.',
    },
    {
      id: 'notifications-quick-settings',
      title: 'Notifications & quick settings',
      description:
        'Check the notification center for recent activity, then open quick settings to toggle lab modes, network helpers, and accessibility preferences.',
      duration: 8000,
    },
    {
      id: 'deep-dives',
      title: 'Deep dives & labs',
      description:
        'Dive into guided simulations like Nmap NSE, Metasploit, and forensic workflows. Each lab documents commands, expected output, and safety disclaimers.',
      duration: 8000,
      tip: 'Detailed lab notes appear in the right rail—keep them open while experimenting.',
    },
  ],
};

const STORAGE_KEY = 'system-tour.mode';
const DEFAULT_MODE: TourMode = 'detailed';

const getInitialMode = (): TourMode => {
  if (typeof window === 'undefined') {
    return DEFAULT_MODE;
  }
  const stored = window.sessionStorage.getItem(STORAGE_KEY);
  if (stored === 'fast' || stored === 'detailed') {
    return stored;
  }
  return DEFAULT_MODE;
};

const Tour: React.FC = () => {
  const [mode, setMode] = useState<TourMode>(getInitialMode);
  const [currentStep, setCurrentStep] = useState(0);
  const timerRef = useRef<number | null>(null);

  const steps = TOUR_PRESETS[mode];
  const activeStep = steps[currentStep];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(STORAGE_KEY, mode);
    }
  }, [mode]);

  useEffect(() => {
    setCurrentStep(0);
  }, [mode]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const step = steps[currentStep];
    if (!step) {
      return undefined;
    }
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setCurrentStep((prev) => {
        const next = prev + 1;
        return next >= steps.length ? 0 : next;
      });
    }, step.duration);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentStep, steps]);

  const handleModeChange = (nextMode: TourMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
  };

  const handleDotClick = (index: number) => {
    if (index === currentStep) return;
    if (index < 0 || index >= steps.length) return;
    setCurrentStep(index);
  };

  if (!activeStep) {
    return null;
  }

  return (
    <section className="w-full rounded-lg border border-slate-700 bg-slate-950/70 text-slate-100 shadow-xl backdrop-blur">
      <header className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">System Tour</h2>
          <p className="text-xs text-slate-300">
            Choose a pace and follow along as we highlight the desktop features.
          </p>
        </div>
        <div
          role="group"
          aria-label="Tour pace"
          className="inline-flex items-center rounded-full bg-slate-900 p-1 text-xs font-medium shadow-inner"
        >
          <button
            type="button"
            onClick={() => handleModeChange('fast')}
            className={clsx(
              'rounded-full px-3 py-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400',
              mode === 'fast'
                ? 'bg-emerald-400 text-slate-950 shadow'
                : 'text-slate-200 hover:text-white'
            )}
            aria-pressed={mode === 'fast'}
          >
            Fast
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('detailed')}
            className={clsx(
              'rounded-full px-3 py-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400',
              mode === 'detailed'
                ? 'bg-emerald-400 text-slate-950 shadow'
                : 'text-slate-200 hover:text-white'
            )}
            aria-pressed={mode === 'detailed'}
          >
            Detailed
          </button>
        </div>
      </header>
      <div className="px-5 py-6" aria-live="polite">
        <p className="text-xs uppercase tracking-wider text-emerald-300">
          Step {currentStep + 1} of {steps.length} · {Math.round(activeStep.duration / 1000)}s per step
        </p>
        <h3 className="mt-2 text-xl font-semibold text-slate-50">{activeStep.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-200">{activeStep.description}</p>
        {activeStep.tip ? (
          <p className="mt-3 rounded bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
            {activeStep.tip}
          </p>
        ) : null}
      </div>
      <footer className="flex flex-col gap-4 border-t border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-slate-400">Progress</span>
        <div className="flex items-center gap-2">
          {steps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => handleDotClick(index)}
              className={clsx(
                'h-2.5 rounded-full transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400',
                index === currentStep
                  ? 'w-6 bg-emerald-400'
                  : 'w-2.5 bg-slate-600 hover:bg-slate-500'
              )}
              aria-label={`Go to step ${index + 1}: ${step.title}`}
              aria-current={index === currentStep ? 'step' : undefined}
            >
              <span className="sr-only">
                {index === currentStep ? 'Current step' : 'Inactive step'} {index + 1}
              </span>
            </button>
          ))}
        </div>
      </footer>
    </section>
  );
};

export default Tour;
