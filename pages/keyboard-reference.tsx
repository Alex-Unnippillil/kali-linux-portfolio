import React from 'react';
import {
  DEFAULT_SHORTCUTS,
  SHORTCUT_CATEGORIES,
} from '../data/shortcuts';

const groupedShortcuts = (() => {
  const ordered = SHORTCUT_CATEGORIES.map((category) => ({
    category,
    shortcuts: DEFAULT_SHORTCUTS.filter(
      (shortcut) => shortcut.category === category
    ),
  }));

  const remainingCategories = Array.from(
    new Set(DEFAULT_SHORTCUTS.map((shortcut) => shortcut.category))
  ).filter((category) => !SHORTCUT_CATEGORIES.includes(category));

  const extras = remainingCategories.map((category) => ({
    category,
    shortcuts: DEFAULT_SHORTCUTS.filter(
      (shortcut) => shortcut.category === category
    ),
  }));

  return [...ordered, ...extras];
})();

const KeyboardReference = () => (
  <main className="min-h-screen bg-ub-cool-grey p-6 text-white space-y-6">
    <header className="space-y-2">
      <h1 className="text-3xl font-bold tracking-wide">Keyboard Mapping Reference</h1>
      <p className="text-sm text-slate-200">
        The table below lists every desktop shortcut supported by the Kali Linux
        portfolio shell. Use it as a printable quick reference or pair it with
        the in-app overlay (<span className="font-mono">?</span>) for live filtering.
      </p>
    </header>
    <div className="space-y-8">
      {groupedShortcuts.map(({ category, shortcuts }) => (
        <section key={category} className="space-y-3">
          <h2 className="text-xl font-semibold tracking-wide text-ubt-grey-light">
            {category}
          </h2>
          <table className="w-full border-collapse overflow-hidden rounded-lg shadow-md">
            <thead className="bg-black/30">
              <tr>
                <th className="p-3 text-left text-sm font-semibold uppercase tracking-wider text-slate-200">
                  Shortcut
                </th>
                <th className="p-3 text-left text-sm font-semibold uppercase tracking-wider text-slate-200">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {shortcuts.map((shortcut) => (
                <tr
                  key={`${shortcut.description}-${shortcut.keys}`}
                  className="odd:bg-black/20"
                >
                  <td className="p-3 font-mono text-base text-white">
                    {shortcut.keys}
                  </td>
                  <td className="p-3 text-sm text-slate-200">
                    {shortcut.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  </main>
);

export default KeyboardReference;
