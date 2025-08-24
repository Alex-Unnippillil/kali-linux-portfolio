import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Timeline Builder',
  description: 'Build and explore event timelines from logs, CSV, or JSON files.',
};

export { default } from '../../components/apps/timeline-builder';
