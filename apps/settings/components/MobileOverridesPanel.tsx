"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  DEFAULT_MOBILE_DPI,
  MAX_MOBILE_DPI,
  MIN_MOBILE_DPI,
  ROTATION_OPTIONS,
  type EdgeGestureAction,
  type MobileOrientation,
  type MobileOverride,
  type MobileOverrideMap,
  type RotationOption,
} from "../../../types/mobile";

const clampDpi = (value: number): number => {
  if (!Number.isFinite(value)) return DEFAULT_MOBILE_DPI;
  const rounded = Math.round(value);
  return Math.min(MAX_MOBILE_DPI, Math.max(MIN_MOBILE_DPI, rounded));
};

const SAMPLE_APPS = [
  {
    id: "terminal",
    name: "Terminal",
    accent: "bg-gray-900",
    text: "htop · ssh kali@lab · CPU 37% · Mem 48%",
    footer: "Offline shell output", 
    textClass: "text-emerald-200",
  },
  {
    id: "firefox",
    name: "Firefox",
    accent: "bg-orange-500",
    text: "kali.org — Securing the perimeter with open-source tooling.",
    footer: "Reader mode enabled",
    textClass: "text-white",
  },
  {
    id: "spotify",
    name: "Spotify",
    accent: "bg-emerald-500",
    text: "Now Playing · Kali Beats — Intrusion Detection (Lo-Fi Mix)",
    footer: "Connected to studio monitors",
    textClass: "text-black",
  },
] as const;

const rotationLabel = (rotation: number) => `${rotation}\u00B0`;

const orientationLabel: Record<MobileOrientation, string> = {
  portrait: "Portrait",
  landscape: "Landscape",
};

const gestureDescriptions: Record<EdgeGestureAction, { title: string; body: string }> = {
  "app-switcher": {
    title: "App switcher",
    body: "Swipe from the left edge to fan through your recent apps.",
  },
  notifications: {
    title: "Notification shade",
    body: "Swipe down from the top edge to review notifications.",
  },
  "quick-settings": {
    title: "Quick settings",
    body: "Swipe from the right edge to toggle radios and brightness.",
  },
};

type GestureState = {
  edge: "left" | "right" | "top";
  startX: number;
  startY: number;
  pointerId: number;
};

const EDGE_THRESHOLD = 36;
const TRIGGER_DISTANCE = 48;

