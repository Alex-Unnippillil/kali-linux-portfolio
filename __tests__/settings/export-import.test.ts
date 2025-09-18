import {
  applySettingsSnapshot,
  captureBaselineSnapshot,
  clearBaselineSnapshot,
  defaults,
  getSettingsSnapshot,
} from "../../utils/settings";
import {
  exportSettings,
  importSettings,
  parseSettingsExport,
  SETTINGS_EXPORT_VERSION,
} from "../../utils/settings/export";

const setupMatchMedia = () => {
  if (typeof window.matchMedia !== "function") {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: () => ({
        matches: false,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }),
    });
  }
};

describe("settings export/import", () => {
  beforeEach(() => {
    localStorage.clear();
    setupMatchMedia();
    jest.useFakeTimers().setSystemTime(new Date("2024-01-01T00:00:00Z"));
    document.documentElement.dataset.theme = "";
    document.documentElement.className = "";
    clearBaselineSnapshot();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("generates export payload with metadata", async () => {
    await applySettingsSnapshot({
      accent: "#ff0000",
      wallpaper: "wall-3",
      density: "compact",
      theme: "dark",
    });

    const json = await exportSettings();
    const payload = parseSettingsExport(json);

    expect(payload.version).toBe(SETTINGS_EXPORT_VERSION);
    expect(payload.settings.accent).toBe("#ff0000");
    expect(payload.settings.density).toBe("compact");
    expect(payload.profile.id).toBeTruthy();
    expect(payload.profile.label).toBeTruthy();
    expect(new Date(payload.exportedAt).toISOString()).toBe("2024-01-01T00:00:00.000Z");
  });

  it("performs round-trip import and records baseline", async () => {
    await applySettingsSnapshot({
      accent: defaults.accent,
      wallpaper: defaults.wallpaper,
      density: defaults.density,
      theme: defaults.theme,
    });
    const baselineBefore = await captureBaselineSnapshot({ force: true });

    await applySettingsSnapshot({
      accent: "#00ff88",
      wallpaper: "wall-5",
      density: "compact",
      theme: "neon",
    });

    const exportJson = await exportSettings();
    const parsed = parseSettingsExport(exportJson);

    await applySettingsSnapshot({
      accent: "#1a73e8",
      wallpaper: "wall-1",
      density: "regular",
      theme: "default",
    });

    const preview = await importSettings(parsed, { baseline: baselineBefore, dryRun: true });
    expect(preview.applied).toBe(false);
    expect(preview.differences.length).toBeGreaterThan(0);

    const result = await importSettings(parsed, { baseline: preview.baseline });
    expect(result.applied).toBe(true);
    expect(result.differences).toEqual(preview.differences);

    const snapshot = await getSettingsSnapshot();
    expect(snapshot.accent).toBe("#00ff88");
    expect(snapshot.wallpaper).toBe("wall-5");
    expect(snapshot.density).toBe("compact");
    expect(snapshot.theme).toBe("neon");
  });
});
