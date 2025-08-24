import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Apps',
  description: 'Browse and launch available applications',
};

export { default, displayAllApps } from '../../components/apps/all-apps';
