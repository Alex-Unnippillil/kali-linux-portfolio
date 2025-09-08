import { useState, ChangeEvent } from 'react';
import DensityWrapper from '../ui/DensityWrapper';

interface Shortcut {
  id: number;
  keys: string;
  action: string;
}

const defaultShortcuts: Shortcut[] = [
  { id: 1, keys: 'Super+Space', action: 'App Finder' },
];

const KeyboardShortcuts = () => {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(defaultShortcuts);
  const [warning, setWarning] = useState('');

  const upsertShortcut = (existing: Shortcut | null) => {
    const keys = prompt('Enter key combination', existing?.keys ?? '');
    if (!keys) return;
    const action = prompt('Enter action', existing?.action ?? '');
    if (!action) return;
    const conflict = shortcuts.some(
      (s) => s.keys.toLowerCase() === keys.toLowerCase() && s.id !== existing?.id,
    );
    if (conflict) {
      setWarning(`Conflict: ${keys} already assigned`);
      return;
    }
    setWarning('');
    if (existing) {
      setShortcuts(
        shortcuts.map((s) => (s.id === existing.id ? { ...s, keys, action } : s)),
      );
    } else {
      const id = Math.max(0, ...shortcuts.map((s) => s.id)) + 1;
      setShortcuts([...shortcuts, { id, keys, action }]);
    }
  };

  const remove = (id: number) => {
    if (confirm('Delete shortcut?')) {
      setShortcuts(shortcuts.filter((s) => s.id !== id));
    }
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(shortcuts, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shortcuts.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const arr: Omit<Shortcut, 'id'>[] = JSON.parse(text);
      let nextId = Math.max(0, ...shortcuts.map((s) => s.id));
      const conflict = arr.some(
        (a) =>
          arr.filter((b) => b.keys.toLowerCase() === a.keys.toLowerCase()).length > 1 ||
          shortcuts.some((s) => s.keys.toLowerCase() === a.keys.toLowerCase()),
      );
      if (conflict) {
        setWarning('Conflict detected during import');
        return;
      }
      setWarning('');
      setShortcuts([...shortcuts, ...arr.map((s) => ({ ...s, id: ++nextId }))]);
    } catch {
      setWarning('Invalid JSON');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <DensityWrapper>
    <div>
      {warning && (
        <div role="alert" className="text-red-500 mb-2">
          {warning}
        </div>
      )}
      <table className="min-w-full text-left">
        <thead>
          <tr>
            <th className="px-2">Shortcut</th>
            <th className="px-2">Action</th>
            <th className="px-2">Options</th>
          </tr>
        </thead>
        <tbody>
          {shortcuts.map((s) => (
            <tr key={s.id}>
              <td className="px-2">{s.keys}</td>
              <td className="px-2">{s.action}</td>
              <td className="px-2">
                <button onClick={() => upsertShortcut(s)} className="mr-2">
                  Edit
                </button>
                <button onClick={() => remove(s.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex gap-2">
        <button onClick={() => upsertShortcut(null)}>Add Shortcut</button>
        <button onClick={exportJSON}>Export JSON</button>
        <label className="cursor-pointer">
          <span className="sr-only">Import shortcuts</span>
          <input
            type="file"
            accept="application/json"
            onChange={importJSON}
            className="hidden"
          />
          <span className="px-2 py-1 border">Import JSON</span>
        </label>
      </div>
    </div>
    </DensityWrapper>
  );
};

export default KeyboardShortcuts;
