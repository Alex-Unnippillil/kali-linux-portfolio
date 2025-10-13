import {
  measureWindowTopOffset,
  subscribeToLayoutChanges,
  __testing__,
} from "../utils/windowLayout";

describe("windowLayout performance optimizations", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div class="main-navbar-vp" style="height:56px;"></div>';
    __testing__.invalidateLayoutCache();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    __testing__.invalidateLayoutCache();
    jest.restoreAllMocks();
  });

  it("memoizes window top offset measurements", () => {
    const navbar = document.querySelector(".main-navbar-vp");
    expect(navbar).not.toBeNull();
    if (!navbar) return;

    const rectSpy = jest
      .spyOn(navbar, "getBoundingClientRect")
      .mockImplementation(() => ({
        x: 0,
        y: 0,
        width: 0,
        height: 56,
        top: 0,
        bottom: 56,
        left: 0,
        right: 0,
        toJSON() {
          return {};
        },
      } as DOMRect));

    const first = measureWindowTopOffset();
    const second = measureWindowTopOffset();
    expect(first).toBe(second);
    expect(rectSpy).toHaveBeenCalledTimes(1);

    rectSpy.mockClear();
    __testing__.invalidateLayoutCache();
    measureWindowTopOffset();
    expect(rectSpy).toHaveBeenCalledTimes(1);
  });

  it("notifies layout subscribers after cache invalidation", () => {
    const callback = jest.fn();
    const unsubscribe = subscribeToLayoutChanges(callback);

    __testing__.invalidateLayoutCache();
    expect(callback).toHaveBeenCalledTimes(1);

    callback.mockClear();
    unsubscribe();
    __testing__.invalidateLayoutCache();
    expect(callback).not.toHaveBeenCalled();
  });
});
