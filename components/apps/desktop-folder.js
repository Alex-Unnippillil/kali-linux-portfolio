"use client";

import React, { useMemo } from 'react';
import Image from 'next/image';

const normalizeIcon = (icon) => {
  if (!icon || typeof icon !== 'string') return '/themes/Yaru/system/folder.png';
  if (/^(https?:|data:)/i.test(icon)) return icon;
  const sanitized = icon.replace(/^\.\//, '').replace(/^\/+/, '');
  return sanitized.startsWith('/') ? sanitized : `/${sanitized}`;
};

const sortByTitle = (items = []) => {
  return items.slice().sort((a, b) => {
    const titleA = (a?.title || a?.id || '').toLowerCase();
    const titleB = (b?.title || b?.id || '').toLowerCase();
    if (titleA < titleB) return -1;
    if (titleA > titleB) return 1;
    return 0;
  });
};

const DesktopFolder = ({ context = {}, openApp }) => {
  const items = Array.isArray(context.folderItems) ? context.folderItems : [];
  const sortedItems = useMemo(() => sortByTitle(items), [items]);
  const handleOpen = (id) => {
    if (typeof openApp === 'function' && id) {
      openApp(id);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden text-white">
      <header className="border-b border-white/10 bg-black/40 px-5 py-4 backdrop-blur">
        <h2 className="text-lg font-semibold leading-tight">
          {context.folderTitle || 'Folder'}
        </h2>
        {context.folderDescription ? (
          <p className="mt-1 text-sm text-slate-200/75">
            {context.folderDescription}
          </p>
        ) : null}
      </header>
      <div className="flex-1 overflow-y-auto p-5">
        {sortedItems.length ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {sortedItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleOpen(item.id)}
                className="group flex flex-col items-center gap-2 rounded-md border border-white/10 bg-white/5 p-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 hover:border-white/20 hover:bg-white/10 sm:gap-3 sm:p-4"
              >
                <Image
                  src={normalizeIcon(item.icon)}
                  alt={item.title || item.id}
                  width={56}
                  height={56}
                  className="h-10 w-10 flex-shrink-0 rounded-md bg-black/10 object-contain drop-shadow sm:h-14 sm:w-14"
                />
                <span className="text-sm font-medium leading-tight text-white group-hover:text-sky-100">
                  {item.title || item.id}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/5 p-6 text-center text-sm text-slate-200/80">
            <p>No shortcuts in this folder yet.</p>
            <p className="mt-2 text-xs text-slate-200/60">
              Drag apps from the desktop or use the context menu to add them here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export const displayDesktopFolder = (addFolder, openApp, context) => (
  <DesktopFolder openApp={openApp} context={context} />
);

export default DesktopFolder;
