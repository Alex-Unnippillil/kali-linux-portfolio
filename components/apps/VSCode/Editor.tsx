import { useEffect, useRef } from 'react';
import { useTheme } from '../../../hooks/useTheme';

interface EditorProps {
  path: string;
  content: string;
}

export default function Editor({ path, content }: EditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const monacoRef = useRef<any>(null);
  const editorRef = useRef<any>(null);
  const { theme } = useTheme();

  useEffect(() => {
    let disposed = false;
    async function load() {
      const monaco = await import('monaco-editor');
      monacoRef.current = monaco;
      if (disposed || !containerRef.current) return;
      editorRef.current = monaco.editor.create(containerRef.current, {
        value: content,
        language: languageFromPath(path),
        readOnly: true,
        automaticLayout: true,
        theme: theme === 'dark' ? 'vs-dark' : 'vs-light',
      });
    }
    load();
    return () => {
      disposed = true;
      if (editorRef.current) {
        editorRef.current.dispose();
      }
    };
  }, [path, content]);

  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs-light');
    }
  }, [theme]);

  return <div className="h-full w-full" ref={containerRef} />;
}

function languageFromPath(path: string) {
  const ext = path.split('.').pop();
  switch (ext) {
    case 'ts':
      return 'typescript';
    case 'js':
      return 'javascript';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    default:
      return 'plaintext';
  }
}
