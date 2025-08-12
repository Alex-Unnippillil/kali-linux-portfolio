import React, { useEffect } from 'react';
import apps from '../../apps.config';
import Window from '../base/window';
import { useAppState, useAppDispatch } from '../../src/context/AppState';

export default function Desktop() {
  const { windows, desktopShortcuts } = useAppState();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const shortcutIds = apps.filter(app => app.desktop_shortcut).map(app => app.id);
    dispatch({ type: 'SET_DESKTOP_SHORTCUTS', ids: shortcutIds });
    apps.filter(app => app.favourite).forEach(app => dispatch({ type: 'ADD_FAVORITE', id: app.id }));
  }, [dispatch]);

  const openApp = (id) => {
    dispatch({ type: 'OPEN_WINDOW', id });
    dispatch({ type: 'FOCUS_WINDOW', id });
  };

  return (
    <div className="desktop">
      <div className="shortcuts flex flex-wrap">
        {desktopShortcuts.map(id => (
          <button key={id} className="m-2 p-2 border" onClick={() => openApp(id)}>
            {apps.find(a => a.id === id)?.title || id}
          </button>
        ))}
      </div>
      {Object.entries(windows).map(([id, win]) => (
        win.isOpen && (
          <Window
            key={id}
            id={id}
            title={apps.find(a => a.id === id)?.title || id}
            minimized={win.isMinimized}
            isFocused={win.isFocused}
          />
        )
      ))}
    </div>
  );
}
