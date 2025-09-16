"use client";

import { useCallback } from "react";
import { useSettings } from "../../../hooks/useSettings";
import { LOCALE_OPTIONS, type LocaleCode } from "../../../i18n";
import LocaleOptionCard from "./LocaleOptionCard";

const SAMPLE_DATE = new Date(Date.UTC(2024, 6, 15, 13, 45));
const SAMPLE_NUMBER = 1234567.89;

export default function LanguageSettings() {
  const { locale, setLocale } = useSettings();

  const handleSelect = useCallback(
    (code: LocaleCode) => {
      setLocale(code);
    },
    [setLocale],
  );

  return (
    <div className="px-4 py-6 space-y-6">
      <header className="max-w-3xl mx-auto text-center md:text-left">
        <h2 className="text-2xl font-semibold text-white">Language &amp; Region</h2>
        <p className="mt-2 text-ubt-grey">
          Choose how the desktop labels, routes, and formats content. Your selection updates navigation
          immediately and is remembered across sessions.
        </p>
      </header>
      <div
        role="radiogroup"
        aria-label="Available locales"
        className="grid gap-4 md:grid-cols-2"
      >
        {LOCALE_OPTIONS.map((option) => (
          <LocaleOptionCard
            key={option.code}
            option={option}
            active={locale === option.code}
            onSelect={() => handleSelect(option.code)}
            sampleDate={SAMPLE_DATE}
            sampleNumber={SAMPLE_NUMBER}
          />
        ))}
      </div>
      <p className="text-sm text-ubt-grey text-center md:text-left">
        Tip: The address bar will include the active locale so sharing links keeps your preferred language.
      </p>
    </div>
  );
}
