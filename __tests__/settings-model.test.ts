import {
  BACKUP_LIMIT,
  PROFILE_LIMIT,
  SNAPSHOT_DEFAULTS,
  WORKSPACE_DEFAULTS,
  PROFILES_KEY,
  parsePreferences,
  parseBackup,
  exportBackup,
  parseProfiles,
  saveProfiles,
  preferenceChanges,
  accentForeground,
  loadWorkspacePreferences,
  WORKSPACE_KEY,
} from "../lib/settings/model";

afterEach(() => localStorage.clear());

test("versioned backups round-trip every supported preference without permissions or app data", () => {
  const snapshot = {
    ...SNAPSHOT_DEFAULTS,
    theme: "matrix" as const,
    accent: "#acbfef",
    wallpaper: "wall-7",
    fontScale: 1.25,
    wallpaperDim: 35,
    clockFormat: "24" as const,
    showSeconds: true,
  };
  const text = exportBackup(snapshot);
  expect(parseBackup(text)).toEqual(snapshot);
  expect(text).not.toMatch(/allowNetwork|youtube:watch-later|token|secret/);
  expect(parseBackup('{"volume":35,"allowNetwork":true}')).toEqual({
    volume: 35,
  });
});

test.each([
  null,
  [],
  false,
  { theme: "unknown" },
  { wallpaper: "https://external.test/image" },
  { accent: "var(--secret)" },
  { density: "enormous" },
  { wallpaperFit: "unsafe" },
  { clockFormat: "13" },
  { volume: 101 },
  { wallpaperDim: -1 },
  { fontScale: 0.5 },
  { fontScale: 1.6 },
  { reducedMotion: "false" },
  { volume: NaN },
  { volume: Infinity },
  { invalid: true },
  JSON.parse('{"__proto__":{"polluted":true}}'),
])("rejects malformed preferences before any write: %j", (value) => {
  const spy = jest.spyOn(Storage.prototype, "setItem");
  expect(() => parsePreferences(value)).toThrow();
  expect(spy).not.toHaveBeenCalled();
  spy.mockRestore();
  expect(({} as { polluted?: unknown }).polluted).toBeUndefined();
});

test("validates complete imports before applying any subset", () => {
  expect(() => parseBackup('{"volume":30,"theme":"invalid"}')).toThrow(
    "Desktop theme",
  );
  expect(() => parseBackup("{oops")).toThrow("valid JSON");
  expect(() => parseBackup("[]")).toThrow("not an array");
  expect(() => parseBackup(" ".repeat(BACKUP_LIMIT + 1))).toThrow("64 KB");
  expect(() =>
    parseBackup(
      '{"kind":"kali-desktop-settings","version":2,"settings":{"volume":30}}',
    ),
  ).toThrow("version");
  expect(() => parseBackup('{"allowNetwork":true}')).toThrow("no supported");
});

test("profiles are bounded, versioned, and stored atomically", () => {
  const profiles = [
    {
      id: "work",
      name: "Work",
      settings: { ...SNAPSHOT_DEFAULTS, volume: 30 },
    },
  ];
  saveProfiles(localStorage, profiles);
  const saved = localStorage.getItem(PROFILES_KEY);
  expect(parseProfiles(saved)).toEqual(profiles);
  const tooMany = Array.from({ length: PROFILE_LIMIT + 1 }, (_, i) => ({
    ...profiles[0],
    id: String(i),
  }));
  expect(() => saveProfiles(localStorage, tooMany)).toThrow();
  expect(() =>
    saveProfiles(localStorage, [profiles[0], profiles[0]]),
  ).toThrow();
  expect(() =>
    saveProfiles(localStorage, [{ ...profiles[0], name: " " }]),
  ).toThrow();
  expect(() =>
    saveProfiles(localStorage, [
      { ...profiles[0], settings: { ...profiles[0].settings, volume: 150 } },
    ]),
  ).toThrow();
  expect(localStorage.getItem(PROFILES_KEY)).toBe(saved);
});

test("profile quota failures propagate and do not report a successful save", () => {
  const storage = {
    getItem: jest.fn(),
    setItem: jest.fn(() => {
      throw new DOMException("Full", "QuotaExceededError");
    }),
  } as unknown as Storage;
  expect(() =>
    saveProfiles(storage, [
      { id: "work", name: "Work", settings: SNAPSHOT_DEFAULTS },
    ]),
  ).toThrow("Full");
});

test("workspace parsing supplies defaults and rejects malicious values", () => {
  expect(loadWorkspacePreferences(localStorage)).toEqual(WORKSPACE_DEFAULTS);
  localStorage.setItem(WORKSPACE_KEY, '{"clockFormat":"24","wallpaperDim":20}');
  expect(loadWorkspacePreferences(localStorage)).toEqual({
    ...WORKSPACE_DEFAULTS,
    clockFormat: "24",
    wallpaperDim: 20,
  });
  localStorage.setItem(WORKSPACE_KEY, '{"wallpaperDim":200}');
  expect(() => loadWorkspacePreferences(localStorage)).toThrow();
});

test("reviews report only changes and accent controls choose readable foregrounds", () => {
  expect(
    preferenceChanges(SNAPSHOT_DEFAULTS, { volume: 20, fontScale: 1 }),
  ).toEqual([{ key: "volume", label: "App volume", before: 100, after: 20 }]);
  expect(accentForeground("#ffffff")).toBe("#000000");
  expect(accentForeground("#000000")).toBe("#ffffff");
});
