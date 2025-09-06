import { useEffect, useState } from 'react';
import { listEvents } from '../../utils/orage';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function CalendarPopup() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [eventsMap, setEventsMap] = useState({});
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    listEvents(year, month).then(evts => {
      const map = {};
      evts.forEach(e => {
        const dt = new Date(e.date || e.start || e); // support multiple shapes
        const key = dt.toISOString().slice(0,10);
        if (!map[key]) map[key] = [];
        map[key].push(e);
      });
      setEventsMap(map);
    }).catch(() => setEventsMap({}));
  }, [year, month]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const weeks = [];
  let day = 1 - firstDay;
  for (let w = 0; w < 6; w++) {
    const wk = [];
    for (let d = 0; d < 7; d++, day++) {
      wk.push(day > 0 && day <= daysInMonth ? day : null);
    }
    weeks.push(wk);
  }

  const selectedKey = selected ? selected.toISOString().slice(0,10) : null;
  const selectedEvents = selectedKey && eventsMap[selectedKey] ? eventsMap[selectedKey] : [];

  return (
    <div className="absolute right-0 mt-2 p-2 bg-neutral-900 text-white border border-neutral-700 rounded shadow-lg z-50 w-64">
      <div className="flex justify-between items-center mb-2 text-sm">
        <button onClick={() => setMonth(m => (m === 0 ? 11 : m - 1))}>◀</button>
        <div>{MONTHS[month]} {year}</div>
        <button onClick={() => setMonth(m => (m === 11 ? 0 : m + 1))}>▶</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs text-center">
        {DAYS.map(d => <div key={d} className="font-bold">{d}</div>)}
        {weeks.map((wk,i) => wk.map((d,j) => {
          const date = d ? new Date(year, month, d) : null;
          const key = date ? date.toISOString().slice(0,10) : null;
          const has = key && eventsMap[key];
          return (
            <button
              key={`${i}-${j}`}
              className={`w-8 h-8 relative rounded ${d ? 'hover:bg-neutral-700 focus:bg-neutral-700' : ''}`}
              disabled={!d}
              onClick={() => date && setSelected(date)}
            >
              {d || ''}
              {has && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-500"></span>}
            </button>
          );
        }))}
      </div>
      <div className="mt-2 max-h-32 overflow-auto text-xs">
        {selectedEvents.length ? selectedEvents.map((e,i) => (
          <div key={i} className="border-t border-neutral-700 pt-1 mt-1">
            <div className="font-semibold">{e.title || e.summary || 'Event'}</div>
            {e.description && <div>{e.description}</div>}
          </div>
        )) : <div>No events</div>}
      </div>
    </div>
  );
}

