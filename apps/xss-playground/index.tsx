'use client';

import React from 'react';
import Image from 'next/image';

import LabHarness from '../../components/apps/xss-playground/LabHarness';

const XssPlaygroundApp: React.FC = () => {
  return (
    <div className="flex h-full w-full flex-col bg-ub-cool-grey text-white">
      <header className="flex items-center justify-between border-b border-black/40 bg-black/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <Image src="/themes/Yaru/apps/project-gallery.svg" alt="XSS Playground" width={40} height={40} />
          <div>
            <h1 className="text-xl font-semibold">XSS Playground</h1>
            <p className="text-xs text-gray-300">Explore reflected, stored, and DOM-based payload behavior safely.</p>
          </div>
        </div>
        <div className="flex gap-2 opacity-80">
          <img
            src="/themes/Yaru/window/window-minimize-symbolic.svg"
            alt="minimize"
            className="h-5 w-5"
          />
          <img src="/themes/Yaru/window/window-close-symbolic.svg" alt="close" className="h-5 w-5" />
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <LabHarness />
      </div>
    </div>
  );
};

export default XssPlaygroundApp;
