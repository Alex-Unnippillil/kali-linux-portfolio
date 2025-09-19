"use client";

import { useState } from "react";
import Modal from "../../../components/base/Modal";
import { resetSettings } from "../../../utils/settingsStore";
import { useSettings } from "../../../hooks/useSettings";
import useSession from "../../../hooks/useSession";
import useProfiles from "../../../hooks/useProfiles";

const CONFIRM_CODE = "DELETE";

const DATA_SUMMARY = [
  {
    title: "Desktop session",
    description:
      "Open windows, dock favourites, and window positions saved for quick resume.",
  },
  {
    title: "Appearance & accessibility",
    description:
      "Theme, wallpaper, accent colour, motion preferences, and accessibility options including safe mode toggles.",
  },
  {
    title: "Device and simulation profiles",
    description:
      "Bluetooth captures, router profiles, and other operational data cached in the browser's file system.",
  },
  {
    title: "Offline caches",
    description:
      "Local storage, session data, and cached game saves created across Kali Linux Portfolio apps.",
  },
] as const;

type Step = "closed" | "summary" | "confirm";

export default function ConsentCenter() {
  const { resetToDefaults } = useSettings();
  const { resetSession } = useSession();
  const { clearProfiles } = useProfiles();
  const [step, setStep] = useState<Step>("closed");
  const [confirmText, setConfirmText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const closeModal = () => {
    if (isProcessing) return;
    setStep("closed");
    setConfirmText("");
    setError(null);
  };

  const openModal = () => {
    setStatusMessage(null);
    setError(null);
    setConfirmText("");
    setStep("summary");
  };

  const goToConfirm = () => {
    setError(null);
    setStep("confirm");
  };

  const goToSummary = () => {
    if (isProcessing) return;
    setError(null);
    setStep("summary");
  };

  const handleDeletion = async () => {
    if (confirmText !== CONFIRM_CODE) return;
    setIsProcessing(true);
    setError(null);
    try {
      await clearProfiles();
      resetSession();
      await resetSettings();
      if (typeof window !== "undefined") {
        try {
          window.localStorage.clear();
        } catch {
          // ignore storage errors
        }
        if (typeof caches !== "undefined") {
          try {
            const keys = await caches.keys();
            await Promise.all(keys.map((key) => caches.delete(key)));
          } catch {
            // ignore cache errors
          }
        }
      }
      resetToDefaults();
      setStatusMessage(
        "All local data has been removed and the desktop has been returned to its default state."
      );
      setStep("closed");
      setConfirmText("");
    } catch (err) {
      console.error(err);
      setError("Unable to clear saved data. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section className="mx-auto mb-6 w-full max-w-2xl rounded border border-gray-900 bg-black/40 p-4 text-ubt-grey">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Consent Center</h3>
          <p className="mt-2 text-sm">
            Review the personal data stored in this desktop and permanently delete it when needed.
          </p>
        </div>
        <button
          onClick={openModal}
          className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          Delete stored data
        </button>
      </div>
      {statusMessage && (
        <p role="status" className="mt-4 rounded border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-300">
          {statusMessage}
        </p>
      )}

      <Modal isOpen={step !== "closed"} onClose={closeModal}>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded border border-gray-800 bg-ub-cool-grey p-6 text-white shadow-xl">
            {step === "summary" && (
              <>
                <h4 className="text-xl font-semibold">Review data for removal</h4>
                <p className="mt-2 text-sm text-ubt-grey">
                  The following categories of locally stored data will be permanently deleted. This cannot be undone.
                </p>
                <ul className="mt-4 space-y-3 text-sm text-ubt-grey">
                  {DATA_SUMMARY.map((item) => (
                    <li key={item.title} className="rounded border border-gray-800/60 bg-black/30 p-3">
                      <p className="font-semibold text-white">{item.title}</p>
                      <p className="mt-1 leading-relaxed">{item.description}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={closeModal}
                    className="rounded border border-gray-700 px-4 py-2 text-sm text-ubt-grey hover:bg-black/40"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={goToConfirm}
                    className="rounded bg-ub-orange px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}
            {step === "confirm" && (
              <>
                <h4 className="text-xl font-semibold">Confirm deletion</h4>
                <p className="mt-2 text-sm text-ubt-grey">
                  Type <span className="font-semibold text-white">{CONFIRM_CODE}</span> to confirm you want to permanently delete this data.
                </p>
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder={`Type ${CONFIRM_CODE}`}
                  className="mt-4 w-full rounded border border-gray-700 bg-black/60 p-2 text-sm uppercase tracking-[0.2em] placeholder:text-ubt-grey focus:border-ub-orange focus:outline-none"
                  aria-label={`Type ${CONFIRM_CODE} to confirm deletion`}
                  disabled={isProcessing}
                />
                {error && (
                  <p role="alert" className="mt-3 text-sm text-red-400">
                    {error}
                  </p>
                )}
                <div className="mt-6 flex justify-between gap-3">
                  <button
                    onClick={goToSummary}
                    className="rounded border border-gray-700 px-4 py-2 text-sm text-ubt-grey hover:bg-black/40"
                    disabled={isProcessing}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleDeletion}
                    disabled={confirmText !== CONFIRM_CODE || isProcessing}
                    className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {isProcessing ? "Deleting…" : "Delete everything"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </Modal>
    </section>
  );
}
