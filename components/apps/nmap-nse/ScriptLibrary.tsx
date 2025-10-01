import React, { useMemo, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

export interface NmapScriptMeta {
  name: string;
  description: string;
  tags: string[];
  categories: string[];
}

export interface ScriptLibraryProps {
  scripts: NmapScriptMeta[];
  selectedScripts: string[];
  onToggleScript: (name: string) => void;
  onActiveScriptChange: (name: string | null) => void;
  activeScript: string | null;
  scriptOptions: Record<string, string>;
  onScriptOptionChange: (name: string, value: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  scripts: NmapScriptMeta[];
  children: TreeNode[];
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const buildTree = (scripts: NmapScriptMeta[]): TreeNode[] => {
  interface MutableNode {
    name: string;
    path: string;
    scripts: NmapScriptMeta[];
    children: Map<string, MutableNode>;
  }

  const rootMap = new Map<string, MutableNode>();

  const ensureNode = (
    map: Map<string, MutableNode>,
    name: string,
    path: string
  ): MutableNode => {
    let node = map.get(name);
    if (!node) {
      node = { name, path, scripts: [], children: new Map() };
      map.set(name, node);
    }
    return node;
  };

  scripts.forEach((script) => {
    const categories = script.categories.length > 0 ? script.categories : ['uncategorized'];
    let currentMap = rootMap;
    let currentPath = '';

    categories.forEach((category, index) => {
      currentPath = currentPath ? `${currentPath}/${category}` : category;
      const node = ensureNode(currentMap, category, currentPath);
      if (index === categories.length - 1) {
        node.scripts.push(script);
      }
      currentMap = node.children;
    });
  });

  const convert = (map: Map<string, MutableNode>): TreeNode[] =>
    Array.from(map.values())
      .map<TreeNode>((node) => ({
        name: node.name,
        path: node.path,
        scripts: [...node.scripts].sort((a, b) => a.name.localeCompare(b.name)),
        children: convert(node.children),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

  return convert(rootMap);
};

const createScriptMap = (scripts: NmapScriptMeta[]) => {
  const map = new Map<string, NmapScriptMeta>();
  scripts.forEach((script) => {
    map.set(script.name, script);
  });
  return map;
};

const ScriptLibrary: React.FC<ScriptLibraryProps> = ({
  scripts,
  selectedScripts,
  onToggleScript,
  onActiveScriptChange,
  activeScript,
  scriptOptions,
  onScriptOptionChange,
}) => {
  const [search, setSearch] = useState('');
  const [drawerScript, setDrawerScript] = useState<NmapScriptMeta | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = usePersistentState<string[]>(
    'nmap-nse:favorites',
    [],
    isStringArray
  );

  const scriptsByName = useMemo(() => createScriptMap(scripts), [scripts]);

  const filteredScripts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return scripts;
    return scripts.filter((script) => {
      if (script.name.toLowerCase().includes(query)) return true;
      if (script.description.toLowerCase().includes(query)) return true;
      return script.tags.some((tag) => tag.toLowerCase().includes(query));
    });
  }, [scripts, search]);

  const favoritesList = useMemo(
    () =>
      favorites
        .map((name) => scriptsByName.get(name))
        .filter((script): script is NmapScriptMeta => Boolean(script))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [favorites, scriptsByName]
  );

  const tree = useMemo(() => buildTree(filteredScripts), [filteredScripts]);

  const isFavorite = (name: string) => favorites.includes(name);

  const toggleFavorite = (name: string) => {
    setFavorites((prev) => {
      const exists = prev.includes(name);
      const next = exists ? prev.filter((item) => item !== name) : [...prev, name];
      return next.sort();
    });
  };

  const openDrawer = (script: NmapScriptMeta) => {
    setDrawerScript(script);
    onActiveScriptChange(script.name);
  };

  const closeDrawer = () => {
    setDrawerScript(null);
    onActiveScriptChange(null);
  };

  React.useEffect(() => {
    if (!activeScript) {
      setDrawerScript(null);
      return;
    }
    if (!drawerScript) return;
    if (drawerScript.name === activeScript) return;
    const script = scriptsByName.get(activeScript);
    if (script) {
      setDrawerScript(script);
    }
  }, [activeScript, drawerScript, scriptsByName]);

  const toggleCollapsed = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderScriptRow = (script: NmapScriptMeta) => {
    const favorite = isFavorite(script.name);
    const checked = selectedScripts.includes(script.name);
    return (
      <div
        key={script.name}
        className={`p-2 rounded bg-black/30 hover:bg-black/40 transition-colors border border-transparent focus-within:border-ub-yellow`}
      >
        <div className="flex items-start gap-2">
          <input
            id={`select-${script.name}`}
            type="checkbox"
            checked={checked}
            onChange={() => onToggleScript(script.name)}
            aria-label={script.name}
            className="mt-1"
          />
          <div className="flex-1">
            <button
              type="button"
              className="text-left font-mono text-sm text-blue-200 hover:text-blue-100"
              onClick={() => openDrawer(script)}
            >
              {script.name}
            </button>
            <p className="text-xs text-gray-300 mt-1 line-clamp-2">{script.description}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {script.tags.map((tag) => (
                <span key={tag} className="text-[10px] uppercase tracking-wide bg-gray-700 text-gray-100 px-1.5 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleFavorite(script.name)}
            aria-label={`Toggle favorite for ${script.name}`}
            aria-pressed={favorite}
            className={`text-lg leading-none ${favorite ? 'text-yellow-400' : 'text-gray-400'} hover:text-yellow-300`}
            title={favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {favorite ? '★' : '☆'}
          </button>
        </div>
      </div>
    );
  };

  const renderNode = (node: TreeNode) => {
    const expanded = !collapsed.has(node.path) || search.trim().length > 0;
    const hasChildren = node.children.length > 0;
    const hasScripts = node.scripts.length > 0;
    return (
      <div key={node.path} className="ml-2">
        <button
          type="button"
          onClick={() => toggleCollapsed(node.path)}
          className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-300 hover:text-white"
          aria-expanded={expanded}
          aria-controls={`category-${node.path}`}
        >
          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-700 text-xs">
            {expanded ? '−' : '+'}
          </span>
          {node.name}
        </button>
        <div
          id={`category-${node.path}`}
          className={`mt-1 ml-5 space-y-2 ${expanded ? '' : 'hidden'}`}
        >
          {hasScripts && node.scripts.map((script) => renderScriptRow(script))}
          {hasChildren && node.children.map((child) => renderNode(child))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded h-full flex flex-col" aria-label="Nmap script library">
      <div className="p-3 border-b border-gray-800">
        <label htmlFor="nmap-script-search" className="sr-only">
          Search scripts
        </label>
        <input
          id="nmap-script-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search scripts"
          className="w-full px-3 py-2 rounded bg-black/40 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ub-yellow"
        />
      </div>
      {favoritesList.length > 0 && (
        <section className="px-3 pt-3 pb-2 border-b border-gray-800" aria-label="Favorite scripts">
          <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-2">Favorites</h3>
          <div className="space-y-2">
            {favoritesList.map((script) => renderScriptRow(script))}
          </div>
        </section>
      )}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {search.trim() && filteredScripts.length === 0 && (
          <p className="text-sm text-gray-400">No scripts match your search.</p>
        )}
        {search.trim()
          ? filteredScripts.map((script) => renderScriptRow(script))
          : tree.map((node) => renderNode(node))}
      </div>

      {drawerScript && (
        <>
          <button
            type="button"
            className="fixed inset-0 bg-black/40 backdrop-blur-sm cursor-default"
            aria-hidden="true"
            onClick={closeDrawer}
          />
          <aside
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-gray-950 border-l border-gray-800 shadow-xl flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nmap-script-detail-title"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <h2
                id="nmap-script-detail-title"
                className="font-mono text-lg text-ub-yellow"
              >
                {drawerScript.name}
              </h2>
              <button
                type="button"
                onClick={closeDrawer}
                className="text-gray-400 hover:text-white"
                aria-label="Close script details"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-sm">
              <p>{drawerScript.description}</p>
              <div>
                <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-1">
                  Categories
                </h3>
                <div className="flex flex-wrap gap-1">
                  {drawerScript.categories.map((category) => (
                    <span
                      key={category}
                      className="px-2 py-0.5 rounded bg-gray-800 text-gray-200 text-xs"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-1">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-1">
                  {drawerScript.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded bg-gray-800 text-gray-200 text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label
                  htmlFor={`script-args-${drawerScript.name}`}
                  className="block text-xs uppercase tracking-wide text-gray-400 mb-1"
                >
                  Script arguments
                </label>
                <input
                  id={`script-args-${drawerScript.name}`}
                  type="text"
                  value={scriptOptions[drawerScript.name] || ''}
                  onChange={(event) =>
                    onScriptOptionChange(drawerScript.name, event.target.value)
                  }
                  className="w-full px-3 py-2 rounded bg-black/40 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ub-yellow"
                  placeholder="arg=value"
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between">
              <a
                href={`https://nmap.org/nsedoc/scripts/${drawerScript.name}.html`}
                target="_blank"
                rel="noreferrer"
                className="text-ub-yellow hover:underline"
              >
                View documentation
              </a>
              <button
                type="button"
                onClick={() => toggleFavorite(drawerScript.name)}
                className="px-3 py-1 rounded bg-gray-800 text-gray-200 hover:bg-gray-700"
                aria-pressed={isFavorite(drawerScript.name)}
              >
                {isFavorite(drawerScript.name) ? '★ Favorited' : '☆ Favorite'}
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
};

export default ScriptLibrary;
