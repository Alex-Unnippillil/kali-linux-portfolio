'use client';

import { useTransition, type ChangeEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export type LanguageOption = {
  value: string;
  label?: string;
};

export interface LanguageSwitcherProps {
  locales: LanguageOption[];
  className?: string;
  label?: string;
}

export default function LanguageSwitcher({
  locales,
  className,
  label,
}: LanguageSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  if (!locales || locales.length === 0) {
    return null;
  }

  const accessibleLabel = label ?? 'Switch language';
  const segments = pathname.split('/').filter(Boolean);
  const potentialLocale = segments[0];
  const fallbackLocale = locales[0]?.value ?? '';
  const hasLocaleSegment = locales.some((option) => option.value === potentialLocale);
  const currentLocale = hasLocaleSegment ? potentialLocale : fallbackLocale;
  const pathWithoutLocale = hasLocaleSegment ? segments.slice(1) : segments;

  const handleLocaleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = event.target.value;

    if (!nextLocale || nextLocale === currentLocale) {
      return;
    }

    const cookieAttributes = [
      `NEXT_LOCALE=${encodeURIComponent(nextLocale)}`,
      'Path=/',
      `Max-Age=${ONE_YEAR_IN_SECONDS}`,
      'SameSite=Lax',
    ];

    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      cookieAttributes.push('Secure');
    }

    if (typeof document !== 'undefined') {
      document.cookie = cookieAttributes.join('; ');
    }

    const updatedSegments = [nextLocale, ...pathWithoutLocale];
    const nextPathname = `/${updatedSegments.filter(Boolean).join('/')}` || '/';
    const queryString = searchParams.toString();
    const target = queryString ? `${nextPathname}?${queryString}` : nextPathname;
    const hash = typeof window !== 'undefined' ? window.location.hash : '';

    startTransition(() => {
      router.push(hash ? `${target}${hash}` : target);
    });
  };

  return (
    <select
      className={className}
      value={currentLocale}
      onChange={handleLocaleChange}
      disabled={isPending}
      aria-label={accessibleLabel}
    >
      {locales.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label ?? option.value}
        </option>
      ))}
    </select>
  );
}
