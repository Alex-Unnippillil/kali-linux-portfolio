import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resource Monitor',
  description:
    'Monitor task durations, memory usage, FPS and network metrics via the Performance API.',
};

export { default, displayResourceMonitor } from '../../components/apps/resource_monitor';
