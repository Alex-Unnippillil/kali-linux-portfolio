"use client";

import { useId } from 'react';
import Modal from '../base/Modal';

interface InstallPromptProps {
  open: boolean;
  onClose: () => void;
  onInstall: () => void;
}

const steps = [
  {
    title: 'Start the install flow',
    description: 'Select Install to ask your browser for the Add to Home Screen prompt.',
  },
  {
    title: 'Confirm in the browser prompt',
    description: 'Approve the Add or Install action when your browser displays its confirmation.',
  },
  {
    title: 'Launch from your device',
    description: 'Find Kali Linux Portfolio in your app list or home screen once the install completes.',
  },
];

const InstallPrompt: React.FC<InstallPromptProps> = ({ open, onClose, onInstall }) => {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      className="fixed inset-0 z-[1200] flex items-end justify-center px-4 py-6 sm:items-center focus:outline-none"
      labelledBy={titleId}
      describedBy={descriptionId}
    >
      <div
        className="absolute inset-0 bg-black/60"
        aria-hidden="true"
        onClick={onClose}
        role="presentation"
      />
      <section
        role="document"
        className="relative z-10 w-full max-w-md rounded-lg border border-ubt-blue bg-ub-lite-abrgn p-5 text-ubt-grey shadow-2xl backdrop-blur-sm"
      >
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p id={descriptionId} className="text-xs uppercase tracking-wide text-ubt-warm-grey">
              Install the desktop for quick access on any device.
            </p>
            <h2 id={titleId} className="text-lg font-semibold text-white">
              Install Kali Linux Portfolio
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent text-ubt-warm-grey transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue"
            aria-label="Close install guide"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <ol className="mt-4 space-y-3 text-sm list-none" aria-label="Installation steps">
          {steps.map((step, index) => (
            <li key={step.title} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ubt-blue text-xs font-semibold text-ubt-grey">
                {index + 1}
              </span>
              <div className="space-y-1">
                <p className="font-medium text-white">{step.title}</p>
                <p className="text-xs text-ubt-warm-grey">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
          <a
            href="https://unnippillil.com/docs/getting-started"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-ubt-blue underline-offset-4 transition hover:text-white hover:underline focus-visible:text-white focus-visible:underline"
          >
            Learn more
          </a>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-transparent px-4 py-2 font-medium text-ubt-warm-grey transition hover:text-ubt-grey focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={onInstall}
              className="rounded-md bg-ubt-blue px-4 py-2 font-semibold text-ubt-grey shadow-md transition hover:bg-ubt-green hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue"
            >
              Install
            </button>
          </div>
        </footer>
      </section>
    </Modal>
  );
};

export default InstallPrompt;
