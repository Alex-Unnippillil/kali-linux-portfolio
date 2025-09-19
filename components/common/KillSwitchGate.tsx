'use client';

import Link from 'next/link';
import { useEffect, useRef, type ReactNode } from 'react';
import { logKillSwitchActivation } from '../../lib/logger';
import { useKillSwitch } from '../../hooks/useFlags';

interface KillSwitchGateProps {
  appId: string;
  appTitle: string;
  killSwitchId?: string;
  children: () => ReactNode;
}

const DEFAULT_REASON =
  'This simulation is temporarily unavailable while safety reviews complete.';

export default function KillSwitchGate({
  appId,
  appTitle,
  killSwitchId,
  children,
}: KillSwitchGateProps) {
  const info = useKillSwitch(killSwitchId);
  const killSwitchActive = Boolean(killSwitchId && info.active);
  const loggedRef = useRef(false);

  useEffect(() => {
    if (!killSwitchActive || loggedRef.current) return;
    logKillSwitchActivation({
      appId,
      appTitle,
      killSwitchId: killSwitchId!,
      reason: info.reason,
    });
    loggedRef.current = true;
  }, [appId, appTitle, info.reason, killSwitchActive, killSwitchId]);

  if (!killSwitchActive) {
    return <>{children()}</>;
  }

  return (
    <div className="flex h-full flex-col items-center justify-center bg-ub-cool-grey p-6 text-center text-white">
      <div className="max-w-md space-y-4">
        <h2 className="text-xl font-semibold">{appTitle} is temporarily disabled</h2>
        <p className="text-sm text-gray-200">{info.reason ?? DEFAULT_REASON}</p>
        {info.docLink ? (
          <Link
            href={info.docLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded bg-ub-orange px-4 py-2 text-sm font-medium text-black transition hover:bg-orange-300 focus:outline-none focus:ring-2 focus:ring-ub-orange focus:ring-offset-2"
          >
            View incident log
          </Link>
        ) : null}
      </div>
    </div>
  );
}
