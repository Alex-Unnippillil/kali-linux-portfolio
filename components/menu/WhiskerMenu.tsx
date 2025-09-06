'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import apps from '../../apps.config';
import { safeLocalStorage } from '../../utils/safeStorage';

interface AppItem {
  id: string;
  title: string;
  icon: string;
}

const CATEGORIES = ['Favorites', 'Recent', 'All'] as const;
type Category = typeof CATEGORIES[number];

export default function WhiskerMenu() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [category, setCategory] = useState<Category>('Favorites');
  const [selected, setSelected] = useState(0);
  const [sidebarIndex, setSidebarIndex] = useState(0);
  const [focus, setFocus] = useState<'search' | 'sidebar' | 'list'>('search');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fav = safeLocalStorage?.getItem('whisker-favorites');
    if (fav) {
      try {
        setFavorites(JSON.parse(fav));
      } catch {
        /* noop */
      }
    } else {
      const defaults = apps.slice(0, 5).map((a) => a.id);
      setFavorites(defaults);
      safeLocalStorage?.setItem('whisker-favorites', JSON.stringify(defaults));
    }
    const rec = safeLocalStorage?.getItem('whisker-recents');
    if (rec) {
      try {
        setRecent(JSON.parse(rec));
      } catch {
        /* noop */
      }
    }
  }, []);

  const allApps: AppItem[] = apps.map(({ id, title, icon }) => ({ id, title, icon }));
  const filtered = allApps.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()));

  const appsForCategory = (): AppItem[] => {
    if (category === 'Favorites') {
      return favorites
        .map((id) => filtered.find((a) => a.id === id))
        .filter((a): a is AppItem => Boolean(a));
    }
    if (category === 'Recent') {
      return recent
        .map((id) => filtered.find((a) => a.id === id))
        .filter((a): a is AppItem => Boolean(a));
    }
    return filtered;
  };

  const appsToShow = appsForCategory();

  const handleOpen = (id: string) => {
    window.dispatchEvent(new CustomEvent('open-app', { detail: id }));
    setOpen(false);
    setRecent((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, 10);
      safeLocalStorage?.setItem('whisker-recents', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Meta') {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (!open) return;
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (focus === 'search') {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          setFocus('list');
        } else if (e.key === 'ArrowLeft') {
          setFocus('sidebar');
        }
      } else if (focus === 'sidebar') {
        if (e.key === 'ArrowDown') {
          setSidebarIndex((i) => (i + 1) % CATEGORIES.length);
          setCategory(CATEGORIES[(sidebarIndex + 1) % CATEGORIES.length]);
        } else if (e.key === 'ArrowUp') {
          setSidebarIndex((i) => (i - 1 + CATEGORIES.length) % CATEGORIES.length);
          setCategory(CATEGORIES[(sidebarIndex - 1 + CATEGORIES.length) % CATEGORIES.length]);
        } else if (e.key === 'ArrowRight') {
          setFocus('list');
        } else if (e.key === 'Enter' || e.key === ' ') {
          setFocus('list');
        }
      } else if (focus === 'list') {
        if (e.key === 'ArrowDown') {
          setSelected((s) => (s + 1) % appsToShow.length);
        } else if (e.key === 'ArrowUp') {
          setSelected((s) => (s - 1 + appsToShow.length) % appsToShow.length);
        } else if (e.key === 'ArrowLeft') {
          setFocus('sidebar');
        } else if (e.key === 'Enter') {
          const app = appsToShow[selected];
          if (app) handleOpen(app.id);
        }
      }
    };
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [open, focus, appsToShow, selected, sidebarIndex]);

  useEffect(() => {
    if (open) {
      setFocus('search');
      setSelected(0);
      inputRef.current?.focus();
    }
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Applications menu"
        onClick={() => setOpen((o) => !o)}
        className="pl-3 pr-1 py-1 outline-none focus:outline-none"
      >
        <Image
          src="/themes/Yaru/status/emblem-system-symbolic.svg"
          alt="Menu"
          width={16}
          height={16}
          className="w-4 h-4"
        />
      </button>
      {open && (
        <div className="fixed left-2 bottom-2 z-50 w-[28rem] h-[22rem] bg-ub-grey text-white shadow-lg flex">
          <div className="w-28 bg-ub-warm-grey flex flex-col overflow-y-auto">
            {CATEGORIES.map((cat, idx) => (
              <button
                key={cat}
                className={`text-left px-3 py-2 focus:outline-none ${
                  idx === sidebarIndex ? 'bg-ub-cool-grey' : 'hover:bg-ub-cool-grey'
                }`}
                onClick={() => {
                  setSidebarIndex(idx);
                  setCategory(cat);
                  setFocus('list');
                }}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex-1 p-3 flex flex-col">
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelected(0);
              }}
              placeholder="Search"
              className="mb-2 px-2 py-1 rounded text-black"
            />
            <ul className="overflow-y-auto flex-1">
              {appsToShow.map((app, idx) => (
                <li
                  key={app.id}
                  className={`flex items-center px-2 py-1 cursor-pointer ${
                    idx === selected ? 'bg-ub-cool-grey' : 'hover:bg-ub-cool-grey'
                  }`}
                  onMouseEnter={() => setSelected(idx)}
                  onClick={() => handleOpen(app.id)}
                >
                  <Image src={app.icon} alt={app.title} width={24} height={24} className="mr-2" />
                  {app.title}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

