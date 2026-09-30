import React from 'react';

const KeyboardReference = () => (
  <main className="min-h-screen bg-ub-cool-grey text-white p-4 space-y-4">
    <h1 className="text-2xl font-bold">Keyboard Mapping Reference</h1>
    <p className="mb-4">Common shortcuts for navigating and interacting with the desktop.</p>
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className="p-2 text-left border border-ubt-grey">Key</th>
          <th className="p-2 text-left border border-ubt-grey">Action</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="p-2 border border-ubt-grey">Meta / Alt + F1</td>
          <td className="p-2 border border-ubt-grey">Open the applications menu</td>
        </tr>
        <tr>
          <td className="p-2 border border-ubt-grey">Ctrl + C</td>
          <td className="p-2 border border-ubt-grey">Copy selected text</td>
        </tr>
        <tr>
          <td className="p-2 border border-ubt-grey">Ctrl + V</td>
          <td className="p-2 border border-ubt-grey">Paste from clipboard</td>
        </tr>
        <tr>
          <td className="p-2 border border-ubt-grey">Ctrl + X</td>
          <td className="p-2 border border-ubt-grey">Cut selected text</td>
        </tr>
        <tr>
          <td className="p-2 border border-ubt-grey">Alt + Tab</td>
          <td className="p-2 border border-ubt-grey">Switch between apps</td>
        </tr>
        <tr>
          <td className="p-2 border border-ubt-grey">Alt + F4</td>
          <td className="p-2 border border-ubt-grey">Close current window</td>
        </tr>
        <tr>
          <td className="p-2 border border-ubt-grey">Space</td>
          <td className="p-2 border border-ubt-grey">Play or pause focused video player</td>
        </tr>
        <tr>
          <td className="p-2 border border-ubt-grey">Arrow Left / Arrow Right</td>
          <td className="p-2 border border-ubt-grey">Seek video backward or forward 5 seconds</td>
        </tr>
        <tr>
          <td className="p-2 border border-ubt-grey">M</td>
          <td className="p-2 border border-ubt-grey">Toggle mute on focused video player</td>
        </tr>
      </tbody>
    </table>
  </main>
);

export default KeyboardReference;
