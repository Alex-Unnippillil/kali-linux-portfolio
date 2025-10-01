"use client";

import { useMemo } from 'react';
import { getLocaleLabel } from '../../utils/i18nConfig';
import { useI18n } from '../../hooks/useI18n';
import { useSettings } from '../../hooks/useSettings';

const badgeClass =
  'rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide';

const LanguageSwitcher = () => {
  const { locale, setLocale } = useSettings();
  const { detectedLocale, t, availableLocales } = useI18n();

  const detectedLabel = useMemo(
    () => getLocaleLabel(detectedLocale),
    [detectedLocale],
  );

  return (
    <fieldset className="w-full max-w-xl rounded-lg border border-[#1b2638] bg-[#0f1724]/60 p-4 text-ubt-grey shadow-lg">
      <legend className="px-2 text-xs font-semibold uppercase tracking-[0.2em] text-ubt-green">
        {t('settings.language.label')}
      </legend>
      <p className="text-sm text-ubt-grey/80">
        {t('settings.language.instructions')}
      </p>
      <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-ubt-green/80">
        {t('settings.language.detectedMessage', {
          values: { locale: detectedLabel },
        })}
      </p>
      <div
        role="radiogroup"
        aria-label={t('settings.language.ariaLabel')}
        className="mt-4 grid gap-3 sm:grid-cols-2"
      >
        {availableLocales.map((item) => {
          const isActive = item.code === locale;
          const isDetected = item.code === detectedLocale;
          return (
            <label
              key={item.code}
              className={`flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 text-sm transition focus-within:outline-none focus-within:ring-2 focus-within:ring-ubt-green/70 ${
                isActive
                  ? 'border-ubt-green/70 bg-ubt-green/10'
                  : 'border-white/10 bg-white/[0.03] hover:border-ubt-green/40'
              }`}
            >
              <span className="flex flex-col text-white">
                <span className="font-medium">{item.nativeLabel || item.label}</span>
                {item.nativeLabel && item.nativeLabel !== item.label && (
                  <span className="text-xs text-ubt-grey/70">{item.label}</span>
                )}
              </span>
              <span className="flex items-center gap-2">
                {isDetected && (
                  <span className={`${badgeClass} text-ubt-green/80`}>
                    {t('settings.language.detectedBadge')}
                  </span>
                )}
                {isActive && (
                  <span className={`${badgeClass} text-[#7db3ff]`}>
                    {t('settings.language.currentBadge')}
                  </span>
                )}
                <input
                  type="radio"
                  name="language"
                  value={item.code}
                  checked={isActive}
                  onChange={() => setLocale(item.code)}
                  className="h-4 w-4 accent-[#1793d1]"
                  aria-label={t('settings.language.select', {
                    values: { locale: item.nativeLabel || item.label },
                  })}
                />
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};

export default LanguageSwitcher;
