import React, { useState } from 'react';

const NotesPanel = ({ currentAddr, notes, onAddNote, themeTokens }) => {
  const [noteText, setNoteText] = useState('');

  const handleSave = () => {
    if (!currentAddr || !noteText.trim()) return;
    onAddNote(currentAddr, noteText.trim());
    setNoteText('');
  };

  return (
    <div id="tab-panel-notes" role="tabpanel" className="space-y-4">
      <section
        className="rounded-xl border p-4 space-y-3"
        style={{
          backgroundColor: themeTokens.panel,
          border: `1px solid ${themeTokens.border}`,
        }}
      >
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            Notes
          </h2>
          <span className="text-xs font-mono">
            {currentAddr || 'No selection'}
          </span>
        </header>
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder={
            currentAddr ? 'Add note for selected address' : 'Select an address first'
          }
          className="w-full p-2 rounded"
          aria-label={
            currentAddr ? `Add note for ${currentAddr}` : 'Add note'
          }
          style={{
            backgroundColor: themeTokens.panel,
            color: themeTokens.text,
            border: `1px solid ${themeTokens.border}`,
          }}
        />
        <button
          onClick={handleSave}
          className="px-3 py-1 rounded self-end"
          style={{
            backgroundColor: themeTokens.panel,
            color: themeTokens.text,
            border: `1px solid ${themeTokens.border}`,
          }}
          disabled={!currentAddr || !noteText.trim()}
        >
          Save Note
        </button>
      </section>

      {notes.length > 0 && (
        <section
          className="rounded-xl border p-4 space-y-2"
          style={{
            backgroundColor: themeTokens.panel,
            border: `1px solid ${themeTokens.border}`,
          }}
        >
          <h3 className="text-sm font-semibold uppercase tracking-wide">
            Saved Notes
          </h3>
          <ul className="space-y-1 text-sm">
            {notes.map((note, index) => (
              <li key={`${note.addr}-${index}`} className="font-mono">
                {note.addr}: {note.text}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default NotesPanel;
