import { StrictMode } from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { clear, get, set } from "idb-keyval";
import { SettingsProvider, useSettings } from "../hooks/useSettings";
import { SNAPSHOT_DEFAULTS, WORKSPACE_KEY } from "../lib/settings/model";

beforeEach(async () => {
  await clear();
  localStorage.clear();
});
afterEach(async () => {
  cleanup();
  await clear();
  localStorage.clear();
});

test("reads all stored settings before persistence and keeps customized theme colors on reopen", async () => {
  await set("accent", "#aabbcc");
  await set("bg-image", "wall-6");
  localStorage.setItem("app:theme", "dark");
  localStorage.setItem("density", "compact");
  localStorage.setItem("font-scale", "1.25");
  localStorage.setItem("volume", "27");
  localStorage.setItem("allow-network", "false");
  localStorage.setItem(WORKSPACE_KEY, '{"clockFormat":"24","wallpaperDim":35}');
  const first = renderHook(useSettings, { wrapper: SettingsProvider });
  expect(first.result.current.preferencesReady).toBe(false);
  expect(localStorage.getItem("volume")).toBe("27");
  await waitFor(() => expect(first.result.current.preferencesReady).toBe(true));
  expect(first.result.current).toMatchObject({
    accent: "#aabbcc",
    wallpaper: "wall-6",
    theme: "dark",
    density: "compact",
    fontScale: 1.25,
    volume: 27,
    allowNetwork: false,
    workspacePreferences: { clockFormat: "24", wallpaperDim: 35 },
  });
  first.unmount();
  const second = renderHook(useSettings, { wrapper: SettingsProvider });
  await waitFor(() =>
    expect(second.result.current.preferencesReady).toBe(true),
  );
  expect(second.result.current).toMatchObject({
    accent: "#aabbcc",
    wallpaper: "wall-6",
    volume: 27,
  });
  await expect(get("accent")).resolves.toBe("#aabbcc");
  await expect(get("bg-image")).resolves.toBe("wall-6");
});

test("snapshot application is validated atomically, changes real UI preferences, and never grants network permission", async () => {
  const { result } = renderHook(useSettings, { wrapper: SettingsProvider });
  await waitFor(() => expect(result.current.preferencesReady).toBe(true));
  expect(() =>
    act(() => result.current.applySnapshot({ volume: 12, fontScale: 4 })),
  ).toThrow();
  expect(result.current.volume).toBe(100);
  act(() =>
    result.current.applySnapshot({
      ...SNAPSHOT_DEFAULTS,
      theme: "neon",
      accent: "#aabbcc",
      wallpaper: "wall-5",
      reduceTransparency: true,
      strongFocus: true,
      highContrast: true,
      fontScale: 1.2,
      volume: 12,
    }),
  );
  expect(result.current).toMatchObject({
    volume: 12,
    theme: "neon",
    accent: "#aabbcc",
    wallpaper: "wall-5",
    allowNetwork: false,
  });
  expect(document.documentElement).toHaveAttribute(
    "data-reduce-transparency",
    "true",
  );
  expect(document.documentElement).toHaveAttribute("data-strong-focus", "true");
  expect(document.documentElement).toHaveClass("high-contrast");
  expect(
    document.documentElement.style.getPropertyValue("--font-multiplier"),
  ).toBe("1.2");
  expect(localStorage.getItem("allow-network")).toBe("false");
});

test("StrictMode hydration is cancellable and an explicit early theme choice is not overwritten", async () => {
  localStorage.setItem("app:theme", "matrix");
  const { result } = renderHook(useSettings, {
    wrapper: ({ children }) => (
      <StrictMode>
        <SettingsProvider>{children}</SettingsProvider>
      </StrictMode>
    ),
  });
  act(() => result.current.setTheme("dark"));
  await waitFor(() => expect(result.current.preferencesReady).toBe(true));
  expect(result.current.theme).toBe("dark");
  expect(localStorage.getItem("app:theme")).toBe("dark");
});

test("invalid stored preference cannot prevent valid preferences from loading", async () => {
  localStorage.setItem("font-scale", "999");
  localStorage.setItem("volume", "36");
  localStorage.setItem(WORKSPACE_KEY, "{bad");
  const { result } = renderHook(useSettings, { wrapper: SettingsProvider });
  await waitFor(() => expect(result.current.preferencesReady).toBe(true));
  expect(result.current.volume).toBe(36);
  expect(result.current.fontScale).toBe(1);
  expect(result.current.storageError).toBe(true);
});
