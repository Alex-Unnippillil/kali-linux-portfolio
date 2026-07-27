import React from 'react';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/src/lib/i18n/detect';

interface Props {
  current: string;
  onChange: (lang: string) => void;
}

/**
 * Small language switcher chip. Shows supported languages and allows
 * switching back to the default locale.
 */
const LanguageChip: React.FC<Props> = ({ current, onChange }) => {
  return (
    <div className="flex items-center space-x-1">
      {SUPPORTED_LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className={`px-2 py-1 text-xs rounded-full border ${
            current === l ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
      {current !== DEFAULT_LOCALE && (
        <button
          onClick={() => onChange(DEFAULT_LOCALE)}
          className="px-2 py-1 text-xs rounded-full bg-gray-500 text-white"
        >
          RESET
        </button>
      )}
    </div>
  );
};

export default LanguageChip;
