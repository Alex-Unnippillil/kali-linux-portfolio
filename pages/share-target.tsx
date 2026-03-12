"use client";

import { useRouter } from 'next/router';
import { useEffect } from 'react';

function getFirstParamValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value.length ? String(value[0]) : null;
  }
  if (typeof value === 'string') {
    return value;
  }
  return null;
}

export default function ShareTarget() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    const params = new URLSearchParams();

    (['title', 'text', 'url'] as const).forEach((key) => {
      const rawValue = getFirstParamValue(router.query[key]);
      if (rawValue) {
        const trimmed = rawValue.trim();
        if (trimmed) {
          params.set(key, trimmed);
        }
      }
    });

    const queryString = params.toString();
    const target = queryString
      ? `/apps/sticky_notes?${queryString}`
      : '/apps/sticky_notes';

    router.replace(target);
  }, [router]);

  return <p>Loading...</p>;
}