const MobilePreview = ({
  app,
  orientation,
  override,
  activeOverlay,
  onGesture,
}: {
  app: {
    id: string;
    name: string;
    accent: string;
    text: string;
    footer: string;
    textClass: string;
  };
  orientation: MobileOrientation;
  override?: MobileOverride;
  activeOverlay: EdgeGestureAction | null;
  onGesture: (action: EdgeGestureAction) => void;
}) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<GestureState | null>(null);
  const [edgeHint, setEdgeHint] = useState<GestureState["edge"] | null>(null);
  const [dragProgress, setDragProgress] = useState(0);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let edge: GestureState["edge"] | null = null;
    if (x <= EDGE_THRESHOLD) {
      edge = "left";
    } else if (x >= rect.width - EDGE_THRESHOLD) {
      edge = "right";
    } else if (y <= EDGE_THRESHOLD) {
      edge = "top";
    }
    if (!edge) {
      gestureRef.current = null;
      setEdgeHint(null);
      setDragProgress(0);
      return;
    }
    gestureRef.current = {
      edge,
      startX: event.clientX,
      startY: event.clientY,
      pointerId: event.pointerId,
    };
    setEdgeHint(edge);
    setDragProgress(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = gestureRef.current;
    if (!state) return;
    let delta = 0;
    if (state.edge === "left") {
      delta = Math.max(0, event.clientX - state.startX);
    } else if (state.edge === "right") {
      delta = Math.max(0, state.startX - event.clientX);
    } else {
      delta = Math.max(0, event.clientY - state.startY);
    }
    const progress = Math.min(1, delta / (TRIGGER_DISTANCE * 1.5));
    setDragProgress(progress);
  };

  const finishGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = gestureRef.current;
    if (!state) return;
    let action: EdgeGestureAction | null = null;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    if (state.edge === "left" && dx > TRIGGER_DISTANCE) {
      action = "app-switcher";
    } else if (state.edge === "right" && dx < -TRIGGER_DISTANCE) {
      action = "quick-settings";
    } else if (state.edge === "top" && dy > TRIGGER_DISTANCE) {
      action = "notifications";
    }
    if (action) {
      onGesture(action);
    }
    if (previewRef.current) {
      previewRef.current.releasePointerCapture(state.pointerId);
    }
    gestureRef.current = null;
    setEdgeHint(null);
    setDragProgress(0);
  };

  const cancelGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = gestureRef.current;
    if (state && previewRef.current) {
      previewRef.current.releasePointerCapture(state.pointerId);
    }
    gestureRef.current = null;
    setEdgeHint(null);
    setDragProgress(0);
  };

  const scale = override ? clampDpi(override.dpi) / DEFAULT_MOBILE_DPI : 1;
  const rotation = override?.rotation ?? 0;
  const orientationClass =
    orientation === "portrait"
      ? "h-[26rem] w-[12rem]"
      : "h-[12.5rem] w-[24rem]";

  return (
    <div
      ref={previewRef}
      className={`relative mx-auto mt-6 flex select-none items-center justify-center overflow-hidden rounded-[2.5rem] border border-white/15 bg-black/80 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.8)] ${orientationClass}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishGesture}
      onPointerLeave={cancelGesture}
      onPointerCancel={cancelGesture}
      role="presentation"
      aria-label="Mobile gesture preview"
    >
      <div className="absolute inset-0 pointer-events-none border-4 border-black/40" />
      <div
        className="pointer-events-none absolute inset-[0.35rem] rounded-[2rem] border border-white/10 bg-black/80"
      />
      <div
        className="relative flex h-[calc(100%-0.7rem)] w-[calc(100%-0.7rem)] flex-col overflow-hidden rounded-[1.75rem]"
        style={{
          transform: `scale(${scale}) rotate(${rotation}deg)`,
          transformOrigin: "center center",
        }}
      >
        <div className="flex items-center justify-between px-5 pt-4 text-[0.75rem] text-white/70">
          <span>09:42</span>
          <div className="flex items-center gap-2">
            <span aria-hidden="true">📶</span>
            <span aria-hidden="true">🔋</span>
          </div>
        </div>
        <div className={`mx-5 mt-4 rounded-2xl p-4 shadow-inner ${app.accent} ${app.textClass}`}>
          <p className="text-xs uppercase tracking-widest text-white/70">
            {app.name}
          </p>
          <p className="mt-3 text-sm leading-relaxed">{app.text}</p>
          <p className="mt-4 text-xs text-white/70">{app.footer}</p>
        </div>
        <div className="mt-auto px-5 pb-5">
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
            DPI {override ? clampDpi(override.dpi) : DEFAULT_MOBILE_DPI} · Rotation {rotationLabel(rotation)}
          </div>
        </div>
      </div>
      {edgeHint && (
        <div
          className={`pointer-events-none absolute inset-0 transition-opacity ${
            dragProgress > 0.05 ? "opacity-100" : "opacity-0"
          }`}
        >
          {edgeHint === "left" && (
            <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-emerald-400/40 via-emerald-300/10 to-transparent" />
          )}
          {edgeHint === "right" && (
            <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-sky-400/40 via-sky-300/10 to-transparent" />
          )}
          {edgeHint === "top" && (
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-indigo-400/40 via-indigo-300/10 to-transparent" />
          )}
        </div>
      )}
      {activeOverlay && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/65 text-center text-white">
          <div className="w-3/4 rounded-2xl border border-white/20 bg-white/10 px-6 py-5">
            <p className="text-sm font-semibold tracking-wide">
              {gestureDescriptions[activeOverlay].title}
            </p>
            <p className="mt-2 text-xs text-white/80">
              {gestureDescriptions[activeOverlay].body}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const initialForm: { appId: string; dpi: number; rotation: RotationOption } = {
  appId: "",
  dpi: DEFAULT_MOBILE_DPI,
  rotation: ROTATION_OPTIONS[0],
};

export default function MobileOverridesPanel() {
  const [overrides, setOverrides] = useState<MobileOverrideMap>({});
  const [form, setForm] = useState(initialForm);
  const [previewApp, setPreviewApp] = useState<string>(SAMPLE_APPS[0].id);
  const [orientation, setOrientation] = useState<MobileOrientation>("portrait");
  const [activeOverlay, setActiveOverlay] = useState<EdgeGestureAction | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const overlayTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadOverrides = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/mobile/overrides");
        if (!response.ok) {
          throw new Error("Failed to load overrides");
        }
        const data = (await response.json()) as { overrides?: MobileOverrideMap };
        if (cancelled) return;
        setOverrides(data.overrides ?? {});
        setLoadError(null);
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load mobile overrides", error);
        setLoadError("Unable to read overrides from ~/.config/kali-mobile.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    loadOverrides();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (overlayTimeoutRef.current) {
        window.clearTimeout(overlayTimeoutRef.current);
      }
    };
  }, []);

  const previewOptions = useMemo(() => {
    const extras = Object.keys(overrides)
      .filter(
        (id) => !SAMPLE_APPS.some((sample) => sample.id === id),
      )
      .map((id) => ({
        id,
        name: id,
        accent: "bg-slate-800",
        text: "Custom override preview",
        footer: "Rotation + DPI override applied",
        textClass: "text-white",
      }));
    return [...SAMPLE_APPS, ...extras];
  }, [overrides]);

  const previewMetadata = useMemo(() => {
    return (
      previewOptions.find((app) => app.id === previewApp) || {
        id: previewApp,
        name: previewApp || "Preview",
        accent: "bg-slate-900",
        text: "Your app will appear here when launched on the mobile shell.",
        footer: "No sample available",
        textClass: "text-white",
      }
    );
  }, [previewApp, previewOptions]);

  const previewOverride = useMemo(() => {
    const trimmed = form.appId.trim();
    if (trimmed && trimmed === previewApp) {
      return {
        dpi: clampDpi(form.dpi),
        rotation: form.rotation,
      } satisfies MobileOverride;
    }
    return overrides[previewApp];
  }, [form, overrides, previewApp]);

  const overrideEntries = useMemo(
    () => Object.entries(overrides).sort(([a], [b]) => a.localeCompare(b)),
    [overrides],
  );

  const handleSelectOverride = (appId: string) => {
    const override = overrides[appId];
    if (!override) return;
    setForm({ appId, dpi: override.dpi, rotation: override.rotation as RotationOption });
    setPreviewApp(appId);
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = form.appId.trim();
    if (!trimmed) {
      setErrorMessage("Provide an app identifier before saving.");
      return;
    }
    setStatusMessage(null);
    setErrorMessage(null);
    setIsSaving(true);
    try {
      const response = await fetch("/api/mobile/overrides", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: trimmed,
          dpi: clampDpi(form.dpi),
          rotation: form.rotation,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Failed to save override");
      }
      const data = (await response.json()) as { overrides?: MobileOverrideMap };
      setOverrides(data.overrides ?? {});
      setForm((prev) => ({ ...prev, appId: trimmed, dpi: clampDpi(prev.dpi) }));
      setPreviewApp(trimmed);
      setStatusMessage(`Saved mobile override for ${trimmed}.`);
    } catch (error) {
      console.error("Failed to save mobile override", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save override.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const trimmed = form.appId.trim();
    if (!trimmed) {
      setErrorMessage("Select an override to remove.");
      return;
    }
    setIsSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/mobile/overrides", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: trimmed }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Failed to remove override");
      }
      const data = (await response.json()) as { overrides?: MobileOverrideMap };
      setOverrides(data.overrides ?? {});
      setStatusMessage(`Removed mobile override for ${trimmed}.`);
      setForm(initialForm);
      if (!(data.overrides ?? {})[previewApp]) {
        setPreviewApp(SAMPLE_APPS[0].id);
      }
    } catch (error) {
      console.error("Failed to remove mobile override", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to remove override.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleGesture = (action: EdgeGestureAction) => {
    setActiveOverlay(action);
    setStatusMessage(
      action === "app-switcher"
        ? "App switcher gesture recognised."
        : action === "notifications"
        ? "Notification shade opened."
        : "Quick settings exposed.",
    );
    if (overlayTimeoutRef.current) {
      window.clearTimeout(overlayTimeoutRef.current);
    }
    overlayTimeoutRef.current = window.setTimeout(() => {
      setActiveOverlay(null);
    }, 1600);
  };

  const handleOrientationChange = (value: MobileOrientation) => {
    setOrientation(value);
    setActiveOverlay(null);
  };

  const showDelete = Boolean(overrides[form.appId.trim()]);

  return (
    <div className="flex flex-col gap-6 px-6 py-5 text-ubt-grey">
      <div className="max-w-3xl">
        <h2 className="text-xl font-semibold text-white">Mobile compositor overrides</h2>
        <p className="mt-2 text-sm text-ubt-grey/80">
          Fine-tune how individual apps render on the Kali mobile shell. Overrides are saved to
          <code className="ml-2 rounded bg-black/50 px-2 py-1 text-xs text-ubt-grey/70">
            ~/.config/kali-mobile/app-overrides.json
          </code>
          so they follow the compositor across devices.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.25fr_minmax(0,1fr)]">
        <div className="space-y-6">
          <form
            className="space-y-5 rounded-2xl border border-white/10 bg-black/40 p-5 shadow-inner"
            onSubmit={handleFormSubmit}
          >
            <div>
              <label htmlFor="app-id" className="text-sm font-medium text-white">
                App identifier
              </label>
              <input
                id="app-id"
                type="text"
                value={form.appId}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, appId: event.target.value }));
                  setStatusMessage(null);
                  setErrorMessage(null);
                }}
                placeholder="e.g. terminal, firefox"
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="app-dpi" className="text-sm font-medium text-white">
                  Target DPI
                </label>
                <input
                  id="app-dpi"
                  type="number"
                  min={MIN_MOBILE_DPI}
                  max={MAX_MOBILE_DPI}
                  step={10}
                  value={form.dpi}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setForm((prev) => ({ ...prev, dpi: Number.isFinite(next) ? next : prev.dpi }));
                  }}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                />
                <p className="mt-1 text-xs text-ubt-grey/70">
                  Clamp between {MIN_MOBILE_DPI} and {MAX_MOBILE_DPI} to balance clarity and scale.
                </p>
              </div>
              <div>
                <label htmlFor="app-rotation" className="text-sm font-medium text-white">
                  Rotation
                </label>
                <select
                  id="app-rotation"
                  value={form.rotation}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (ROTATION_OPTIONS.includes(next as RotationOption)) {
                      setForm((prev) => ({ ...prev, rotation: next as RotationOption }));
                    }
                  }}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                >
                  {ROTATION_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {rotationLabel(value)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-ubt-grey/70">
                  Use rotation overrides to pin kiosk or legacy landscape apps in place.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-black shadow hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:bg-sky-700/50"
                disabled={isSaving}
              >
                {isSaving ? "Saving…" : "Save override"}
              </button>
              {showDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-lg bg-red-500/90 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:cursor-not-allowed disabled:bg-red-800/50"
                  disabled={isSaving}
                >
                  Remove override
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setForm(initialForm);
                  setStatusMessage(null);
                  setErrorMessage(null);
                }}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white/80 hover:border-white/30 hover:text-white"
              >
                Clear
              </button>
            </div>
            <p className="text-xs text-ubt-grey/70">
              Overrides apply instantly to running apps once re-focused by the compositor. Restart the shell to force a full refresh.
            </p>
            {statusMessage && (
              <p className="text-xs font-medium text-emerald-300">{statusMessage}</p>
            )}
            {errorMessage && (
              <p className="text-xs font-medium text-red-300">{errorMessage}</p>
            )}
          </form>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Saved overrides</h3>
              {isLoading && <span className="text-xs text-ubt-grey/70">Loading…</span>}
            </div>
            {loadError && (
              <p className="mt-3 text-xs text-red-300">{loadError}</p>
            )}
            <ul className="mt-4 space-y-3">
              {overrideEntries.length === 0 && !isLoading ? (
                <li className="rounded-lg border border-dashed border-white/10 bg-black/40 px-4 py-6 text-center text-xs text-ubt-grey/70">
                  No overrides saved yet. Use the form above to pin custom DPI or rotation per app.
                </li>
              ) : (
                overrideEntries.map(([appId, override]) => (
                  <li key={appId}>
                    <button
                      type="button"
                      onClick={() => handleSelectOverride(appId)}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition hover:border-sky-400 hover:bg-sky-500/10 ${
                        form.appId.trim() === appId
                          ? "border-sky-400 bg-sky-500/10"
                          : "border-white/10 bg-black/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{appId}</span>
                        <span className="text-xs text-ubt-grey/60">
                          DPI {override.dpi} · {rotationLabel(override.rotation)}
                        </span>
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <label htmlFor="preview-app" className="text-sm font-semibold text-white">
                Preview with app
              </label>
              <select
                id="preview-app"
                value={previewApp}
                onChange={(event) => setPreviewApp(event.target.value)}
                className="mt-2 min-w-[12rem] rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              >
                {previewOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2" role="group" aria-label="Preview orientation">
              {(Object.keys(orientationLabel) as MobileOrientation[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleOrientationChange(value)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    orientation === value
                      ? "bg-sky-500 text-black shadow"
                      : "border border-white/10 bg-black/70 text-white hover:border-white/30"
                  }`}
                >
                  {orientationLabel[value]}
                </button>
              ))}
            </div>
          </div>
          <MobilePreview
            app={previewMetadata}
            orientation={orientation}
            override={previewOverride}
            activeOverlay={activeOverlay}
            onGesture={handleGesture}
          />
          <p className="mt-4 text-xs text-ubt-grey/70">
            Try swiping from the left, top, or right edges inside the device frame. Gestures trigger the compositor's app switcher, notification shade, or quick settings to mirror the mobile shell.
          </p>
        </div>
      </div>
    </div>
  );
}
