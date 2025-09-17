'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

export interface SwitcherWindow {
  id: string;
  title: string;
  icon?: string | null;
}

interface SwitcherProps {
  windows?: SwitcherWindow[];
  onSelect?: (id: string) => void;
  onClose?: () => void;
}

interface AnnounceData {
  currentTitle?: string;
  nextTitle?: string;
  index: number;
  total: number;
  isSelected: boolean;
}

interface Formatters {
  number: (value: number) => string;
}

interface Translation {
  dialogLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  noWindows: string;
  noResults: string;
  announce: (data: AnnounceData, formatters: Formatters) => string;
}

const translations = {
  en: {
    dialogLabel: 'Window switcher',
    searchLabel: 'Filter windows',
    searchPlaceholder: 'Search windows',
    noWindows: 'No windows available',
    noResults: 'No windows match your search',
    announce: ({ currentTitle, nextTitle, index, total, isSelected }, { number }) => {
      if (!total) return 'No windows available';
      const parts: string[] = [];
      if (currentTitle) parts.push(currentTitle);
      parts.push(`window ${number(index + 1)} of ${number(total)}`);
      parts.push(isSelected ? 'selected' : 'not selected');
      if (nextTitle) parts.push(`Next: ${nextTitle}`);
      return `${parts.join('. ')}.`;
    },
  },
  es: {
    dialogLabel: 'Selector de ventanas',
    searchLabel: 'Filtrar ventanas',
    searchPlaceholder: 'Buscar ventanas',
    noWindows: 'No hay ventanas disponibles',
    noResults: 'No hay ventanas que coincidan con la búsqueda',
    announce: ({ currentTitle, nextTitle, index, total, isSelected }, { number }) => {
      if (!total) return 'No hay ventanas disponibles';
      const parts: string[] = [];
      if (currentTitle) parts.push(currentTitle);
      parts.push(`Ventana ${number(index + 1)} de ${number(total)}`);
      parts.push(isSelected ? 'Seleccionada' : 'No seleccionada');
      if (nextTitle) parts.push(`Siguiente: ${nextTitle}`);
      return `${parts.join('. ')}.`;
    },
  },
  fr: {
    dialogLabel: 'Sélecteur de fenêtres',
    searchLabel: 'Filtrer les fenêtres',
    searchPlaceholder: 'Rechercher des fenêtres',
    noWindows: 'Aucune fenêtre disponible',
    noResults: 'Aucune fenêtre ne correspond à votre recherche',
    announce: ({ currentTitle, nextTitle, index, total, isSelected }, { number }) => {
      if (!total) return 'Aucune fenêtre disponible';
      const parts: string[] = [];
      if (currentTitle) parts.push(currentTitle);
      parts.push(`Fenêtre ${number(index + 1)} sur ${number(total)}`);
      parts.push(isSelected ? 'Sélectionnée' : 'Non sélectionnée');
      if (nextTitle) parts.push(`Suivante : ${nextTitle}`);
      return `${parts.join('. ')}.`;
    },
  },
  de: {
    dialogLabel: 'Fensterumschalter',
    searchLabel: 'Fenster filtern',
    searchPlaceholder: 'Fenster suchen',
    noWindows: 'Keine Fenster verfügbar',
    noResults: 'Keine Fenster entsprechen der Suche',
    announce: ({ currentTitle, nextTitle, index, total, isSelected }, { number }) => {
      if (!total) return 'Keine Fenster verfügbar';
      const parts: string[] = [];
      if (currentTitle) parts.push(currentTitle);
      parts.push(`Fenster ${number(index + 1)} von ${number(total)}`);
      parts.push(isSelected ? 'Ausgewählt' : 'Nicht ausgewählt');
      if (nextTitle) parts.push(`Weiter: ${nextTitle}`);
      return `${parts.join('. ')}.`;
    },
  },
  pt: {
    dialogLabel: 'Seletor de janelas',
    searchLabel: 'Filtrar janelas',
    searchPlaceholder: 'Procurar janelas',
    noWindows: 'Nenhuma janela disponível',
    noResults: 'Nenhuma janela corresponde à pesquisa',
    announce: ({ currentTitle, nextTitle, index, total, isSelected }, { number }) => {
      if (!total) return 'Nenhuma janela disponível';
      const parts: string[] = [];
      if (currentTitle) parts.push(currentTitle);
      parts.push(`Janela ${number(index + 1)} de ${number(total)}`);
      parts.push(isSelected ? 'Selecionada' : 'Não selecionada');
      if (nextTitle) parts.push(`Próxima: ${nextTitle}`);
      return `${parts.join('. ')}.`;
    },
  },
  it: {
    dialogLabel: 'Selettore di finestre',
    searchLabel: 'Filtra finestre',
    searchPlaceholder: 'Cerca finestre',
    noWindows: 'Nessuna finestra disponibile',
    noResults: 'Nessuna finestra corrisponde alla ricerca',
    announce: ({ currentTitle, nextTitle, index, total, isSelected }, { number }) => {
      if (!total) return 'Nessuna finestra disponibile';
      const parts: string[] = [];
      if (currentTitle) parts.push(currentTitle);
      parts.push(`Finestra ${number(index + 1)} di ${number(total)}`);
      parts.push(isSelected ? 'Selezionata' : 'Non selezionata');
      if (nextTitle) parts.push(`Successiva: ${nextTitle}`);
      return `${parts.join('. ')}.`;
    },
  },
  ja: {
    dialogLabel: 'ウィンドウスイッチャー',
    searchLabel: 'ウィンドウを絞り込む',
    searchPlaceholder: 'ウィンドウを検索',
    noWindows: '利用可能なウィンドウはありません',
    noResults: '検索に一致するウィンドウはありません',
    announce: ({ currentTitle, nextTitle, index, total, isSelected }, { number }) => {
      if (!total) return '利用可能なウィンドウはありません';
      const parts: string[] = [];
      if (currentTitle) parts.push(currentTitle);
      parts.push(`全${number(total)}個中${number(index + 1)}番目のウィンドウ`);
      parts.push(isSelected ? '選択中' : '未選択');
      if (nextTitle) parts.push(`次: ${nextTitle}`);
      return `${parts.join('。')}。`;
    },
  },
  ko: {
    dialogLabel: '창 전환기',
    searchLabel: '창 필터',
    searchPlaceholder: '창 검색',
    noWindows: '사용 가능한 창이 없습니다',
    noResults: '검색과 일치하는 창이 없습니다',
    announce: ({ currentTitle, nextTitle, index, total, isSelected }, { number }) => {
      if (!total) return '사용 가능한 창이 없습니다';
      const parts: string[] = [];
      if (currentTitle) parts.push(currentTitle);
      parts.push(`전체 ${number(total)}개 중 ${number(index + 1)}번째 창`);
      parts.push(isSelected ? '선택됨' : '선택되지 않음');
      if (nextTitle) parts.push(`다음: ${nextTitle}`);
      return `${parts.join('. ')}.`;
    },
  },
  'zh-Hans': {
    dialogLabel: '窗口切换器',
    searchLabel: '筛选窗口',
    searchPlaceholder: '搜索窗口',
    noWindows: '没有可用窗口',
    noResults: '没有符合搜索条件的窗口',
    announce: ({ currentTitle, nextTitle, index, total, isSelected }, { number }) => {
      if (!total) return '没有可用窗口';
      const parts: string[] = [];
      if (currentTitle) parts.push(currentTitle);
      parts.push(`第 ${number(index + 1)}/${number(total)} 个窗口`);
      parts.push(isSelected ? '已选中' : '未选中');
      if (nextTitle) parts.push(`下一个：${nextTitle}`);
      return `${parts.join('。')}。`;
    },
  },
  'zh-Hant': {
    dialogLabel: '視窗切換器',
    searchLabel: '篩選視窗',
    searchPlaceholder: '搜尋視窗',
    noWindows: '沒有可用的視窗',
    noResults: '沒有符合搜尋條件的視窗',
    announce: ({ currentTitle, nextTitle, index, total, isSelected }, { number }) => {
      if (!total) return '沒有可用的視窗';
      const parts: string[] = [];
      if (currentTitle) parts.push(currentTitle);
      parts.push(`第 ${number(index + 1)}/${number(total)} 個視窗`);
      parts.push(isSelected ? '已選取' : '未選取');
      if (nextTitle) parts.push(`下一個：${nextTitle}`);
      return `${parts.join('。')}。`;
    },
  },
} satisfies Record<string, Translation>;

