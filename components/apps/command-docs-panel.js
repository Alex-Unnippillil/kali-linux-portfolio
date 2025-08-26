import React from 'react';

const CommandDocsPanel = () => (
  <div className="w-48 p-2 bg-ub-dark text-white text-xs overflow-auto hidden md:block">
    <h2 className="font-bold mb-2">Commands</h2>
    <ul className="space-y-1">
      <li><code>pwd</code> - print working directory</li>
      <li><code>cd &lt;dir&gt;</code> - change directory</li>
      <li><code>date</code> - show current date/time</li>
      <li><code>echo &lt;text&gt;</code> - echo text</li>
      <li><code>ls</code> - list files</li>
      <li><code>clear</code> - clear terminal</li>
      <li><code>help</code> - show available commands</li>
      <li><code>history</code> - show command history</li>
      <li><code>simulate</code> - run simulation</li>
    </ul>
  </div>
);

export default CommandDocsPanel;
