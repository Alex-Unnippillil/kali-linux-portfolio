import React, { useState } from 'react';
import LanguageChip from '@/components/terms/LanguageChip';
import { detectLanguage, DEFAULT_LOCALE } from '@/src/lib/i18n/detect';

// Demo term data with synonyms/aliases translated while the definition
// stays in the default locale.
const TERM = {
  term: 'phishing',
  definition: 'A fraudulent attempt to obtain sensitive information.',
  synonyms: {
    en: ['phishing', 'spear phishing'],
    es: ['suplantación de identidad', 'phishing dirigido'],
    fr: ['hameçonnage', 'hameçonnage ciblé'],
  },
};

export default function ExampleTermPage() {
  const [lang, setLang] = useState(detectLanguage());
  const synonyms = TERM.synonyms[lang as keyof typeof TERM.synonyms] || TERM.synonyms[DEFAULT_LOCALE];

  return (
    <div className="p-4 space-y-4">
      <LanguageChip current={lang} onChange={setLang} />
      <h1 className="text-2xl font-bold">{TERM.term}</h1>
      {/* Definition intentionally remains untranslated */}
      <p>{TERM.definition}</p>
      <div>
        <h2 className="font-semibold">Synonyms</h2>
        <ul className="list-disc list-inside">
          {synonyms.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
