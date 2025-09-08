import { createContext, ReactNode, useContext, useRef, useState } from 'react';

interface FootnoteItem {
  id: number;
  content: ReactNode;
}

interface FootnoteContextValue {
  register: (content: ReactNode) => number;
  footnotes: FootnoteItem[];
}

const FootnoteContext = createContext<FootnoteContextValue | null>(null);

export function FootnoteProvider({ children }: { children: ReactNode }) {
  const [footnotes, setFootnotes] = useState<FootnoteItem[]>([]);

  const register = (content: ReactNode) => {
    const id = footnotes.length + 1;
    setFootnotes((prev) => [...prev, { id, content }]);
    return id;
  };

  return (
    <FootnoteContext.Provider value={{ register, footnotes }}>
      {children}
      {footnotes.length > 0 && (
        <ol className="footnotes mt-8 list-decimal pl-4 text-sm">
          {footnotes.map(({ id, content }) => (
            <li key={id} id={`fn${id}`}>
              {content}{' '}
              <a href={`#fnref${id}`} className="ml-2 text-blue-600 hover:underline">
                Back to text
              </a>
            </li>
          ))}
        </ol>
      )}
    </FootnoteContext.Provider>
  );
}

export function Footnote({ children }: { children: ReactNode }) {
  const context = useContext(FootnoteContext);
  if (!context) {
    throw new Error('Footnote must be used within FootnoteProvider');
  }

  const idRef = useRef<number>();
  if (!idRef.current) {
    idRef.current = context.register(children);
  }
  const id = idRef.current;

  return (
    <sup id={`fnref${id}`} className="ml-1">
      <a href={`#fn${id}`} className="text-blue-600 hover:underline">
        {id}
      </a>
    </sup>
  );
}

