export type MessageValue = string | MessageDictionary;
export interface MessageDictionary {
  [key: string]: MessageValue;
}

export const MESSAGES: Record<string, MessageDictionary> = {
  en: {
    settings: {
      tabs: {
        appearance: 'Appearance',
        accessibility: 'Accessibility',
        privacy: 'Privacy',
      },
      language: {
        label: 'Language',
        ariaLabel: 'Language selection',
        instructions: 'Choose the language for your desktop.',
        detectedBadge: 'Suggested',
        currentBadge: 'Current',
        detectedMessage: 'Suggested for you: {locale}',
        select: 'Select {locale}',
      },
    },
  },
  es: {
    settings: {
      tabs: {
        appearance: 'Apariencia',
        accessibility: 'Accesibilidad',
        privacy: 'Privacidad',
      },
      language: {
        label: 'Idioma',
        ariaLabel: 'Selección de idioma',
        instructions: 'Elige el idioma de tu escritorio.',
        detectedBadge: 'Sugerido',
        currentBadge: 'Actual',
        detectedMessage: 'Sugerido para ti: {locale}',
        select: 'Selecciona {locale}',
      },
    },
  },
  fr: {
    settings: {
      tabs: {
        appearance: 'Apparence',
        accessibility: 'Accessibilité',
        privacy: 'Confidentialité',
      },
      language: {
        label: 'Langue',
        ariaLabel: 'Sélection de la langue',
        instructions: 'Choisissez la langue de votre bureau.',
        detectedBadge: 'Suggéré',
        currentBadge: 'Actuel',
        detectedMessage: 'Suggéré pour vous : {locale}',
        select: 'Sélectionner {locale}',
      },
    },
  },
};
