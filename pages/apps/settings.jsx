import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const SettingsApp = dynamic(() => import('../../apps/settings'), { ssr: false });

const PRIMARY_STATE_KEYS = ['settingsPath', 'settingsSegments', 'pathSegments', 'segments'];
const NESTED_STATE_KEYS = [...PRIMARY_STATE_KEYS, 'path'];

const readSegments = (value) => {
  if (typeof value === 'string') {
    const segments = value
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean);
    return segments.length ? segments : undefined;
  }

  if (Array.isArray(value)) {
    const segments = value.flatMap((segment) => {
      if (typeof segment !== 'string') return [];
      return segment
        .split('/')
        .map((part) => part.trim())
        .filter(Boolean);
    });
    return segments.length ? segments : undefined;
  }

  return undefined;
};

const extractPathSegments = (state) => {
  if (!state || typeof state !== 'object') {
    return undefined;
  }

  const containers = [state];
  if (state.state && typeof state.state === 'object') {
    containers.push(state.state);
  }

  for (const container of containers) {
    if (!container || typeof container !== 'object') continue;

    for (const key of PRIMARY_STATE_KEYS) {
      const segments = readSegments(container[key]);
      if (segments) return segments;
    }

    const nested = container.settings;
    if (nested && typeof nested === 'object') {
      for (const key of NESTED_STATE_KEYS) {
        const segments = readSegments(nested[key]);
        if (segments) return segments;
      }
    }
  }

  return undefined;
};

export default function SettingsPage() {
  const [pathSegments, setPathSegments] = useState();

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const updateFromState = () => {
      const segments = extractPathSegments(window.history?.state);
      setPathSegments(segments ?? []);
    };

    updateFromState();
    const handlePopState = () => updateFromState();

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return <SettingsApp initialPath={pathSegments} />;
}

