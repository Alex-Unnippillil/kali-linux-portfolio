"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect, useCallback } from 'react';
import { useSettings } from '../../hooks/useSettings';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const {
    proxyEnabled,
    proxyCheckInProgress,
    proxyError,
    activeProxy,
    setProxyEnabled,
  } = useSettings();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  const toggleProxy = useCallback(() => {
    const next = !proxyEnabled;
    const confirmationMessage = next
      ? `Enable ${activeProxy.label}?
All simulated network requests will route through this proxy profile.`
      : 'Disable the system proxy and return to a direct connection?';
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(confirmationMessage);
      if (!confirmed) return;
    }
    setProxyEnabled(next);
  }, [activeProxy.label, proxyEnabled, setProxyEnabled]);

  return (
    <div
      className={`absolute bg-ub-cool-grey rounded-md py-4 top-9 right-3 shadow border-black border border-opacity-20 ${
        open ? '' : 'hidden'
      }`}
    >
      <div className="px-4 pb-2">
        <button
          className="w-full flex justify-between"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          <span>Theme</span>
          <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Sound</span>
        <input type="checkbox" checked={sound} onChange={() => setSound(!sound)} />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>System Proxy</span>
        <input
          type="checkbox"
          checked={proxyEnabled}
          onChange={toggleProxy}
          disabled={proxyCheckInProgress}
        />
      </div>
      <div className="px-4 pb-2 text-xs text-ubt-grey">
        {proxyCheckInProgress
          ? 'Checking connectivity…'
          : proxyEnabled
          ? `${activeProxy.label} active`
          : 'Direct connection'}
        {proxyError && <div className="text-red-400 mt-1">{proxyError}</div>}
      </div>
      <div className="px-4 flex justify-between">
        <span>Reduced motion</span>
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
        />
      </div>
    </div>
  );
};

export default QuickSettings;
