"use client";

import React from 'react';
import Tour from '@rc-component/tour';

const steps = [
  {
    title: 'Gestures',
    description:
      'Drag windows by the title bar. Right-click or long-press for context menus.',
    target: () => document.querySelector('.bg-ub-window-title') as HTMLElement | null,
  },
  {
    title: 'Snaps',
    description: 'Drag windows to screen edges to snap left, right, or top.',
    target: () => document.querySelector('.opened-window') as HTMLElement | null,
  },
  {
    title: 'Shortcuts',
    description: 'Click Help or press ? to view keyboard shortcuts.',
    target: () => document.getElementById('help-button'),
  },
  {
    title: 'Controls',
    description: 'Open Quick Settings from the status area.',
    target: () => document.getElementById('status-bar'),
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

const GuidedTour: React.FC<Props> = ({ open, onClose }) => {
  return <Tour open={open} onClose={onClose} steps={steps} />;
};

export default GuidedTour;
