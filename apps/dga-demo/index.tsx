import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DGA Demo',
  description: 'Generate domains using common DGA algorithms',
};

export { default, displayDgaDemo } from '../../components/apps/dga-demo';
