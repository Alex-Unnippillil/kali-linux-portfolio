import Head from "next/head";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Clock from "../components/util-components/clock";
import LockControls from "../components/apps/media/LockControls";
import { useSettings } from "../hooks/useSettings";
import { lockNotifications } from "../data/lockNotifications";

type UnlockStatus = "idle" | "processing" | "error" | "success";

type PlaylistEntry = {
  title: string;
  artist: string;
  album?: string;
  duration: number;
  accentColor: string;
};

const PLAYLIST: PlaylistEntry[] = [
  {
    title: "Zero-Day Dawn",
    artist: "Pulsewidth Collective",
    album: "Midnight Audit",
    duration: 242,
    accentColor: "#38bdf8",
  },
  {
    title: "Circuit Sleep",
    artist: "Aria Chen",
    album: "Blue Team Field Notes",
    duration: 214,
    accentColor: "#f97316",
  },
  {
    title: "Signals After Dark",
    artist: "Encrypted Choir",
    album: "Northern Node",
    duration: 198,
    accentColor: "#a855f7",
  },
];

const NON_TRIGGER_KEYS = new Set([
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "CapsLock",
  "Tab",
]);

const LockScreenPage = () => {
  const { wallpaper, showNotificationPreviews } = useSettings();
  const [trackIndex, setTrackIndex] = useState(0);
  const [elapsed, setElapsed] = useState(48);
  const [isPlaying, setIsPlaying] = useState(true);
  const [authVisible, setAuthVisible] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [unlockStatus, setUnlockStatus] = useState<UnlockStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const unlockButtonRef = useRef<HTMLButtonElement>(null);
  const passcodeRef = useRef<HTMLInputElement>(null);
  const verifyTimeout = useRef<number | null>(null);
  const resetTimeout = useRef<number | null>(null);

  const currentTrack = PLAYLIST[trackIndex] ?? PLAYLIST[0];

  useEffect(() => {
    unlockButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!authVisible) return;
    passcodeRef.current?.focus();
  }, [authVisible]);

  const clearTimers = useCallback(() => {
    if (verifyTimeout.current) {
      window.clearTimeout(verifyTimeout.current);
      verifyTimeout.current = null;
    }
    if (resetTimeout.current) {
      window.clearTimeout(resetTimeout.current);
      resetTimeout.current = null;
    }
  }, []);

  const closeAuth = useCallback(() => {
    clearTimers();
    setAuthVisible(false);
    setPasscode("");
    setUnlockStatus("idle");
    setErrorMessage(null);
  }, [clearTimers]);

  useEffect(() => {
    if (authVisible) return;

    const handlePointer = () => setAuthVisible(true);
    const handleKey = (event: KeyboardEvent) => {
      if (NON_TRIGGER_KEYS.has(event.key)) return;
      setAuthVisible(true);
    };

    window.addEventListener("pointerdown", handlePointer, { once: true });
    window.addEventListener("keydown", handleKey, { once: true });

    return () => {
      window.removeEventListener("pointerdown", handlePointer);
      window.removeEventListener("keydown", handleKey);
    };
  }, [authVisible]);

  useEffect(() => {
    if (!authVisible) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeAuth();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [authVisible, closeAuth]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      setElapsed((prev) => {
        const track = PLAYLIST[trackIndex];
        if (!track) return prev;
        const next = prev + 1;
        if (next >= track.duration) {
          setTrackIndex((index) => (index + 1) % PLAYLIST.length);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isPlaying, trackIndex]);

  const handleNext = useCallback(() => {
    setTrackIndex((index) => (index + 1) % PLAYLIST.length);
    setElapsed(0);
    setIsPlaying(true);
  }, []);

  const handlePrevious = useCallback(() => {
    setTrackIndex((index) => (index - 1 + PLAYLIST.length) % PLAYLIST.length);
    setElapsed(0);
    setIsPlaying(true);
  }, []);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const notifications = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });

    return [...lockNotifications]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .map((notification) => {
        const timeLabel = formatter.format(new Date(notification.timestamp));
        const hidden = Boolean(
          notification.sensitive && !showNotificationPreviews
        );
        const display =
          showNotificationPreviews || !notification.sensitive
            ? notification.message
            : notification.summary;
        return {
          ...notification,
          timeLabel,
          hidden,
          display,
        };
      });
  }, [showNotificationPreviews]);

  const hasHiddenContent = notifications.some((item) => item.hidden);

  const handleUnlock = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      clearTimers();
      if (!passcode.trim()) {
        setErrorMessage("Enter your passcode to continue.");
        setUnlockStatus("error");
        return;
      }
      setErrorMessage(null);
      setUnlockStatus("processing");
      verifyTimeout.current = window.setTimeout(() => {
        setUnlockStatus("success");
        resetTimeout.current = window.setTimeout(() => {
          closeAuth();
        }, 1400);
      }, 650);
    },
    [clearTimers, closeAuth, passcode]
  );

  const privacyBadge = showNotificationPreviews
    ? {
        label: "Previews enabled",
        tone: "bg-emerald-400",
      }
    : {
        label: "Privacy mode",
        tone: "bg-amber-400",
      };

  return (
    <>
      <Head>
        <title>Kali Portfolio — Lock Screen</title>
      </Head>
      <div className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0" aria-hidden="true">
          <div
            className="absolute inset-0 scale-105 bg-cover bg-center transition-transform duration-1000"
            style={{ backgroundImage: `url(/wallpapers/${wallpaper}.webp)` }}
          />
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-slate-900/60 to-black/70" />
        </div>

        <main className="relative z-10 flex min-h-screen flex-col px-6 py-10 sm:px-10 lg:px-20">
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-between gap-12 py-6 md:py-12">
            <div className="grid flex-1 grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
              <section className="flex flex-col items-start justify-center gap-8 text-left text-white">
                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-[0.6em] text-slate-200/80">
                    Secure Session
                  </p>
                  <div className="text-6xl font-semibold sm:text-7xl md:text-8xl">
                    <Clock onlyTime />
                  </div>
                  <div className="text-xl font-medium tracking-[0.45em] text-slate-200 sm:text-2xl">
                    <Clock onlyDay />
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-sm text-slate-200/80">
                    {authVisible
                      ? "Enter your passcode to unlock the desktop."
                      : "Press any key or click Unlock to begin."}
                  </p>
                  {!authVisible && (
                    <button
                      ref={unlockButtonRef}
                      type="button"
                      onClick={() => setAuthVisible(true)}
                      className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                    >
                      Unlock
                    </button>
                  )}
                </div>
                {authVisible && (
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="unlock-title"
                    className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-xl"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2
                          id="unlock-title"
                          className="text-lg font-semibold tracking-wide text-white"
                        >
                          Unlock Desktop
                        </h2>
                        <p className="mt-1 text-sm text-slate-300">
                          Authentication is simulated for this portfolio.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={closeAuth}
                        className="rounded-full border border-white/20 bg-white/10 px-2 py-1 text-xs uppercase tracking-[0.3em] text-slate-200 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        aria-label="Cancel unlock"
                      >
                        ✕
                      </button>
                    </div>
                    <form className="mt-5 space-y-4" onSubmit={handleUnlock}>
                      <label className="block text-sm font-medium text-slate-200" htmlFor="lock-passcode">
                        Passcode
                      </label>
                      <input
                        id="lock-passcode"
                        ref={passcodeRef}
                        type="password"
                        value={passcode}
                        onChange={(event) => setPasscode(event.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-base text-white shadow-inner focus:border-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                        placeholder="Enter passcode"
                        autoComplete="off"
                      />
                      <div className="flex items-center justify-between text-xs text-slate-300">
                        <span>Hint: any non-empty entry unlocks the demo.</span>
                        <span className="uppercase tracking-[0.3em] text-slate-400">
                          Demo Mode
                        </span>
                      </div>
                      <button
                        type="submit"
                        className="flex w-full items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-slate-900 shadow-lg transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                      >
                        {unlockStatus === "processing" ? "Verifying…" : "Unlock"}
                      </button>
                      <div className="space-y-1">
                        {unlockStatus === "error" && (
                          <p className="text-sm text-amber-300" role="alert">
                            {errorMessage}
                          </p>
                        )}
                        {unlockStatus === "processing" && (
                          <p className="text-sm text-slate-200" aria-live="polite">
                            Checking credentials…
                          </p>
                        )}
                        {unlockStatus === "success" && (
                          <p className="text-sm text-emerald-300" aria-live="polite">
                            Desktop unlocked — staying on the lock screen for demo purposes.
                          </p>
                        )}
                      </div>
                    </form>
                  </div>
                )}
              </section>

              <section className="flex flex-col gap-6 text-white">
                <LockControls
                  title={currentTrack.title}
                  artist={currentTrack.artist}
                  album={currentTrack.album}
                  isPlaying={isPlaying}
                  elapsed={elapsed}
                  duration={currentTrack.duration}
                  accentColor={currentTrack.accentColor}
                  onNext={handleNext}
                  onPrevious={handlePrevious}
                  onTogglePlay={handleTogglePlay}
                />

                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-xl backdrop-blur-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold uppercase tracking-[0.4em] text-slate-100">
                      Notifications
                    </h2>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[0.7rem] uppercase tracking-[0.3em] text-slate-100">
                      <span
                        className={`h-2 w-2 rounded-full ${privacyBadge.tone}`}
                        aria-hidden="true"
                      />
                      {privacyBadge.label}
                    </span>
                  </div>
                  {hasHiddenContent && (
                    <p className="mt-2 text-xs text-amber-200">
                      Sensitive previews are hidden until you unlock.
                    </p>
                  )}
                  <ul className="mt-5 space-y-4">
                    {notifications.map((notification) => (
                      <li
                        key={notification.id}
                        className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 shadow-inner"
                      >
                        <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-300">
                          <span>{notification.app}</span>
                          <time
                            dateTime={notification.timestamp}
                            suppressHydrationWarning
                          >
                            {notification.timeLabel}
                          </time>
                        </div>
                        <p className="mt-2 text-sm text-slate-100">
                          {notification.display}
                        </p>
                        {notification.hidden && (
                          <p className="mt-2 text-xs text-slate-300">
                            Preview hidden — unlock to read securely.
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default LockScreenPage;
