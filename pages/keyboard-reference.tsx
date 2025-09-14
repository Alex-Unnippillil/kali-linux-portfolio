import React from 'react';

const shortcuts = [
  { key: 'Ctrl + C', action: 'Copy selected text' },
  { key: 'Ctrl + V', action: 'Paste from clipboard' },
  { key: 'Ctrl + X', action: 'Cut selected text' },
  { key: 'Alt + Tab', action: 'Switch between apps' },
  { key: 'Alt + F4', action: 'Close current window' },
];

const KeyboardReference = () => (
  <main className="min-h-screen bg-ub-cool-grey text-white p-4 space-y-4">
    <h1 className="text-2xl font-bold">Keyboard Mapping Reference</h1>
    <p className="mb-4">Common shortcuts for navigating and interacting with the desktop.</p>
    <table className="w-full border-collapse text-sm">
      <thead className="sr-only sticky top-0 bg-ub-cool-grey sm:not-sr-only">
        <tr>
          <th className="p-2 text-left border border-ubt-grey" scope="col">Key</th>
          <th className="p-2 text-left border border-ubt-grey" scope="col">Action</th>
        </tr>
      </thead>
      <tbody className="block sm:table-row-group">
        {shortcuts.map(({ key, action }) => (
          <tr key={key} className="block border border-ubt-grey mb-2 sm:table-row sm:border-0 sm:mb-0">
            <td className="p-2 border-b border-ubt-grey sm:border sm:border-ubt-grey sm:table-cell block" data-label="Key">
              <span className="font-semibold sm:hidden" aria-hidden="true">Key: </span>
              {key}
            </td>
            <td className="p-2 sm:border sm:border-ubt-grey sm:table-cell block" data-label="Action">
              <span className="font-semibold sm:hidden" aria-hidden="true">Action: </span>
              {action}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </main>
);

export default KeyboardReference;
