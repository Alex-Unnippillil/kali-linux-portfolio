"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useSettings } from '../../hooks/useSettings';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const { allowNetwork, setAllowNetwork } = useSettings();

  useEffect(() => {
    if (allowNetwork !== online) {
      setOnline(allowNetwork);
    }
  }, [allowNetwork, online, setOnline]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  return (
    <div
      className={`absolute bg-ub-cool-grey rounded-md py-4 top-9 right-3 shadow border-black border border-opacity-20 ${
        open ? '' : 'hidden'
      }`}
    >
      <div className="px-4 pb-3 border-b border-black border-opacity-20">
        <div className="flex items-center gap-3">
          {(() => {
            const status = !online ? 'offline' : allowNetwork ? 'connected' : 'blocked';
            const statusIcon =
              status === 'offline'
                ? '/themes/Yaru/status/network-wireless-signal-none-symbolic.svg'
                : '/themes/Yaru/status/network-wireless-signal-good-symbolic.svg';
            const iconClass =
              status === 'connected'
                ? 'flex h-10 w-10 items-center justify-center rounded-full border bg-white/5'
                : status === 'blocked'
                  ? 'flex h-10 w-10 items-center justify-center rounded-full border border-amber-400/60 bg-amber-400/10 text-amber-400'
                  : 'flex h-10 w-10 items-center justify-center rounded-full border border-red-400/60 bg-red-500/10 text-red-400';
            const iconStyle =
              status === 'connected'
                ? { color: 'var(--color-accent)', borderColor: 'var(--color-accent)' }
                : undefined;
            const badgeBase =
              'rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide shadow-sm';
            const { badgeLabel, badgeClass, badgeStyle } =
              status === 'connected'
                ? {
                    badgeLabel: 'Connected',
                    badgeClass: badgeBase,
                    badgeStyle: {
                      backgroundColor: 'var(--color-accent)',
                      color: '#05070b',
                    } as CSSProperties,
                  }
                : status === 'blocked'
                  ? {
                      badgeLabel: 'Blocked',
                      badgeClass: `${badgeBase} bg-amber-400 text-black`,
                      badgeStyle: undefined,
                    }
                  : {
                      badgeLabel: 'Offline',
                      badgeClass: `${badgeBase} bg-red-500 text-white`,
                      badgeStyle: undefined,
                    };
            const statusMessage =
              status === 'connected'
                ? 'Signal strength: Good'
                : status === 'blocked'
                  ? 'Requests blocked by firewall'
                  : 'Offline mode active';
            const ssid = online ? 'KaliNet (demo)' : '—';
            const ip =
              status === 'connected'
                ? '10.0.0.42'
                : online
                  ? '10.0.0.42 (blocked)'
                  : '—';

            return (
              <>
                <span className={iconClass} style={iconStyle}>
                  <img src={statusIcon} alt="" className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">Wi-Fi</p>
                    <span className={badgeClass} style={badgeStyle}>
                      {badgeLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ubt-grey text-opacity-80">{statusMessage}</p>
                  <dl className="mt-2 space-y-1 text-xs text-ubt-grey">
                    <div className="flex justify-between">
                      <dt className="uppercase tracking-wide text-[0.65rem] text-ubt-grey text-opacity-70">SSID</dt>
                      <dd className="font-medium text-ubt-grey">{ssid}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="uppercase tracking-wide text-[0.65rem] text-ubt-grey text-opacity-70">IP</dt>
                      <dd className="font-medium text-ubt-grey">{ip}</dd>
                    </div>
                  </dl>
                </div>
              </>
            );
          })()}
        </div>
      </div>
      <div className="px-4 pb-2 pt-2">
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
        <span>Network</span>
        <input
          type="checkbox"
          checked={online}
          onChange={() => {
            const next = !online;
            setOnline(next);
            setAllowNetwork(next);
          }}
        />
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
