import React, { useState } from 'react';
import Image from 'next/image';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import apps from '../../apps.config';

export default function XfceNavbar({ openApp }) {
  const pinnedApps = apps.filter(app => app.favourite);
  const [workspace, setWorkspace] = useState(1);

  return (
    <nav
      role="navigation"
      className="fixed top-0 left-0 w-full h-10 bg-gray-900/95 border-b border-gray-700 flex items-center justify-between z-50 text-gray-100 select-none"
    >
      <div className="flex items-center h-full">
        <button
          type="button"
          aria-label="Applications"
          className="px-3 h-full hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Applications
        </button>
        {pinnedApps.map(app => (
          <button
            key={app.id}
            type="button"
            aria-label={app.title}
            onClick={() => openApp?.(app.id)}
            className="h-full px-2 flex items-center hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Image
              src={app.icon.replace('./', '/')}
              alt=""
              width={24}
              height={24}
              className="w-5 h-5"
              sizes="24px"
            />
          </button>
        ))}
      </div>
      <div className="flex items-center h-full">
        {[1, 2, 3, 4].map(n => (
          <button
            key={n}
            type="button"
            aria-label={`Workspace ${n}`}
            onClick={() => setWorkspace(n)}
            className={`mx-1 w-6 h-6 rounded text-xs flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              workspace === n ? 'bg-white/20' : 'hover:bg-white/10'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex items-center h-full pr-2">
        <div className="mx-2 text-xs">
          <Clock />
        </div>
        <div className="mx-2">
          <Status />
        </div>
      </div>
    </nav>
  );
}

