import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LockScreen from "../components/screen/lock_screen";
import SettingsDrawer from "../components/SettingsDrawer";
import NetworkIndicator from "../components/ui/NetworkIndicator";
import { SettingsContext } from "../hooks/useSettings";
import { defaults } from "../utils/settingsStore";
import { resolveDesktopTheme } from "../utils/theme";

const createSettingsContextValue = () => ({
  accent: defaults.accent,
  wallpaper: defaults.wallpaper,
  bgImageName: defaults.wallpaper,
  useKaliWallpaper: defaults.useKaliWallpaper,
  density: defaults.density as "regular" | "compact",
  reducedMotion: defaults.reducedMotion,
  fontScale: defaults.fontScale,
  highContrast: defaults.highContrast,
  largeHitAreas: defaults.largeHitAreas,
  pongSpin: defaults.pongSpin,
  allowNetwork: defaults.allowNetwork,
  haptics: defaults.haptics,
  theme: "default",
  desktopTheme: resolveDesktopTheme({
    theme: "default",
    accent: defaults.accent,
    wallpaperName: defaults.wallpaper,
    bgImageName: defaults.wallpaper,
    useKaliWallpaper: defaults.useKaliWallpaper,
  }),
  setAccent: jest.fn(),
  setWallpaper: jest.fn(),
  setUseKaliWallpaper: jest.fn(),
  setDensity: jest.fn(),
  setReducedMotion: jest.fn(),
  setFontScale: jest.fn(),
  setHighContrast: jest.fn(),
  setLargeHitAreas: jest.fn(),
  setPongSpin: jest.fn(),
  setAllowNetwork: jest.fn(),
  setHaptics: jest.fn(),
  setTheme: jest.fn(),
});

const ensureAnimationFrame = () => {
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = ((cb: FrameRequestCallback) =>
      window.setTimeout(() => cb(Date.now()), 16) as unknown as number) as typeof window.requestAnimationFrame;
  }

  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = ((handle: number) => {
      window.clearTimeout(handle);
    }) as typeof window.cancelAnimationFrame;
  }
};

describe("modal focus management", () => {
  beforeAll(() => {
    ensureAnimationFrame();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("traps focus inside the settings drawer and restores trigger focus", async () => {
    const user = userEvent.setup();
    const settingsValue = createSettingsContextValue();

    render(
      <SettingsContext.Provider value={settingsValue}>
        <button type="button">Outside</button>
        <SettingsDrawer />
      </SettingsContext.Provider>,
    );

    const toggle = screen.getByRole("button", { name: /settings/i });
    toggle.focus();
    await user.click(toggle);

    const dialog = await screen.findByRole("dialog", { name: /settings/i });
    const closeButton = screen.getByRole("button", { name: /close settings/i });

    await waitFor(() => expect(closeButton).toHaveFocus());

    for (let i = 0; i < 6; i += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }

    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    await user.click(closeButton);
    await waitFor(() => expect(toggle).toHaveFocus());
  });

  it("keeps focus on the lock screen while it is active", async () => {
    const user = userEvent.setup();
    const settingsValue = createSettingsContextValue();

    render(
      <SettingsContext.Provider value={settingsValue}>
        <button type="button">Outside</button>
        <LockScreen isLocked unLockScreen={jest.fn()} />
      </SettingsContext.Provider>,
    );

    const unlockButton = await screen.findByRole("button", { name: /unlock desktop/i });

    await waitFor(() => expect(unlockButton).toHaveFocus());

    const outside = screen.getByRole("button", { name: /outside/i });

    await user.tab();
    expect(unlockButton).toHaveFocus();

    outside.focus();
    await waitFor(() => expect(unlockButton).toHaveFocus());
  });

  it("keeps the network share confirmation modal focused", async () => {
    const user = userEvent.setup();

    render(
      <>
        <NetworkIndicator allowNetwork online />
        <button type="button">Outside</button>
      </>,
    );

    const statusButton = screen.getByRole("button", { name: /wired connection connected/i });
    await user.click(statusButton);

    const shareTrigger = await screen.findByRole("button", { name: /share homelab 5g/i });
    await user.click(shareTrigger);

    const dialog = await screen.findByRole("dialog", { name: /share/i });
    const closeButton = screen.getByRole("button", { name: /close share dialog/i });

    await waitFor(() => expect(closeButton).toHaveFocus());

    for (let i = 0; i < 6; i += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }

    await user.click(closeButton);
    await waitFor(() => expect(shareTrigger).toHaveFocus());
  });
});
