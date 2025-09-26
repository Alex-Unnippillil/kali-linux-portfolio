import React from 'react';
import {
  groupShortcutsByCategory,
  resolveShortcuts,
} from '../hooks/useShortcuts';

const KeyboardReference = () => {
  const shortcuts = resolveShortcuts();
  const grouped = groupShortcutsByCategory(shortcuts);

  return (
    <main className="min-h-screen bg-ub-cool-grey text-white p-4 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Keyboard Mapping Reference</h1>
        <p className="max-w-3xl text-sm text-gray-200">
          These shortcuts mirror the desktop environment. Use them to quickly open
          apps, manage windows, and capture screenshots.
        </p>
      </header>
      <div className="space-y-6">
        {grouped.map(({ category, items }) => (
          <section key={category} aria-label={`${category} shortcuts`}>
            <h2 className="text-xl font-semibold mb-3">{category}</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-1">
                <thead>
                  <tr className="text-left text-sm uppercase tracking-wider text-gray-300">
                    <th scope="col" className="px-3 py-2">
                      Keys
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((shortcut) => (
                    <tr key={shortcut.id} className="bg-black/40">
                      <td className="px-3 py-2 font-mono whitespace-nowrap align-middle">
                        {shortcut.label}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        {shortcut.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
};

export default KeyboardReference;
