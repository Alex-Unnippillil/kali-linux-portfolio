import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { clear } from "idb-keyval";
import SettingsCenter, {
  searchSettings,
} from "../components/apps/settings/SettingsCenter";
import { SettingsProvider } from "../hooks/useSettings";
import { PROFILES_KEY, parseProfiles } from "../lib/settings/model";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  HTMLElement.prototype.scrollIntoView = jest.fn();
});
beforeEach(async () => {
  await clear();
  localStorage.clear();
});
afterEach(async () => {
  cleanup();
  await clear();
  localStorage.clear();
  jest.restoreAllMocks();
});
const setup = async () => {
  const user = userEvent.setup();
  const view = render(
    <SettingsProvider>
      <SettingsCenter />
    </SettingsProvider>,
  );
  await waitFor(() =>
    expect(screen.getByRole("slider", { name: "App volume" })).toBeEnabled(),
  );
  return { user, ...view };
};

test("search covers category names and aliases, and focuses a matching real control", async () => {
  const { user } = await setup();
  const search = screen.getByRole("searchbox", { name: "Search settings" });
  await user.type(search, "vibration");
  await user.click(screen.getByRole("button", { name: /Haptic feedback/ }));
  expect(
    screen.getByRole("heading", { level: 1, name: "Sound & feedback" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("switch", { name: "Haptic feedback" })).toHaveFocus();
  fireEvent.keyDown(screen.getByTestId("settings-center"), {
    key: "f",
    ctrlKey: true,
  });
  expect(search).toHaveFocus();
  await user.type(search, "no-such-preference");
  expect(screen.getByText("No settings found")).toBeInTheDocument();
  await user.keyboard("{Escape}");
  expect(search).toHaveValue("");
  expect(searchSettings("background brightness")[0].key).toBe("wallpaperDim");
});

test("switches expose stable labels, on/off states, and reversible live changes", async () => {
  const { user } = await setup();
  const motion = screen.getByRole("switch", { name: "Reduce motion" });
  expect(motion).toHaveAttribute("aria-checked", "false");
  await user.click(motion);
  expect(motion).toHaveAttribute("aria-checked", "true");
  expect(document.documentElement).toHaveClass("reduced-motion");
  await user.click(screen.getByRole("button", { name: "Undo", exact: true }));
  expect(motion).toHaveAttribute("aria-checked", "false");
});

test("configuration modes preview changes before applying, without changing permission", async () => {
  const { user } = await setup();
  await user.click(screen.getByRole("button", { name: /^Focus Less motion/ }));
  expect(
    screen.getByRole("dialog", { name: "Switch to Focus" }),
  ).toBeInTheDocument();
  expect(localStorage.getItem("volume")).toBe("100");
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }),
  );
  expect(localStorage.getItem("volume")).toBe("100");
  await user.click(screen.getByRole("button", { name: /^Focus Less motion/ }));
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Apply changes",
    }),
  );
  expect(screen.getByRole("slider", { name: "App volume" })).toHaveValue("0");
  expect(localStorage.getItem("allow-network")).toBe("false");
  expect(document.documentElement).toHaveAttribute(
    "data-reduce-transparency",
    "true",
  );
});

test("profiles persist exact preferences and deleting a profile requires confirmation", async () => {
  const { user, unmount } = await setup();
  fireEvent.change(screen.getByRole("slider", { name: "App volume" }), {
    target: { value: "37" },
  });
  await user.click(
    screen.getByRole("button", { name: "Profiles & backup", exact: true }),
  );
  await user.type(screen.getByLabelText("Profile name"), "Desk setup");
  await user.click(
    screen.getByRole("button", { name: "Save profile", exact: true }),
  );
  expect(parseProfiles(localStorage.getItem(PROFILES_KEY))[0]).toMatchObject({
    name: "Desk setup",
    settings: { volume: 37 },
  });
  unmount();
  render(
    <SettingsProvider>
      <SettingsCenter />
    </SettingsProvider>,
  );
  await waitFor(() =>
    expect(screen.getByRole("slider", { name: "App volume" })).toBeEnabled(),
  );
  await user.click(
    screen.getByRole("button", { name: "Profiles & backup", exact: true }),
  );
  expect(screen.getByText("Desk setup")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Delete Desk setup" }));
  expect(parseProfiles(localStorage.getItem(PROFILES_KEY))).toHaveLength(1);
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Delete profile",
    }),
  );
  expect(parseProfiles(localStorage.getItem(PROFILES_KEY))).toHaveLength(0);
});

test("corrupt profile storage is reported, not represented as successful loading", async () => {
  localStorage.setItem(PROFILES_KEY, "{not valid");
  await setup();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Saved profiles could not be read",
  );
});

test("desktop-grade controls do not imply unavailable hardware management", async () => {
  const { user } = await setup();
  await user.click(screen.getByRole("button", { name: "System", exact: true }));
  expect(
    screen.getByRole("button", { name: "Enter fullscreen" }),
  ).toBeDisabled();
  await user.click(screen.getByRole("radio", { name: "24-hour" }));
  expect(screen.getByRole("radio", { name: "24-hour" })).toBeChecked();
  await user.click(screen.getByRole("switch", { name: "Show seconds" }));
  expect(screen.getByRole("switch", { name: "Show seconds" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
});

test("a later file selection wins over an older delayed import", async () => {
  const { user } = await setup();
  await user.click(
    screen.getByRole("button", { name: "Profiles & backup", exact: true }),
  );
  let finishOld!: (value: string) => void;
  const older = new File(["old"], "old.json", { type: "application/json" });
  Object.defineProperty(older, "text", {
    value: () =>
      new Promise<string>((resolve) => {
        finishOld = resolve;
      }),
  });
  const newer = new File(["new"], "new.json", { type: "application/json" });
  Object.defineProperty(newer, "text", {
    value: () => Promise.resolve('{"volume":22}'),
  });
  const input = screen.getByLabelText("Import settings file");
  fireEvent.change(input, { target: { files: [older] } });
  fireEvent.change(input, { target: { files: [newer] } });
  await screen.findByRole("dialog", { name: "Review imported preferences" });
  await act(async () => finishOld('{"volume":11}'));
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Apply changes",
    }),
  );
  expect(localStorage.getItem("volume")).toBe("22");
});

test("a stale profile list cannot overwrite another tab or malformed storage", async () => {
  const { user } = await setup();
  await user.click(
    screen.getByRole("button", { name: "Profiles & backup", exact: true }),
  );
  localStorage.setItem(PROFILES_KEY, "{broken");
  await user.type(
    screen.getByRole("textbox", { name: "Profile name" }),
    "New setup",
  );
  await user.click(
    screen.getByRole("button", { name: "Save profile", exact: true }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Profiles could not be saved",
  );
  expect(localStorage.getItem(PROFILES_KEY)).toBe("{broken");
});
