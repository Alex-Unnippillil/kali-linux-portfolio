"use client";

import React, { useEffect } from "react";
import Image from "next/image";

/**
 * BootingScreen
 * - Shows on first visit (controlled by parent via `visible`)
 * - Shows power button when `isShutDown` is true
 * - Calls `turnOn` when the power button is clicked or any key is pressed while shut down
 */
export default function BootingScreen({ visible, isShutDown, turnOn }) {
  // Enable keyboard/click to power on when in shut-down state
  useEffect(() => {
    if (!isShutDown) return;
    const handle = () => turnOn?.();
    window.addEventListener("keydown", handle);
    window.addEventListener("click", handle);
    return () => {
      window.removeEventListener("keydown", handle);
      window.removeEventListener("click", handle);
    };
  }, [isShutDown, turnOn]);

  const show = visible || isShutDown;

  return (
    <div
      style={{
        ...(show ? { zIndex: 100 } : { zIndex: -20 }),
        contentVisibility: "auto",
      }}
      className={[
        "fixed inset-0 m-0 p-0 h-screen w-screen overflow-hidden bg-black",
        "transition-opacity duration-700",
        show ? "opacity-100" : "opacity-0",
      ].join(" ")}
    >
      <div className="h-full w-full flex flex-col items-center justify-center gap-8 select-none">
        {!isShutDown ? (
          <>
            {/* Kali dragon mark */}
            <Image
              src="/themes/Yaru/status/icons8-kali-linux.svg"
              width={128}
              height={128}
              alt="Kali dragon mark"
              priority
            />

            {/* Spinner */}
            <div
              className="relative h-12 w-12"
              role="progressbar"
              aria-label="Booting Kali Linux"
            >
              {/* Track */}
              <div className="absolute inset-0 rounded-full border-4 border-zinc-700/40" />
              {/* Animated arc */}
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-white animate-spin" />
            </div>

            {/* Wordmark */}
            <Image
              src="/images/logos/logo_1200.png"
              width={360}
              height={80}
              alt="KALI LINUX"
              sizes="(max-width: 768px) 60vw, 360px"
              priority
            />

            <p className="text-zinc-400 text-xs tracking-widest">
              Initializing services…
            </p>
          </>
        ) : (
          <>
            {/* Power-on button when shut down */}
            <button
              type="button"
              onClick={turnOn}
              className="h-16 w-16 rounded-full outline-none ring-0 focus:ring-2 focus:ring-white/40 flex items-center justify-center bg-white/0 hover:bg-white/5 transition"
              aria-label="Power on"
            >
              <Image
                src="/themes/Yaru/status/power-button.svg"
                width={40}
                height={40}
                alt="Power"
                priority
              />
            </button>
            <p className="text-zinc-400 text-sm mt-4">Click to power on</p>
          </>
        )}
      </div>

      {/* Footer links */}
      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-3 text-white text-sm">
        <a
          className="underline"
          href="https://www.linkedin.com/in/unnippillil/"
          rel="noopener noreferrer"
          target="_blank"
        >
          linkedin
        </a>
        <span className="font-bold mx-1">|</span>
        <a
          className="underline"
          href="https://github.com/Alex-Unnippillil"
          rel="noopener noreferrer"
          target="_blank"
        >
          github
        </a>
      </div>
    </div>
  );
}

