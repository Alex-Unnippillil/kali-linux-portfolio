"use client";

import { useEffect, useState } from "react";
import { isBrowser } from "@/utils/env";

interface Step {
  selector: string;
  message: string;
  action?: () => void;
}

const STORAGE_KEY = "desktopTourSeen";

export default function DesktopTour({ showAllApps }: { showAllApps: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const steps: Step[] = [
    {
      selector: ".all-apps-anim",
      message: "App grid shows all installed applications.",
      action: () => {
        if (!document.querySelector(".all-apps-anim")) {
          showAllApps();
        }
      },
    },
    {
      selector: '.all-apps-anim input[aria-label="Search"]',
      message: "Search instantly filters apps.",
    },
    {
      selector: "#status-bar",
      message: "Open Quick Settings and more from here.",
      action: () => {
        if (document.querySelector(".all-apps-anim")) {
          showAllApps();
        }
      },
    },
    {
      selector: ".opened-window .right-0.top-0",
      message: "Window controls let you minimize, maximize, or close.",
    },
  ];

  useEffect(() => {
    if (!isBrowser()) return;
    const seen = window.localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setOpen(true);
    }
    const handler = () => {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {}
      setStep(0);
      setOpen(true);
    };
    window.addEventListener("show-welcome-tour", handler);
    return () => window.removeEventListener("show-welcome-tour", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const current = steps[step];
    current.action?.();
    const el = document.querySelector(current.selector) as HTMLElement | null;
    if (el) {
      el.classList.add("tour-highlight");
      el.scrollIntoView({ block: "center", inline: "center" });
    }
    return () => {
      el?.classList.remove("tour-highlight");
    };
  }, [open, step]);

  const next = () => {
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
    } else {
      finish();
    }
  };

  const skip = () => finish();

  const finish = () => {
    if (isBrowser()) {
      try {
        window.localStorage.setItem(STORAGE_KEY, "true");
      } catch {}
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none"
      aria-modal="true"
      role="dialog"
    >
      <div className="mb-6 w-full max-w-md rounded bg-black/70 p-4 text-white text-center pointer-events-auto">
        <p className="mb-4">{steps[step].message}</p>
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={skip}
            className="px-4 py-2 rounded bg-gray-600"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={next}
            className="px-4 py-2 rounded bg-blue-600"
          >
            {step === steps.length - 1 ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

