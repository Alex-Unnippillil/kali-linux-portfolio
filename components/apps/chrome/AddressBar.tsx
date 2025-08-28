import React, { useCallback, useEffect, useRef, useState } from 'react';

interface AddressBarProps {
  value: string;
  onChange: (value: string) => void;
  onNavigate: (value: string) => void;
}

interface Favorite {
  url: string;
  favicon: string;
}

const FAVORITE_DOMAINS = [
  'https://github.com',
  'https://google.com',
  'https://developer.mozilla.org',
];

const fetchSuggestions = async (term: string): Promise<string[]> => {
  const res = await fetch(
    `https://duckduckgo.com/ac/?q=${encodeURIComponent(term)}&type=list`,
  );
  const data = await res.json();
  return (data as Array<{ phrase: string }>).map((d) => d.phrase);
};

const AddressBar: React.FC<AddressBarProps> = ({ value, onChange, onNavigate }) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [index, setIndex] = useState(-1);

  useEffect(() => {
    const load = async () => {
      const favs = await Promise.all(
        FAVORITE_DOMAINS.map(async (url) => {
          try {
            const origin = new URL(url).origin;
            const favicon = `https://www.google.com/s2/favicons?domain=${origin}`;
            return { url, favicon };
          } catch {
            return { url, favicon: '' };
          }
        }),
      );
      setFavorites(favs);
      setSuggestions(favs.map((f) => f.url));
    };
    load();
  }, []);

  useEffect(() => {
    if (!value) {
      setSuggestions(favorites.map((f) => f.url));
      setIndex(-1);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const sugs = await fetchSuggestions(value);
        setSuggestions(sugs);
        setIndex(-1);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [value, favorites]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, -1));
      } else if (e.key === 'Enter') {
        const selected = suggestions[index];
        onNavigate(selected || value);
      }
    },
    [index, suggestions, value, onNavigate],
  );

  const handleSuggestionClick = useCallback(
    (s: string) => {
      onNavigate(s);
    },
    [onNavigate],
  );

  return (
    <div className="relative flex-grow">
      <input
        className="w-full px-2 py-0.5 text-black rounded"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
      />
      {suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 bg-white text-black mt-0.5 max-h-48 overflow-auto z-10 shadow">
          {suggestions.map((s, i) => {
            const fav = favorites.find((f) => f.url === s);
            return (
              <li
                key={s}
                className={`flex items-center px-2 py-1 cursor-pointer hover:bg-gray-200 ${i === index ? 'bg-gray-200' : ''}`}
                onMouseDown={() => handleSuggestionClick(s)}
              >
                {fav && fav.favicon && (
                  <img src={fav.favicon} alt="" className="w-4 h-4 mr-2" />
                )}
                <span className="truncate">{s}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default AddressBar;
