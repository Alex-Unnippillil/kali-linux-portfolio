import React, { useState } from 'react';

// Fallback tree used when nothing is stored in localStorage
const defaultTree = {
  name: 'root',
  type: 'folder',
  children: [
    { name: 'hello.txt', type: 'file', content: 'Hello World!' },
    {
      name: 'src',
      type: 'folder',
      children: [
        { name: 'index.js', type: 'file', content: "console.log('hi');" },
      ],
    },
  ],
};

// Helper to locate a node within the tree using `/` separated path
const findNodeByPath = (node, path) => {
  const parts = path.split('/').filter(Boolean);
  let current = node;
  for (const part of parts) {
    if (!current || current.type !== 'folder') return null;
    current = (current.children || []).find((c) => c.name === part);
  }
  return current;
};

export default function VsCode() {
  const [tree, setTree] = useState(null);
  const [tabs, setTabs] = useState([]); // {path,name,content}
  const [active, setActive] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  // Load tree from localStorage
  const openFolder = () => {
    try {
      const stored = window.localStorage.getItem('vscode-tree');
      let parsed = stored ? JSON.parse(stored) : defaultTree;
      if (!stored) window.localStorage.setItem('vscode-tree', JSON.stringify(parsed));
      setTree(parsed);
    } catch {
      setTree(defaultTree);
    }
  };

  const openFile = (path, node) => {
    const exists = tabs.find((t) => t.path === path);
    if (!exists) setTabs([...tabs, { path, name: node.name, content: node.content }]);
    setActive(path);
  };

  const closeTab = (path) => {
    const remaining = tabs.filter((t) => t.path !== path);
    setTabs(remaining);
    if (active === path) setActive(remaining.length ? remaining[0].path : null);
  };

  const updateContent = (path, value) => {
    setTabs(tabs.map((t) => (t.path === path ? { ...t, content: value } : t)));
    const node = findNodeByPath(tree, path);
    if (node) node.content = value;
    try {
      window.localStorage.setItem('vscode-tree', JSON.stringify(tree));
    } catch {
      /* ignore */
    }
  };

  const renderTree = (node, prefix = '') => {
    if (!node) return null;
    const currentPath = prefix ? `${prefix}/${node.name}` : node.name;
    if (node.type === 'file') {
      return (
        <li
          key={currentPath}
          className="cursor-pointer hover:bg-gray-600"
          onClick={() => openFile(currentPath, node)}
        >
          {node.name}
        </li>
      );
    }
    return (
      <li key={currentPath} className="ml-2">
        <details open>
          <summary>{node.name}</summary>
          <ul className="pl-4">
            {(node.children || []).map((child) => renderTree(child, currentPath))}
          </ul>
        </details>
      </li>
    );
  };

  const performSearch = () => {
    const res = [];
    const searchNode = (node, prefix = '') => {
      const currentPath = prefix ? `${prefix}/${node.name}` : node.name;
      if (node.type === 'file') {
        node.content.split('\n').forEach((line, idx) => {
          if (line.toLowerCase().includes(query.toLowerCase())) {
            res.push({ path: currentPath, line: idx + 1, text: line.trim() });
          }
        });
      } else {
        (node.children || []).forEach((c) => searchNode(c, currentPath));
      }
    };
    if (tree && query) searchNode(tree, '');
    setResults(res);
  };

  return (
    <div className="h-full w-full flex flex-col text-sm text-white bg-ub-cool-grey">
      <div className="flex items-center bg-gray-800 p-1 space-x-2">
        <button
          onClick={openFolder}
          className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600"
        >
          Open Folder
        </button>
        <input
          className="px-2 py-1 bg-gray-700 rounded outline-none"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && performSearch()}
        />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-56 overflow-auto bg-gray-900 p-2">
          {tree ? <ul>{renderTree(tree)}</ul> : <div>No folder opened.</div>}
          {results.length > 0 && (
            <div className="mt-4">
              <div className="font-bold">Search Results</div>
              <ul>
                {results.map((r, i) => (
                  <li
                    key={i}
                    className="cursor-pointer hover:bg-gray-700"
                    onClick={() => {
                      const node = findNodeByPath(tree, r.path);
                      if (node) openFile(r.path, node);
                      setResults([]);
                    }}
                  >
                    {r.path}:{r.line} {r.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex bg-gray-700">
            {tabs.map((tab) => (
              <div
                key={tab.path}
                className={`px-2 py-1 cursor-pointer flex items-center space-x-2 ${
                  tab.path === active ? 'bg-gray-900' : 'bg-gray-700'
                }`}
                onClick={() => setActive(tab.path)}
              >
                <span>{tab.name}</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.path);
                  }}
                  className="text-xs"
                >
                  ✕
                </span>
              </div>
            ))}
          </div>
          <div className="flex-1 overflow-auto">
            {tabs.map((tab) =>
              tab.path === active ? (
                <textarea
                  key={tab.path}
                  className="w-full h-full bg-gray-800 p-2 outline-none font-mono"
                  value={tab.content}
                  onChange={(e) => updateContent(tab.path, e.target.value)}
                  spellCheck="false"
                />
              ) : null
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const displayVsCode = () => {
  return <VsCode />;
};