type LocaleKey = keyof typeof translations;

const FALLBACK_LOCALE: LocaleKey = 'en';

const localeAliases: Record<string, LocaleKey> = {
  'en-us': 'en',
  'en-gb': 'en',
  'en-au': 'en',
  'en-ca': 'en',
  'es-es': 'es',
  'es-mx': 'es',
  'es-419': 'es',
  'fr-fr': 'fr',
  'fr-ca': 'fr',
  'de-de': 'de',
  'de-at': 'de',
  'de-ch': 'de',
  'pt-br': 'pt',
  'pt-pt': 'pt',
  'it-it': 'it',
  'ja-jp': 'ja',
  'ko-kr': 'ko',
  'zh-cn': 'zh-Hans',
  'zh-sg': 'zh-Hans',
  'zh-hans': 'zh-Hans',
  'zh-tw': 'zh-Hant',
  'zh-hk': 'zh-Hant',
  'zh-mo': 'zh-Hant',
  'zh-hant': 'zh-Hant',
};

const getLocaleKey = (locale?: string): LocaleKey => {
  if (!locale) return FALLBACK_LOCALE;
  const lower = locale.toLowerCase();
  if (lower in localeAliases) {
    return localeAliases[lower];
  }

  const locales = Object.keys(translations) as LocaleKey[];
  const exact = locales.find((key) => key.toLowerCase() === lower);
  if (exact) return exact;

  const base = lower.split('-')[0];
  const baseMatch = locales.find((key) => key.split('-')[0].toLowerCase() === base);
  return baseMatch ?? FALLBACK_LOCALE;
};

