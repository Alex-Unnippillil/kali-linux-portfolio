import React from 'react';
import { useAppDispatch } from '../../src/context/AppState';

export default function Window({ id, title, minimized, isFocused }) {
  const dispatch = useAppDispatch();

  const closeWindow = () => dispatch({ type: 'CLOSE_WINDOW', id });
  const minimizeWindow = () => dispatch({ type: 'MINIMIZE_WINDOW', id, minimized: !minimized });
  const focusWindow = () => dispatch({ type: 'FOCUS_WINDOW', id });

  return (
    <div className={`window border ${isFocused ? 'focused' : ''} ${minimized ? 'hidden' : ''}`} onClick={focusWindow}>
      <div className="title-bar flex justify-between bg-gray-800 text-white p-1">
        <span>{title}</span>
        <span>
          <button onClick={minimizeWindow} className="mr-2">_</button>
          <button onClick={closeWindow}>x</button>
        </span>
      </div>
      <div className="p-2">
        {/* window content placeholder */}
      </div>
    </div>
  );
}
