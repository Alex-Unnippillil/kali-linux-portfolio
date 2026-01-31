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
          <div className="grid grid-cols-3 gap-2 sm:gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {sortedItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleOpen(item.id)}
                title={item.title || item.id}
                className="group flex flex-col items-center justify-start gap-2 rounded-xl border border-transparent p-2 text-center transition-all duration-200 hover:bg-white/10 active:bg-white/20 active:scale-95 sm:p-4"
              >
                <div className="relative">
                  <Image
                    src={normalizeIcon(item.icon)}
                    alt={item.title || item.id}
                    width={56}
                    height={56}
                    className="h-10 w-10 object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-110 sm:h-14 sm:w-14"
                  />
                </div>
                <span className="w-full text-xs font-medium leading-tight text-slate-100 line-clamp-2 group-hover:text-white sm:text-sm">
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
