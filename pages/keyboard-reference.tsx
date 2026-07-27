import React from 'react';
import { TOUCH_HINTS } from '../components/common/touchHints';

const KeyboardReference = () => (
  <main className="min-h-screen bg-ub-cool-grey text-white p-4 space-y-4">
    <h1 className="text-2xl font-bold">Keyboard Mapping Reference</h1>
    <p className="mb-4">
      Common shortcuts for navigating and interacting with the desktop. Press the
      <span className="mx-1 rounded bg-black/40 px-2 py-1 font-mono">?</span>
      key anywhere to open the in-app overlay with the same list alongside touch
      equivalents.
    </p>
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
      </tbody>
    </table>
    <section aria-labelledby="touch-equivalents-heading" className="space-y-2">
      <h2 id="touch-equivalents-heading" className="text-xl font-bold">
        Touch equivalents
      </h2>
      <p>
        These gestures surface in the same overlay triggered by
        <span className="mx-1 rounded bg-black/40 px-2 py-1 font-mono">?</span>
        so tablet users can follow along without a hardware keyboard.
      </p>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-left border border-ubt-grey">Gesture</th>
            <th className="p-2 text-left border border-ubt-grey">Action</th>
          </tr>
        </thead>
        <tbody>
          {TOUCH_HINTS.map(({ gesture, action }) => (
            <tr key={gesture}>
              <td className="p-2 border border-ubt-grey">{gesture}</td>
              <td className="p-2 border border-ubt-grey">{action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  </main>
);

export default KeyboardReference;
