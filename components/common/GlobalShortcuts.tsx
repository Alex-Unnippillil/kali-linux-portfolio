'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import useKeymap from '../../apps/settings/keymapRegistry';
import formatKeyboardEvent from '../../utils/formatKeyboardEvent';

const GlobalShortcuts: React.FC = () => {
  const { shortcuts } = useKeymap();
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        (target as HTMLElement).isContentEditable
      ) {
        return;
      }
      const openSettings =
        shortcuts.find((s) => s.description === 'Open settings')?.keys || 'Ctrl+,';
      if (formatKeyboardEvent(e) === openSettings) {
        e.preventDefault();
        router.push('/settings');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts, router]);

  return null;
};

export default GlobalShortcuts;
