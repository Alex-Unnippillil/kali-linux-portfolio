'use client';

import React, { useState } from 'react';
import { OverlayMount } from '../../components/common/OverlayHost';

const buttonClass =
  'rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300';
const secondaryButtonClass =
  'rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300';

const OverlayHarness: React.FC = () => {
  const [outerOpen, setOuterOpen] = useState(false);
  const [innerOpen, setInnerOpen] = useState(false);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-4 text-white">
      <h1 className="text-2xl font-semibold">Overlay accessibility harness</h1>
      <p className="max-w-xl text-center text-sm text-slate-300">
        This page exists for automated tests to verify focus management and accessibility behaviour when nested modals are open.
      </p>
      <button
        id="open-outer"
        type="button"
        onClick={() => setOuterOpen(true)}
        className={buttonClass}
      >
        Open outer modal
      </button>

      <OverlayMount
        open={outerOpen}
        options={{ trapFocus: true, inertRoot: () => document.querySelector('main') as HTMLElement | null }}
      >
        {({ close }) => (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 px-4" role="presentation">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="outer-modal-title"
              className="w-full max-w-md rounded-lg bg-white p-6 text-slate-900 shadow-xl"
            >
              <h2 id="outer-modal-title" className="text-xl font-semibold text-slate-900">
                Outer modal
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Use this modal to launch a second dialog and ensure overlays restore focus correctly.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  id="open-inner"
                  type="button"
                  className={buttonClass}
                  onClick={() => setInnerOpen(true)}
                >
                  Open inner modal
                </button>
                <button
                  id="outer-close"
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => {
                    setInnerOpen(false);
                    setOuterOpen(false);
                    close();
                  }}
                >
                  Close outer modal
                </button>
              </div>
            </div>
          </div>
        )}
      </OverlayMount>

      <OverlayMount open={innerOpen} options={{ trapFocus: true }}>
        {({ close }) => (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 px-4" role="presentation">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="inner-modal-title"
              className="w-full max-w-sm rounded-lg bg-white p-5 text-slate-900 shadow-lg"
            >
              <h2 id="inner-modal-title" className="text-lg font-semibold text-slate-900">
                Inner modal
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Close this dialog to verify focus returns to the launch button in the outer modal.
              </p>
              <div className="mt-4 flex justify-end">
                <button
                  id="inner-close"
                  type="button"
                  className={buttonClass}
                  onClick={() => {
                    setInnerOpen(false);
                    close();
                  }}
                >
                  Close inner modal
                </button>
              </div>
            </div>
          </div>
        )}
      </OverlayMount>
    </main>
  );
};

export default OverlayHarness;
