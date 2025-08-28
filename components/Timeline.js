import React, { useRef } from 'react';

/**
 * Timeline component rendering events with keyboard navigation.
 * @param {{events: {date: string, title: string, description: string, skills: string[]}[]}} props
 */
export default function Timeline({ events = [] }) {
  const itemRefs = useRef([]);

  const setRef = (el, idx) => {
    itemRefs.current[idx] = el;
  };

  const onKeyDown = (e, idx) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      itemRefs.current[idx + 1]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      itemRefs.current[idx - 1]?.focus();
    }
  };

  const emitSkill = (skill) => {
    window.dispatchEvent(new CustomEvent('skill-filter', { detail: skill }));
  };

  return (
    <ol className="timeline">
      {events.map((ev, idx) => (
        <li
          key={ev.date + ev.title}
          tabIndex={0}
          ref={(el) => setRef(el, idx)}
          onKeyDown={(e) => onKeyDown(e, idx)}
          className="timeline-item focus:outline-none"
        >
          <div className="timeline-date font-bold">{ev.date}</div>
          <div className="timeline-content ml-2">
            <div className="timeline-title">{ev.title}</div>
            {ev.description && <p className="timeline-desc">{ev.description}</p>}
            {ev.skills && ev.skills.length > 0 && (
              <div className="skills mt-1 flex flex-wrap gap-1">
                {ev.skills.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    className="skill-button px-2 py-0.5 bg-gray-700 rounded text-xs"
                    onClick={() => emitSkill(skill)}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

