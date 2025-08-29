import React, { useState, useEffect, useRef } from 'react';

const FS_KEY = 'vscode.fs';
const RECENT_KEY = 'vscode.recents';

const DEFAULT_FS = {
  '/README.md': '# Welcome\nThis is a virtual file system backed by localStorage.',
};

const loadFS = () => {
  if (typeof window === 'undefined') return { ...DEFAULT_FS };
  try {
    const stored = localStorage.getItem(FS_KEY);
    return stored ? JSON.parse(stored) : { ...DEFAULT_FS };
  } catch {
    return { ...DEFAULT_FS };
  }
};

const saveFS = (fs) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(FS_KEY, JSON.stringify(fs));
  }
};

const buildTree = (paths) => {
  const root = {};
  paths.forEach((p) => {
    const parts = p.split('/').filter(Boolean);
    let current = root;
    parts.forEach((part, i) => {
      current[part] = current[part] || (i === parts.length - 1 ? null : {});
      if (i !== parts.length - 1) current = current[part];
    });
  });
  return root;
};

const FileTree = ({ tree, base = '', openFile }) => (
  <ul className="ml-2">
    {Object.entries(tree).map(([name, child]) => {
      const path = `${base}/${name}`.replace('//', '/');
      return child ? (
        <li key={path}>
          <span>{name}</span>
          <FileTree tree={child} base={path} openFile={openFile} />
        </li>
      ) : (
        <li key={path}>
          <button
            onClick={() => openFile(path)}
            className="text-left hover:underline"
          >
            {name}
          </button>
        </li>
      );
    })}
  </ul>
);

const VsCode = () => {
  const [fs, setFs] = useState(loadFS);
  const fsRef = useRef(fs);
  const [openTabs, setOpenTabs] = useState([]);
  const [active, setActive] = useState(null);
  const [recent, setRecent] = useState([]);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickQuery, setQuickQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [wrap, setWrap] = useState(false);

  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(RECENT_KEY);
    if (stored) setRecent(JSON.parse(stored));
  }, []);

  useEffect(() => {
    fsRef.current = fs;
    saveFS(fs);
  }, [fs]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') return;
    if (!containerRef.current || editorRef.current) return;
    let editor;
    (async () => {
      await import('monaco-editor/min/vs/editor/editor.main.css');
      const monaco = await import('monaco-editor');
      monacoRef.current = monaco;
      editor = monaco.editor.create(containerRef.current, {
        value: '',
        language: 'javascript',
        automaticLayout: true,
        theme: window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'vs-dark'
          : 'vs',
        wordWrap: 'off',
      });
      editorRef.current = editor;

      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const applyTheme = () =>
        monaco.editor.setTheme(mq.matches ? 'vs-dark' : 'vs');
      mq.addEventListener('change', applyTheme);
    })();
    return () => {
      if (editor) editor.dispose();
    };
  }, []);

  useEffect(() => {
    editorRef.current?.updateOptions({ wordWrap: wrap ? 'on' : 'off' });
  }, [wrap]);

  useEffect(() => {
    if (!editorRef.current || !active) return;
    editorRef.current.setValue(fsRef.current[active] || '');
    const sub = editorRef.current.onDidChangeModelContent(() => {
      const value = editorRef.current.getValue();
      fsRef.current = { ...fsRef.current, [active]: value };
      setFs(fsRef.current);
    });
    return () => sub.dispose();
  }, [active]);

  const openFile = (path) => {
    setOpenTabs((tabs) => (tabs.includes(path) ? tabs : [...tabs, path]));
    setActive(path);
    setRecent((r) => {
      const list = [path, ...r.filter((p) => p !== path)].slice(0, 10);
      if (typeof window !== 'undefined')
        localStorage.setItem(RECENT_KEY, JSON.stringify(list));
      return list;
    });
  };

  const closeTab = (path) => {
    setOpenTabs((tabs) => tabs.filter((t) => t !== path));
    if (active === path) {
      const idx = openTabs.indexOf(path);
      const next = openTabs[idx + 1] || openTabs[idx - 1] || null;
      setActive(next);
    }
  };

  const allFiles = Object.keys(fs);
  const tree = buildTree(allFiles);

  const runSearch = () => {
    try {
      const regex = new RegExp(searchQuery, 'g');
      const results = [];
      for (const path of allFiles) {
        const lines = fs[path].split('\n');
        lines.forEach((line, i) => {
          if (regex.test(line)) {
            results.push({ path, line: i + 1, text: line.trim() });
            regex.lastIndex = 0;
          }
        });
      }
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setQuickOpen(true);
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const format = () =>
    editorRef.current?.getAction('editor.action.formatDocument').run();
  const gotoLine = () =>
    editorRef.current?.getAction('editor.action.gotoLine').run();
  const toggleWrap = () => setWrap((w) => !w);

  return (
    <div className="h-full flex text-sm text-white bg-ub-cool-grey relative">
      <div className="w-48 overflow-auto border-r border-gray-700 p-2">
        <FileTree tree={tree} openFile={openFile} />
        {recent.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs uppercase text-gray-400">Recent</h3>
            <ul>
              {recent.map((p) => (
                <li key={p}>
                  <button
                    onClick={() => openFile(p)}
                    className="text-left hover:underline"
                  >
                    {p.split('/').pop()}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex bg-gray-800">
          {openTabs.map((tab) => (
            <button
              key={tab}
              className={`px-2 py-1 flex items-center space-x-1 ${
                tab === active ? 'bg-gray-900' : ''
              }`}
              onClick={() => setActive(tab)}
            >
              <span>{tab.split('/').pop()}</span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab);
                }}
              >
                ×
              </span>
            </button>
          ))}
        </div>
        <div className="flex space-x-2 p-1 bg-gray-700 text-xs">
          <button onClick={format}>Format</button>
          <button onClick={gotoLine}>Go to line</button>
          <button onClick={toggleWrap}>Word wrap</button>
          <button onClick={() => setQuickOpen(true)}>Quick open</button>
          <button onClick={() => setSearchOpen(true)}>Find</button>
        </div>
        <div className="flex-1" ref={containerRef} />
      </div>

      {quickOpen && (
        <div
          className="absolute inset-0 bg-black/60 flex items-start justify-center pt-10"
          onClick={() => setQuickOpen(false)}
        >
          <div
            className="bg-gray-800 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              className="w-64 mb-2 text-black p-1"
              placeholder="Type to search files"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setQuickOpen(false);
              }}
            />
            <ul className="max-h-60 overflow-auto">
              {allFiles
                .filter((f) =>
                  f.toLowerCase().includes(quickQuery.toLowerCase())
                )
                .map((f) => (
                  <li key={f}>
                    <button
                      onClick={() => {
                        openFile(f);
                        setQuickOpen(false);
                      }}
                      className="text-left hover:underline"
                    >
                      {f}
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}

      {searchOpen && (
        <div
          className="absolute inset-0 bg-black/60 flex items-start justify-center pt-10"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="bg-gray-800 p-4 w-96"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              className="w-full mb-2 text-black p-1"
              placeholder="Regex search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runSearch();
                if (e.key === 'Escape') setSearchOpen(false);
              }}
            />
            <button className="mb-2" onClick={runSearch}>
              Search
            </button>
            <ul className="max-h-60 overflow-auto text-xs">
              {searchResults.map((r, i) => (
                <li key={i}>
                  <button
                    onClick={() => {
                      openFile(r.path);
                      setSearchOpen(false);
                    }}
                    className="text-left hover:underline"
                  >
                    {r.path}:{r.line} {r.text}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default VsCode;

export const displayVsCode = () => <VsCode />;

