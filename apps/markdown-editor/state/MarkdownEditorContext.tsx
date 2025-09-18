'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

interface SnippetBuilderArgs {
  text: string;
  before: string;
  after: string;
  start: number;
  end: number;
}

interface SnippetBuilderResult {
  text: string;
  select?: [number, number] | number;
}

export type SnippetBuilder = (
  args: SnippetBuilderArgs,
) => SnippetBuilderResult;

interface MarkdownEditorContextValue {
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  applySnippet: (builder: SnippetBuilder) => void;
}

const MarkdownEditorContext =
  createContext<MarkdownEditorContextValue | null>(null);

interface ProviderProps {
  children: React.ReactNode;
  initialValue?: string;
}

export const MarkdownEditorProvider: React.FC<ProviderProps> = ({
  children,
  initialValue = '',
}) => {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applySnippet = useCallback((builder: SnippetBuilder) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? start;
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    const selected = textarea.value.slice(start, end);

    const { text, select } = builder({
      text: selected,
      before,
      after,
      start,
      end,
    });

    textarea.setRangeText(text, start, end, 'end');
    setValue(textarea.value);

    const base = start;
    if (Array.isArray(select)) {
      const [selStart, selEnd] = select;
      textarea.setSelectionRange(base + selStart, base + selEnd);
    } else if (typeof select === 'number') {
      const pos = base + select;
      textarea.setSelectionRange(pos, pos);
    } else {
      const pos = base + text.length;
      textarea.setSelectionRange(pos, pos);
    }

    textarea.focus();
  }, []);

  const contextValue = useMemo(
    () => ({
      value,
      setValue,
      textareaRef,
      applySnippet,
    }),
    [value, applySnippet],
  );

  return (
    <MarkdownEditorContext.Provider value={contextValue}>
      {children}
    </MarkdownEditorContext.Provider>
  );
};

export const useMarkdownEditor = () => {
  const ctx = useContext(MarkdownEditorContext);
  if (!ctx) {
    throw new Error(
      'useMarkdownEditor must be used within a MarkdownEditorProvider',
    );
  }
  return ctx;
};

export type { SnippetBuilderArgs, SnippetBuilderResult };
