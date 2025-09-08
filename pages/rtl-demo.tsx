import { useState } from 'react';
import Header from '../components/layout/Header';
import Sidebar from '../components/filemanager/Sidebar';
import { CloseIcon, MaximizeIcon, MinimizeIcon } from '../components/ToolbarIcons';

export default function RtlDemo() {
  const [rtl, setRtl] = useState(false);

  const devices = [
    { id: '1', name: 'usb', label: 'USB Drive' },
    { id: '2', name: 'sd', label: 'SD Card' },
  ];

  return (
    <div className="min-h-screen flex flex-col" dir={rtl ? 'rtl' : 'ltr'}>
      <Header />
      <div className="p-4">
        <button
          type="button"
          className="px-2 py-1 border rounded"
          onClick={() => setRtl((v) => !v)}
        >
          Toggle RTL
        </button>
      </div>
      <div className="flex flex-1 rtl:flex-row-reverse">
        <Sidebar devices={devices} />
        <div className="flex-1 p-4 space-y-4">
          <div className="flex items-center justify-end gap-2 rtl:justify-start">
            <button aria-label="Minimize"><MinimizeIcon /></button>
            <button aria-label="Maximize"><MaximizeIcon /></button>
            <button aria-label="Close"><CloseIcon /></button>
          </div>
          <article className="prose rtl:prose-rtl">
            <h1>Typography Demo</h1>
            <p>
              This text demonstrates how content flips when using right-to-left direction.
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}
