import React, { useEffect, useState } from 'react';
import apps from '../../apps.config';
import UbuntuApp from '../base/ubuntu_app';

const FAVORITES_KEY = 'xfce.whisker.favorites';

interface AppInfo {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
}

interface WhiskerMenuProps {
  openApp?: (id: string) => void;
}

const WhiskerMenu: React.FC<WhiskerMenuProps> = ({ openApp }) => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [context, setContext] = useState<{ id: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(FAVORITES_KEY);
        if (stored) {
          setFavorites(JSON.parse(stored));
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const persist = (list: string[]) => {
    setFavorites(list);
    if (typeof window !== 'undefined') {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
    }
  };

  const addFavorite = (id: string) => {
    if (!favorites.includes(id)) {
      persist([...favorites, id]);
    }
  };

  const removeFavorite = (id: string) => {
    if (favorites.includes(id)) {
      persist(favorites.filter((f) => f !== id));
    }
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setContext({ id, x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContext(null);

  const handleAction = () => {
    if (!context) return;
    if (favorites.includes(context.id)) {
      removeFavorite(context.id);
    } else {
      addFavorite(context.id);
    }
    closeContextMenu();
  };

  const renderContextMenu = () => {
    if (!context) return null;
    const isFav = favorites.includes(context.id);
    return (
      <ul
        className="absolute z-50 w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-2 text-sm"
        style={{ top: context.y, left: context.x }}
        role="menu"
        onContextMenu={(e) => e.preventDefault()}
      >
        <li>
          <button
            type="button"
            className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            onClick={handleAction}
            role="menuitem"
            aria-label={isFav ? 'Remove from Favorites' : 'Add to Favorites'}
          >
            <span className="ml-5">{isFav ? 'Remove from Favorites' : 'Add to Favorites'}</span>
          </button>
        </li>
      </ul>
    );
  };

  const getApp = (id: string): AppInfo | undefined => {
    return (apps as AppInfo[]).find((a) => a.id === id);
  };

  return (
    <div className="flex" onClick={closeContextMenu}>
      <div className="w-1/4 pr-2 border-r">
        {favorites.map((id) => {
          const app = getApp(id);
          if (!app) return null;
          return (
            <div key={id} onContextMenu={(e) => handleContextMenu(e, id)}>
              <UbuntuApp
                id={app.id}
                icon={app.icon}
                name={app.title}
                openApp={openApp || (() => {})}
              />
            </div>
          );
        })}
      </div>
      <div className="flex-1 pl-2">
        {(apps as AppInfo[]).map((app) => (
          <div key={app.id} onContextMenu={(e) => handleContextMenu(e, app.id)}>
            <UbuntuApp
              id={app.id}
              icon={app.icon}
              name={app.title}
              openApp={openApp || (() => {})}
            />
          </div>
        ))}
      </div>
      {renderContextMenu()}
    </div>
  );
};

export default WhiskerMenu;

