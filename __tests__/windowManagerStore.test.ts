import { windowManagerStore } from "../modules/window-manager/store";

describe("window manager store", () => {
  beforeEach(() => {
    windowManagerStore.reset();
  });

  it("opens and closes windows", () => {
    windowManagerStore.openWindow({
      id: "one",
      appId: "terminal",
      title: "Terminal",
    });

    expect(Object.keys(windowManagerStore.getState().windows)).toEqual(["one"]);

    windowManagerStore.closeWindow("one");
    expect(windowManagerStore.getState().windows).toEqual({});
  });

  it("tracks focus and minimization", () => {
    windowManagerStore.openWindow({
      id: "one",
      appId: "terminal",
      title: "Terminal",
    });
    windowManagerStore.openWindow({
      id: "two",
      appId: "terminal",
      title: "Terminal 2",
    });

    windowManagerStore.focusWindow("one");
    expect(windowManagerStore.getState().windows["one"].isFocused).toBe(true);
    expect(windowManagerStore.getState().windows["two"].isFocused).toBe(false);

    windowManagerStore.setMinimized("one", true);
    const stateAfterMinimize = windowManagerStore.getState();
    expect(stateAfterMinimize.windows["one"].isMinimized).toBe(true);
    expect(stateAfterMinimize.windows["one"].isFocused).toBe(false);

    windowManagerStore.focusWindow("two");
    expect(windowManagerStore.getState().windows["two"].isFocused).toBe(true);
  });
});
