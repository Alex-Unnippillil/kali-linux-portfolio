'use client';

import React from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  name: string;
  synopsis: string;
  description: string;
}

export default function ManDrawer({
  open,
  onClose,
  name,
  synopsis,
  description,
}: Props) {
  return (
    <div
      className={`fixed inset-0 bg-black/50 transition-opacity ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose}
    >
      <div
        className={`absolute right-0 top-0 h-full w-80 bg-gray-900 p-4 overflow-y-auto transform transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <section id="name" className="mb-4">
          <h2 className="text-lg font-bold mb-1">NAME</h2>
          <p>{name}</p>
        </section>
        <section id="synopsis" className="mb-4">
          <h2 className="text-lg font-bold mb-1">SYNOPSIS</h2>
          <pre className="whitespace-pre-wrap">{synopsis}</pre>
        </section>
        <section id="description">
          <h2 className="text-lg font-bold mb-1">DESCRIPTION</h2>
          <p className="whitespace-pre-wrap">{description}</p>
        </section>
      </div>
    </div>
  );
}

