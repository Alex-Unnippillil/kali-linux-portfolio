import { createElement, StrictMode, type ReactNode } from "react";
import { renderHook, act, cleanup, waitFor } from "@testing-library/react";
import { SettingsProvider, useSettings } from "../hooks/useSettings";

describe("SettingsProvider allowNetwork fetch guard", () => {
  let originalFetch: typeof fetch | undefined;
  let fetchSpy: jest.Mock;

  beforeEach(() => {
    // Capture only for restoration; never invoke this reference without its receiver.
    originalFetch = window.fetch;
    fetchSpy = jest.fn(() => Promise.resolve("ok"));
    // @ts-expect-error - jest mock assignment
    window.fetch = fetchSpy;
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    if (originalFetch) {
      window.fetch = originalFetch;
    } else {
      // @ts-expect-error - align with jsdom typings
      delete window.fetch;
    }
    jest.resetAllMocks();
  });

  const renderSettings = () =>
    renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

  test("normalizes URLs before blocking off-origin requests", async () => {
    window.localStorage.setItem("allow-network", "false");
    const { result } = renderSettings();
    await act(async () => {});
    // Identity comparison only; calls below always go through window.fetch.
    const blockedFetch = window.fetch;

    await expect(window.fetch("//external.com")).rejects.toThrow(
      "Network requests disabled",
    );
    await expect(window.fetch("HTTPS://external.com")).rejects.toThrow(
      "Network requests disabled",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    await expect(window.fetch("/api/data")).resolves.toBe("ok");
    expect(fetchSpy).toHaveBeenCalledWith("/api/data", undefined);

    await act(async () => {
      result.current.setAllowNetwork(true);
    });
    expect(window.fetch).not.toBe(blockedFetch);
    expect(window.fetch).toBe(fetchSpy);
    fetchSpy.mockClear();
    await expect(window.fetch("//external.com")).resolves.toBe("ok");
    await expect(window.fetch("HTTPS://external.com")).resolves.toBe("ok");
    expect(fetchSpy.mock.calls.map((call) => call[0])).toEqual([
      "//external.com",
      "HTTPS://external.com",
    ]);
  });

  test("handles Request objects when blocking network access", async () => {
    // jsdom does not consistently expose the Node fetch constructors as globals.
    const { Request: NativeRequest } =
      jest.requireActual<typeof import("undici")>("undici");
    window.localStorage.setItem("allow-network", "false");
    renderSettings();
    await act(async () => {});
    const request = new NativeRequest("https://external.com/resource");
    await expect(window.fetch(request as unknown as Request)).rejects.toThrow(
      "Network requests disabled",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("restores the exact original fetch implementation when re-enabled", async () => {
    window.localStorage.setItem("allow-network", "false");
    const { result } = renderSettings();
    await act(async () => {});
    expect(window.fetch).not.toBe(fetchSpy);
    await act(async () => {
      result.current.setAllowNetwork(true);
    });
    expect(window.fetch).toBe(fetchSpy);
    await expect(window.fetch("/allowed")).resolves.toBe("ok");
    await act(async () => {
      result.current.setAllowNetwork(false);
    });
    fetchSpy.mockClear();
    await expect(window.fetch("https://external.com")).rejects.toThrow(
      "Network requests disabled",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    await act(async () => {
      result.current.setAllowNetwork(true);
    });
    expect(window.fetch).toBe(fetchSpy);
    await expect(window.fetch("https://external.com")).resolves.toBe("ok");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("keeps arbitrary hosts opt-in while approved YouTube reads load immediately", async () => {
  const { result } = renderSettings();
  await waitFor(() => expect(window.localStorage.getItem("allow-network")).toBe("false"));
  expect(result.current.allowNetwork).toBe(false);
  await expect(window.fetch("https://external.com")).rejects.toThrow("Network requests disabled");
  await expect(window.fetch("/api/youtube/directory?channelId=example")).resolves.toBe("ok");
  await expect(window.fetch("/api/youtube/playlist-items?playlistId=example")).resolves.toBe("ok");
  for (const endpoint of ["channels", "channelSections", "playlists", "playlistItems"]) {
    await expect(window.fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?part=snippet`)).resolves.toBe("ok");
  }
  fetchSpy.mockClear();
  for (const url of [
    "http://www.googleapis.com/youtube/v3/playlists",
    "https://www.googleapis.com/drive/v3/files",
    "https://www.googleapis.com.attacker.test/youtube/v3/playlists",
    "https://www.googleapis.com/youtube/v3/playlists/other",
    "https://user:pass@www.googleapis.com/youtube/v3/playlists",
  ]) {
    await expect(window.fetch(url)).rejects.toThrow("Network requests disabled");
  }
  await expect(window.fetch("https://www.googleapis.com/youtube/v3/playlists", { method: "POST" })).rejects.toThrow("Network requests disabled");
  const { Request: NativeRequest } = jest.requireActual<typeof import("undici")>("undici");
  const writeRequest = new NativeRequest("https://www.googleapis.com/youtube/v3/playlists", { method: "POST" });
  await expect(window.fetch(writeRequest as unknown as Request)).rejects.toThrow("Network requests disabled");
  expect(fetchSpy).not.toHaveBeenCalled();
  const readRequest = new NativeRequest("https://www.googleapis.com/youtube/v3/playlists");
  await expect(window.fetch(readRequest as unknown as Request)).resolves.toBe("ok");
});

  test("does not overwrite a saved enabled preference during startup", async () => {
    window.localStorage.setItem("allow-network", "true");
    const { result } = renderSettings();
    expect(window.localStorage.getItem("allow-network")).toBe("true");
    await waitFor(() => expect(result.current.allowNetwork).toBe(true));
    expect(window.localStorage.getItem("allow-network")).toBe("true");
  });

  test("keeps an opt-out after remount and can reconnect without a stale guard", async () => {
    window.localStorage.setItem("allow-network", "true");
    const first = renderSettings();
    await waitFor(() => expect(first.result.current.allowNetwork).toBe(true));
    await act(async () => {
      first.result.current.setAllowNetwork(false);
    });
    expect(window.localStorage.getItem("allow-network")).toBe("false");
    first.unmount();
    // A real remount must release the previous provider's wrapper.
    expect(window.fetch).toBe(fetchSpy);
    const second = renderSettings();
    await act(async () => {});
    expect(second.result.current.allowNetwork).toBe(false);
    expect(window.localStorage.getItem("allow-network")).toBe("false");
    await expect(window.fetch("https://external.com")).rejects.toThrow(
      "Network requests disabled",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    await act(async () => {
      second.result.current.setAllowNetwork(true);
    });
    expect(window.fetch).toBe(fetchSpy);
    await expect(window.fetch("https://external.com")).resolves.toBe("ok");
    second.unmount();
    expect(window.fetch).toBe(fetchSpy);
  });

  test("releases its guard during StrictMode replay and final unmount", async () => {
    window.localStorage.setItem("allow-network", "false");
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        StrictMode,
        null,
        createElement(SettingsProvider, null, children),
      );
    const settings = renderHook(() => useSettings(), { wrapper });
    await act(async () => {});
    await expect(window.fetch("https://external.com")).rejects.toThrow(
      "Network requests disabled",
    );
    await expect(window.fetch("/local")).resolves.toBe("ok");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    await act(async () => {
      settings.result.current.setAllowNetwork(true);
    });
    expect(window.fetch).toBe(fetchSpy);
    settings.unmount();
    expect(window.fetch).toBe(fetchSpy);
  });

  test("does not overwrite a fetch implementation installed by another owner", async () => {
    window.localStorage.setItem("allow-network", "false");
    const settings = renderSettings();
    await act(async () => {});
    const replacement = jest.fn();
    Object.defineProperty(window, "fetch", {
      configurable: true,
      writable: true,
      value: replacement,
    });
    settings.unmount();
    expect(window.fetch).toBe(replacement);
  });
});