const Switcher = ({ windows = [], onSelect, onClose }: SwitcherProps) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [locale, setLocale] = useState<LocaleKey>(FALLBACK_LOCALE);
  const [liveMessage, setLiveMessage] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const timeoutRef = useRef<number>();
  const listboxId = useId();

  const translation = translations[locale];

  const formatters = useMemo<Formatters>(() => {
    const resolvedLocale =
      locale === 'zh-Hans' ? 'zh-CN' : locale === 'zh-Hant' ? 'zh-TW' : locale;
    const numberFormat = new Intl.NumberFormat(resolvedLocale);
    return {
      number: (value: number) => numberFormat.format(value),
    };
  }, [locale]);

  const filtered = useMemo(() => {
    if (!query) return windows;
    const normalized = query.toLowerCase();
    return windows.filter((w) => w.title.toLowerCase().includes(normalized));
  }, [windows, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const languages = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language];
    const resolved = languages.map(getLocaleKey).find(Boolean) ?? FALLBACK_LOCALE;
    setLocale(resolved);
  }, []);

  useEffect(() => {
    if (!filtered.length) {
      setSelected(0);
      return;
    }
    setSelected((current) => Math.min(current, filtered.length - 1));
  }, [filtered.length]);

  useEffect(() => {
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Alt') {
        const current = filtered[selected];
        if (current && onSelect) {
          onSelect(current.id);
        } else if (!current && onClose) {
          onClose();
        }
      }
    };

    window.addEventListener('keyup', handleKeyUp);
    return () => window.removeEventListener('keyup', handleKeyUp);
  }, [filtered, selected, onSelect, onClose]);

  useEffect(() => {
    const current = filtered[selected];
    const next = filtered.length > 1 ? filtered[(selected + 1) % filtered.length] : undefined;
    const message = filtered.length
      ? translation.announce(
          {
            currentTitle: current?.title,
            nextTitle: next && next.id !== current?.id ? next.title : undefined,
            index: selected,
            total: filtered.length,
            isSelected: Boolean(current),
          },
          formatters,
        )
      : query
        ? translation.noResults
        : translation.noWindows;

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    setLiveMessage('');
    timeoutRef.current = window.setTimeout(() => {
      setLiveMessage(message);
    }, 50);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [filtered, selected, formatters, translation, query]);

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    setSelected(0);
  }, []);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (!filtered.length) {
        if (event.key === 'Escape' && onClose) {
          event.preventDefault();
          onClose();
        }
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        const direction = event.shiftKey ? -1 : 1;
        setSelected((current) => {
          const length = filtered.length;
          return (current + direction + length) % length;
        });
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelected((current) => (current + 1) % filtered.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelected((current) => (current - 1 + filtered.length) % filtered.length);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const current = filtered[selected];
        if (current && onSelect) {
          onSelect(current.id);
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      }
    },
    [filtered, onClose, onSelect, selected],
  );

  const handleSelect = useCallback(
    (id: string) => {
      onSelect?.(id);
    },
    [onSelect],
  );

  useEffect(() => () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 text-white"
      role="dialog"
      aria-modal="true"
      aria-label={translation.dialogLabel}
    >
      <div className="w-11/12 max-w-xl rounded bg-ub-grey p-4 shadow-lg">
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {liveMessage}
        </div>
        <label className="sr-only" htmlFor={listboxId}>
          {translation.searchLabel}
        </label>
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="mb-4 w-full rounded bg-black bg-opacity-20 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ub-orange"
          placeholder={translation.searchPlaceholder}
          aria-controls={`${listboxId}-list`}
          aria-autocomplete="list"
          aria-expanded="true"
        />
        <ul
          id={`${listboxId}-list`}
          role="listbox"
          aria-activedescendant={filtered[selected] ? `${listboxId}-${filtered[selected].id}` : undefined}
          className="max-h-64 overflow-y-auto"
        >
          {filtered.map((windowItem, index) => (
            <li
              key={windowItem.id}
              id={`${listboxId}-${windowItem.id}`}
              role="option"
              aria-selected={index === selected}
              className={`cursor-pointer rounded px-2 py-1 ${index === selected ? 'bg-ub-orange text-black' : ''}`}
              onMouseEnter={() => setSelected(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelect(windowItem.id)}
            >
              {windowItem.title}
            </li>
          ))}
        </ul>
        {!filtered.length && (
          <p className="mt-2 text-sm text-ubt-grey-200">
            {query ? translation.noResults : translation.noWindows}
          </p>
        )}
      </div>
    </div>
  );
};

export default Switcher;
