import { computeSnapRegions } from "../utils/windowLayout";

describe("computeSnapRegions", () => {
  it("computes half-width edge regions in landscape layouts", () => {
    const measureSafeAreaInset = jest
      .fn<(side: string) => number>()
      .mockImplementation((side) => (side === "bottom" ? 24 : 0));
    const measureSnapBottomInset = jest.fn(() => 48);

    const regions = computeSnapRegions(1200, 800, 96, undefined, {
      measureSafeAreaInset,
      measureSnapBottomInset,
    });

    expect(regions.left).toEqual({
      height: 632,
      left: 0,
      top: 96,
      width: 600,
    });
    expect(regions.right).toEqual({
      height: 632,
      left: 600,
      top: 96,
      width: 600,
    });
  });

  it("returns quarter-sized corners for portrait orientations", () => {
    const measureSafeAreaInset = jest
      .fn<(side: string) => number>()
      .mockImplementation((side) => (side === "bottom" ? 16 : 0));
    const measureSnapBottomInset = jest.fn(() => 40);

    const regions = computeSnapRegions(768, 1024, 120, undefined, {
      measureSafeAreaInset,
      measureSnapBottomInset,
    });

    expect(regions["top-left"]).toEqual({
      height: 424,
      left: 0,
      top: 120,
      width: 384,
    });
    expect(regions["top-right"]).toEqual({
      height: 424,
      left: 384,
      top: 120,
      width: 384,
    });
    expect(regions["bottom-left"]).toEqual({
      height: 424,
      left: 0,
      top: 544,
      width: 384,
    });
    expect(regions["bottom-right"]).toEqual({
      height: 424,
      left: 384,
      top: 544,
      width: 384,
    });
  });

  it("maximizes the top region using a provided bottom inset", () => {
    const measureSafeAreaInset = jest
      .fn<(side: string) => number>()
      .mockImplementation((side) => (side === "bottom" ? 12 : 0));
    const measureSnapBottomInset = jest.fn(() => 999);

    const regions = computeSnapRegions(1440, 900, 88, 60, {
      measureSafeAreaInset,
      measureSnapBottomInset,
    });

    expect(measureSnapBottomInset).not.toHaveBeenCalled();
    expect(regions.top).toEqual({
      height: 740,
      left: 0,
      top: 88,
      width: 1440,
    });
  });
});
