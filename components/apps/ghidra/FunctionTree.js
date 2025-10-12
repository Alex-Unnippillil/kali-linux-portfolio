import React from 'react';

const itemButtonBaseClasses =
  'w-full rounded-md px-2 py-1 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

function FunctionNode({ func, funcMap, onSelect, selected }) {
  return (
    <li>
      <button
        onClick={() => onSelect(func.name)}
        aria-pressed={selected === func.name}
        className={`${
          selected === func.name
            ? `${itemButtonBaseClasses} bg-orange-500/20 text-orange-100 shadow-[0_0_0_1px_rgba(251,191,36,0.45)]`
            : `${itemButtonBaseClasses} text-slate-100 hover:bg-slate-800/70`
        }`}
      >
        {func.name}
      </button>
      {func.calls && func.calls.length > 0 && (
        <ul className="ml-4 space-y-1">
          {func.calls.map((c) =>
            funcMap[c] ? (
              <FunctionNode
                key={c}
                func={funcMap[c]}
                funcMap={funcMap}
                onSelect={onSelect}
                selected={selected}
              />
            ) : (
              <li key={c}>{c}</li>
            )
          )}
        </ul>
      )}
    </li>
  );
}

export default function FunctionTree({ functions, onSelect, selected }) {
  const funcMap = React.useMemo(() => {
    const map = {};
    functions.forEach((f) => {
      map[f.name] = f;
    });
    return map;
  }, [functions]);

  const called = React.useMemo(() => {
    const set = new Set();
    functions.forEach((f) => f.calls && f.calls.forEach((c) => set.add(c)));
    return set;
  }, [functions]);

  const roots = functions.filter((f) => !called.has(f.name));

  return (
    <ul className="space-y-1">
      {roots.map((f) => (
        <FunctionNode
          key={f.name}
          func={f}
          funcMap={funcMap}
          onSelect={onSelect}
          selected={selected}
        />
      ))}
    </ul>
  );
}
