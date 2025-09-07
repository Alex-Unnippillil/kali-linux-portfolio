"use client";

import { useEffect, useState } from "react";
import Modal from "../base/Modal";
import { isBrowser } from '@/utils/env';

export default function KaliWelcome() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isBrowser()) return;
    const seen = window.localStorage.getItem("kaliWelcomeSeen");
    if (!seen) {
      setOpen(true);
    }
  }, []);

  const close = () => {
    setOpen(false);
    if (isBrowser()) {
      window.localStorage.setItem("kaliWelcomeSeen", "true");
    }
  };

  const next = () => setStep((s) => Math.min(s + 1, 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const openLink = (url: string) => () => window.open(url, "_blank", "noopener,noreferrer");

  return (
    <Modal isOpen={open} onClose={close}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={close}>
        <div
          className="bg-white text-black p-6 rounded shadow max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {step === 0 && (
            <div>
              <h2 className="text-xl mb-4">About Kali</h2>
              <p className="mb-4">
                Welcome to Kali Linux Portfolio—an unofficial project not affiliated with Kali Linux or Offensive Security.
              </p>
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={openLink("/docs")}
                  className="px-3 py-1 bg-blue-600 text-white rounded"
                >
                  Docs
                </button>
                <button
                  type="button"
                  onClick={openLink("/tools")}
                  className="px-3 py-1 bg-blue-600 text-white rounded"
                >
                  Tools
                </button>
                <button
                  type="button"
                  onClick={openLink("/tweaks")}
                  className="px-3 py-1 bg-blue-600 text-white rounded"
                >
                  Tweaks
                </button>
              </div>
              <div className="text-right">
                <button
                  type="button"
                  onClick={next}
                  className="px-4 py-2 bg-blue-500 text-white rounded"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          {step === 1 && (
            <div>
              <h2 className="text-xl mb-4">Shortcuts</h2>
              <ul className="list-disc pl-5 mb-4">
                <li>Press ? for help</li>
                <li>Press / to search</li>
              </ul>
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={back}
                  className="px-4 py-2 bg-gray-200 rounded"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="px-4 py-2 bg-blue-500 text-white rounded"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

