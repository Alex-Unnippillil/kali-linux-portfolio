import React, { useEffect, useState } from 'react';

const NotesApp = () => {
  const [text, setText] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('notes');
    if (saved !== null) {
      setText(saved);
    }
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    setText(value);
    localStorage.setItem('notes', value);
  };

  return (
    <div className="h-full w-full bg-ub-cool-grey text-white">
      <textarea
        className="w-full h-full bg-transparent resize-none outline-none p-2"
        value={text}
        onChange={handleChange}
        spellCheck="false"
      />
    </div>
  );
};

export default NotesApp;

export const displayNotes = () => <NotesApp />;

