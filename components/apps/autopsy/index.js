import React, { useState, useEffect } from 'react';

function Autopsy() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [hashQuery, setHashQuery] = useState('');
  const [keyword, setKeyword] = useState('');
  const [hashResults, setHashResults] = useState([]);
  const [keywordResults, setKeywordResults] = useState([]);

  useEffect(() => {
    fetch('/demo/autopsy/sample-case.json')
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const buildTree = (files) => {
    const root = {};
    files.forEach((f) => {
      const parts = f.path.split('/');
      let current = root;
      parts.forEach((part, idx) => {
        if (!current[part]) {
          current[part] = idx === parts.length - 1 ? { __file: f } : {};
        }
        current = current[part];
      });
    });
    return root;
  };

  const fileTree = data ? buildTree(data.files) : null;

  const renderTree = (node, path = '') => (
    <ul className="ml-4">
      {Object.entries(node).map(([name, value]) =>
        value.__file ? (
          <li key={path + name}>
            <button
              onClick={() => setSelected(value.__file)}
              className="text-left hover:underline"
            >
              {name}
            </button>
          </li>
        ) : (
          <li key={path + name}>
            <div className="font-bold">{name}</div>
            {renderTree(value, path + name + '/')}
          </li>
        )
      )}
    </ul>
  );

  const searchHash = () => {
    if (!data) return;
    const query = hashQuery.trim();
    setHashResults(data.files.filter((f) => f.hash.includes(query)));
  };

  const searchKeyword = () => {
    if (!data) return;
    const term = keyword.trim().toLowerCase();
    setKeywordResults(
      data.files.filter(
        (f) => f.content && f.content.toLowerCase().includes(term)
      )
    );
  };

  const timeline = data
    ? [...data.files].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      )
    : [];

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white p-4 space-y-4 text-sm">
      <div className="text-xs italic">
        Sample data for demonstration purposes only.
      </div>
      {data && (
        <>
          <div className="flex space-x-4">
            <div className="w-1/2">
              <div className="font-bold mb-1">File Tree</div>
              {renderTree(fileTree)}
            </div>
            <div className="w-1/2">
              <div className="font-bold mb-1">Timeline</div>
              <ul className="text-xs space-y-1">
                {timeline.map((f, idx) => (
                  <li key={idx} className="bg-ub-grey p-1 rounded">
                    <div>{new Date(f.timestamp).toLocaleString()}</div>
                    <div>{f.path}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex space-x-2 items-center">
            <input
              value={hashQuery}
              onChange={(e) => setHashQuery(e.target.value)}
              placeholder="Hash lookup"
              className="bg-ub-grey text-white px-2 py-1 rounded text-xs flex-grow"
            />
            <button
              onClick={searchHash}
              className="bg-ub-orange px-2 py-1 rounded text-xs"
            >
              Find
            </button>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Keyword search"
              className="bg-ub-grey text-white px-2 py-1 rounded text-xs flex-grow"
            />
            <button
              onClick={searchKeyword}
              className="bg-ub-orange px-2 py-1 rounded text-xs"
            >
              Search
            </button>
          </div>
          {(hashResults.length > 0 || keywordResults.length > 0) && (
            <div className="space-y-1 text-xs">
              {hashResults.map((f, i) => (
                <div key={'h' + i}>
                  {f.path} ({f.hash})
                </div>
              ))}
              {keywordResults.map((f, i) => (
                <div key={'k' + i}>{f.path}</div>
              ))}
            </div>
          )}
          {selected && (
            <div className="bg-ub-grey p-2 rounded text-xs space-y-1">
              <div className="font-bold">{selected.path}</div>
              <div>Hash: {selected.hash}</div>
              <pre className="whitespace-pre-wrap">{selected.content}</pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Autopsy;
export const displayAutopsy = () => <Autopsy />;
