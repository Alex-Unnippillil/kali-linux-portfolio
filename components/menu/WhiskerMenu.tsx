'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import UbuntuApp from '../base/ubuntu_app';
import apps, { utilities, games } from '../../apps.config';
import { safeLocalStorage } from '../../utils/safeStorage';
import type { AppMeta } from '../../types/app';

import { readRecentAppIds } from '../../utils/recentStorage';

type AppMeta = {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
};

const FILTER_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'recent', label: 'Recent' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'games', label: 'Games' },
] as const;

const KALI_CATEGORIES = [
  { id: 'information-gathering', label: 'Information Gathering', number: '01' },
  { id: 'vulnerability-analysis', label: 'Vulnerability Analysis', number: '02' },
  { id: 'web-application-analysis', label: 'Web Application Analysis', number: '03' },
  { id: 'database-assessment', label: 'Database Assessment', number: '04' },
  { id: 'password-attacks', label: 'Password Attacks', number: '05' },
  { id: 'wireless-attacks', label: 'Wireless Attacks', number: '06' },
  { id: 'reverse-engineering', label: 'Reverse Engineering', number: '07' },
  { id: 'exploitation-tools', label: 'Exploitation Tools', number: '08' },
  { id: 'sniffing-spoofing', label: 'Sniffing & Spoofing', number: '09' },
  { id: 'post-exploitation', label: 'Post Exploitation', number: '10' },
  { id: 'forensics', label: 'Forensics', number: '11' },
  { id: 'reporting-tools', label: 'Reporting Tools', number: '12' },
  { id: 'social-engineering-tools', label: 'Social Engineering Tools', number: '13' },
  { id: 'hardware-hacking', label: 'Hardware Hacking', number: '14' },
] as const;

type FilterCategory = (typeof FILTER_CATEGORIES)[number]['id'];

const TRANSITION_DURATION = 200;

const WhiskerMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FilterCategory>('all');

  const [query, setQuery] = useState('');
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [highlight, setHighlight] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allApps: AppMeta[] = apps as any;
  const favoriteApps = useMemo(() => allApps.filter(a => a.favourite), [allApps]);

  useEffect(() => {
    setRecentIds(readRecentAppIds());
  }, []);

  useEffect(() => {
    if (!open) return;
    setRecentIds(readRecentAppIds());
  }, [open]);

  const recentApps = useMemo(() => {
    if (!open) {
      return [];
    }
    try {
      const ids: string[] = JSON.parse(safeLocalStorage?.getItem('recentApps') || '[]');
      const mapped = ids
        .map(id => allApps.find(a => a.id === id))
        .filter(Boolean) as AppMeta[];
      setRecentApps(mapped);
    } catch {
      setRecentApps([]);
    }
  }, [allApps, open]);

  const utilityApps: AppMeta[] = utilities as any;
  const gameApps: AppMeta[] = games as any;

  const currentApps = useMemo(() => {
    let list: AppMeta[];
    switch (category) {
      case 'favorites':
        list = favoriteApps;
        break;
      case 'recent':
        list = recentApps;
        break;
      case 'utilities':
        list = utilityApps;
        break;
      case 'games':
        list = gameApps;
        break;
      default:
        list = allApps;
    }
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q));
    }
    return list;
  }, [category, query, allApps, favoriteApps, recentApps, utilityApps, gameApps]);

  useEffect(() => {
    if (!isVisible) return;
    setHighlight(0);
  }, [isVisible, category, query]);

  const openSelectedApp = (id: string) => {
    window.dispatchEvent(new CustomEvent('open-app', { detail: id }));
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen && isVisible) {
      hideTimer.current = setTimeout(() => {
        setIsVisible(false);
      }, TRANSITION_DURATION);
      return () => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
      };
    }
    if (isOpen) {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    }
    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };
  }, [isOpen, isVisible]);

  const showMenu = useCallback(() => {
    setIsVisible(true);
    requestAnimationFrame(() => setIsOpen(true));
  }, []);

  const hideMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleMenu = useCallback(() => {
    if (isOpen || isVisible) {
      hideMenu();
    } else {
      showMenu();
    }
  }, [hideMenu, isOpen, isVisible, showMenu]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Meta' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        toggleMenu();
        return;
      }
      if (!isVisible) return;
      if (e.key === 'Escape') {
        hideMenu();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight(h => Math.min(h + 1, currentApps.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight(h => Math.max(h - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const app = currentApps[highlight];
        if (app) openSelectedApp(app.id);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentApps, highlight, hideMenu, isVisible, toggleMenu]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!isVisible) return;
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        hideMenu();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [hideMenu, isVisible]);

  useEffect(() => () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    try {
      const ids: string[] = JSON.parse(safeLocalStorage?.getItem('recentApps') || '[]');
      setRecentApps(ids.map(id => allApps.find(a => a.id === id)).filter(Boolean) as AppMeta[]);
    } catch {
      setRecentApps([]);
    }
  }, [allApps, isVisible]);

  return (
    <div className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        className="pl-3 pr-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1"
      >
        <Image
          src="/themes/Yaru/status/decompiler-symbolic.svg"
          alt="Menu"
          width={16}
          height={16}
          className="inline mr-1"
        />
        Applications
      </button>
      {isVisible && (
        <div
          ref={menuRef}
          className={`absolute left-0 mt-1 z-50 flex w-[520px] bg-ub-grey text-white shadow-lg rounded-md overflow-hidden transition-all duration-200 ease-out ${
            isOpen ? 'opacity-100 translate-y-0 scale-100' : 'pointer-events-none opacity-0 -translate-y-2 scale-95'
          }`}
          style={{ transitionDuration: `${TRANSITION_DURATION}ms` }}
          tabIndex={-1}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              hideMenu();
            }
          }}
        >
          <div className="flex flex-col bg-gray-800 p-2">
            {FILTER_CATEGORIES.map(cat => (

              <button
                key={cat.id}
                className={`text-left px-3 py-2 rounded transition-colors duration-150 ${
                  category === cat.id ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
                onClick={() => setCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
            <div className="mt-4 border-t border-gray-700 pt-3">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Kali Linux Groups</p>
              <ul className="space-y-1 text-sm">
                {KALI_CATEGORIES.map((cat) => (
                  <li key={cat.id} className="flex items-baseline text-gray-300">
                    <span className="font-mono text-ubt-blue mr-2 w-8">{cat.number}</span>
                    <span>{cat.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex-1 p-4">
            <input
              className="mb-4 w-full px-3 py-2 rounded bg-black bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-ubt-cream"
              placeholder="Search"
              aria-label="Search applications"
              value={query}
              aria-label="Search applications"
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
              {currentApps.map((app, idx) => (
                <div
                  key={app.id}
                  className={`rounded transition ring-offset-2 ${
                    idx === highlight ? 'ring-2 ring-ubb-orange ring-offset-gray-900' : 'ring-0'
                  }`}
                >
                  <UbuntuApp
                    id={app.id}
                    icon={app.icon}
                    name={app.title}
                    openApp={() => openSelectedApp(app.id)}
                    disabled={app.disabled}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhiskerMenu;
