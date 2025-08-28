import { useState } from 'react';
import commands from '../data/demo-commands.json';

export default function CommandList() {
  const [confirmed, setConfirmed] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = commands.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.command.toLowerCase().includes(query.toLowerCase())
  );

  if (!confirmed) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Command Reference</h1>
        <p className="mb-4 text-red-600">
          These commands are for educational use in lab environments only. Using
          them on production systems may cause damage.
        </p>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded"
          onClick={() => setConfirmed(true)}
        >
          I am in a lab
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Command Reference</h1>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search commands..."
        className="border p-2 mb-4 w-full"
      />
      <p className="mb-4 text-sm text-red-600">
        These commands are provided for demonstration purposes only. Do not run
        them outside a controlled environment.
      </p>
      <ul>
        {filtered.map((cmd) => (
          <li key={cmd.command} className="mb-4">
            <div className="font-semibold">{cmd.name}</div>
            <pre className="bg-gray-100 p-2 overflow-x-auto">
              <code>{cmd.command}</code>
            </pre>
            <p className="text-sm">{cmd.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
