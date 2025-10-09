import {
  DEFAULT_WINDOW_TOP_OFFSET,
  computeEdgeThreshold,
  computeSnapRegions,
} from "../utils/windowLayout";
import { DESKTOP_TOP_PADDING, SNAP_BOTTOM_INSET } from "../utils/uiConstants";

describe("windowLayout snap utilities", () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  const setViewportSize = (width: number, height: number) => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
  };

  const mockSafeArea = (bottom: number) =>
    jest.spyOn(window, "getComputedStyle").mockImplementation(() => ({
      getPropertyValue: (property: string) => {
        if (property === "--safe-area-bottom") {
          return `${bottom}px`;
        }
        return "0px";
      },
    }) as unknown as CSSStyleDeclaration);

  afterEach(() => {
    setViewportSize(originalInnerWidth, originalInnerHeight);
    jest.restoreAllMocks();
  });

  it("clamps edge thresholds for narrow and wide viewports", () => {
    expect(computeEdgeThreshold(320)).toBe(48);
    expect(computeEdgeThreshold(1200)).toBeCloseTo(60);
    expect(computeEdgeThreshold(5000)).toBe(160);
  });

  it("computes balanced snap regions on landscape viewports", () => {
    setViewportSize(1440, 900);
    const safeAreaMock = mockSafeArea(0);

    const viewportWidth = 1440;
    const viewportHeight = 900;
    const regions = computeSnapRegions(viewportWidth, viewportHeight);

    const normalizedTopInset = Math.max(DEFAULT_WINDOW_TOP_OFFSET, DESKTOP_TOP_PADDING);
    const safeBottom = 0;
    const availableHeight = Math.max(
      0,
      viewportHeight - normalizedTopInset - SNAP_BOTTOM_INSET - safeBottom,
    );
    const expectedTopHeight = Math.min(availableHeight, viewportHeight / 2);

    expect(regions.left).toEqual({
      left: 0,
      top: normalizedTopInset,
      width: viewportWidth / 2,
      height: availableHeight,
    });
    expect(regions.right).toEqual({
      left: viewportWidth / 2,
      top: normalizedTopInset,
      width: viewportWidth / 2,
      height: availableHeight,
    });
    expect(regions.top).toEqual({
      left: 0,
      top: normalizedTopInset,
      width: viewportWidth,
      height: expectedTopHeight,
    });

    safeAreaMock.mockRestore();
  });

  it("normalizes top inset and safe-area offsets on portrait viewports", () => {
    setViewportSize(900, 1440);
    const safeAreaBottom = 24;
    const safeAreaMock = mockSafeArea(safeAreaBottom);

    const viewportWidth = 900;
    const viewportHeight = 1440;
    const providedTopInset = 40; // smaller than desktop padding to exercise normalization
    const regions = computeSnapRegions(viewportWidth, viewportHeight, providedTopInset);

    const normalizedTopInset = Math.max(providedTopInset, DESKTOP_TOP_PADDING);
    const availableHeight = Math.max(
      0,
      viewportHeight - normalizedTopInset - SNAP_BOTTOM_INSET - safeAreaBottom,
    );
    const expectedTopHeight = Math.min(availableHeight, viewportHeight / 2);

    expect(regions.left.top).toBe(normalizedTopInset);
    expect(regions.left.height).toBe(availableHeight);
    expect(regions.right.left).toBe(viewportWidth / 2);
    expect(regions.top.height).toBe(expectedTopHeight);

    safeAreaMock.mockRestore();
  });
});
