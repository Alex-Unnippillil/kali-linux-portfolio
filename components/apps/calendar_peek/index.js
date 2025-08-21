import React, { useState, useEffect } from 'react';

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CalendarPeek = () => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const [notes, setNotes] = useState({});

  // Load saved notes
  useEffect(() => {
    const stored = localStorage.getItem('calendar-peek-notes');
    if (stored) {
      try {
        setNotes(JSON.parse(stored));
      } catch {
        setNotes({});
      }
    }
  }, []);

  // Persist notes
  useEffect(() => {
    localStorage.setItem('calendar-peek-notes', JSON.stringify(notes));
  }, [notes]);

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const handleAddNote = (day) => {
    const key = `${currentYear}-${currentMonth + 1}-${day}`; // month 1-based
    const existing = notes[key] || '';
    const note = prompt('Add note', existing);
    if (note === null) return; // cancelled
    setNotes((prev) => {
      const next = { ...prev };
      if (note.trim()) next[key] = note.trim();
      else delete next[key];
      return next;
    });
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`blank-${i}`} />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${currentYear}-${currentMonth + 1}-${day}`;
    const note = notes[key];
    const isToday =
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear();
    cells.push(
      <div
        key={day}
        onClick={() => handleAddNote(day)}
        title={note || ''}
        className={[
          'p-2',
          'border',
          'border-gray-700',
          'cursor-pointer',
          'hover:bg-gray-700',
          'relative',
          isToday ? 'bg-blue-600 text-white' : '',
          !isToday && note ? 'bg-yellow-300 text-gray-900' : '',
        ].join(' ')}
      >
        {day}
      </div>
    );
  }

  const monthLabel = new Date(currentYear, currentMonth).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white p-4">
      <div className="text-center mb-2 font-bold">{monthLabel}</div>
      <div className="grid grid-cols-7 text-center mb-1">
        {daysOfWeek.map((d) => (
          <div key={d} className="font-semibold">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-grow">
        {cells}
      </div>
    </div>
  );
};

export default CalendarPeek;

