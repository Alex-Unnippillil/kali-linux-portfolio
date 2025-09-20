import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/settings');

const SettingsApp = dynamic(() => import('../../apps/settings'), { ssr: false });

export default function SettingsPage() {
  return <SettingsApp />;
}

