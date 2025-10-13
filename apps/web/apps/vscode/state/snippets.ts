import usePersistentState from '../../../hooks/usePersistentState';

export interface Snippet {
  prefix: string;
  body: string;
  description?: string;
}

interface SnippetMap {
  [language: string]: Snippet[];
}

const KEY = 'vscode:snippets';

export function useSnippets(language: string) {
  const [map, setMap] = usePersistentState<SnippetMap>(KEY, {});

  const addSnippet = (snippet: Snippet) => {
    setMap((prev) => {
      const list = prev[language] ? [...prev[language], snippet] : [snippet];
      return { ...prev, [language]: list };
    });
  };

  const updateSnippet = (index: number, snippet: Snippet) => {
    setMap((prev) => {
      const list = [...(prev[language] || [])];
      list[index] = snippet;
      return { ...prev, [language]: list };
    });
  };

  const removeSnippet = (index: number) => {
    setMap((prev) => {
      const list = (prev[language] || []).filter((_, i) => i !== index);
      return { ...prev, [language]: list };
    });
  };

  return {
    snippets: map[language] || [],
    addSnippet,
    updateSnippet,
    removeSnippet,
  } as const;
}
