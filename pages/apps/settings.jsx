import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';

const SettingsApp = dynamic(() => import('../../apps/settings'), { ssr: false });

const getQueryValue = (value) => {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
};

export default function SettingsPage() {
  const router = useRouter();
  const lastPayload = useRef('');

  useEffect(() => {
    if (!router.isReady || typeof window === 'undefined') return;
    const section = getQueryValue(router.query.section);
    const item = getQueryValue(router.query.item);
    const detail = {};
    if (section) detail.section = section;
    if (item) detail.item = item;
    if (Object.keys(detail).length === 0) {
      lastPayload.current = '';
      return;
    }
    const serialized = JSON.stringify(detail);
    if (serialized === lastPayload.current) return;
    lastPayload.current = serialized;
    window.dispatchEvent(new CustomEvent('settings-deeplink', { detail }));
  }, [router.isReady, router.query]);

  return <SettingsApp />;
}

