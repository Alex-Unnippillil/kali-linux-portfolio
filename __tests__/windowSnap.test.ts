import { computeSnapRegions, resolvePointerSnapCandidate } from "../utils/windowSnap";

const viewport = { width: 1000, height: 800, left: 0, top: 0 };
const insets = { topInset: 48, snapBottomInset: 40, safeAreaBottom: 10 };

describe("window snap candidate resolution", () => {
  it("prioritizes corners over edges", () => {
    const thresholds = { x: 30, y: 30 };

    const topLeft = resolvePointerSnapCandidate({
      viewport,
      insets,
      pointer: { x: 10, y: 10 },
      thresholds,
    });
    expect(topLeft?.position).toBe("top-left");

    const top = resolvePointerSnapCandidate({
      viewport,
      insets,
      pointer: { x: 500, y: 10 },
      thresholds,
    });
    expect(top?.position).toBe("top");

    const left = resolvePointerSnapCandidate({
      viewport,
      insets,
      pointer: { x: 10, y: 300 },
      thresholds,
    });
    expect(left?.position).toBe("left");
  });

  it("respects safe-area and snap bottom insets when computing regions", () => {
    const regions = computeSnapRegions(viewport, insets);
    const availableHeight = viewport.height - insets.topInset - insets.snapBottomInset - insets.safeAreaBottom;
    expect(regions.top.height).toBeCloseTo(availableHeight, 2);
    expect(regions["bottom-left"].top).toBeCloseTo(insets.topInset + availableHeight / 2, 2);
  });

  it("uses larger commit thresholds than preview thresholds", () => {
    const preview = resolvePointerSnapCandidate({
      viewport,
      insets,
      pointer: { x: 930, y: 300 },
      thresholds: { x: 50, y: 50 },
    });
    expect(preview).toBeNull();

    const commit = resolvePointerSnapCandidate({
      viewport,
      insets,
      pointer: { x: 930, y: 300 },
      thresholds: { x: 90, y: 90 },
    });
    expect(commit?.position).toBe("right");
  });

  it("keeps candidates active within hysteresis padding", () => {
    const regions = computeSnapRegions(viewport, insets);
    const previousCandidate = { position: "left" as const, previewRect: regions.left };
    const thresholds = { x: 30, y: 30 };

    const stillActive = resolvePointerSnapCandidate({
      viewport,
      insets,
      pointer: { x: 45, y: 200 },
      thresholds,
      previousCandidate,
      hysteresisPadding: 16,
    });
    expect(stillActive?.position).toBe("left");

    const cleared = resolvePointerSnapCandidate({
      viewport,
      insets,
      pointer: { x: 70, y: 200 },
      thresholds,
      previousCandidate,
      hysteresisPadding: 16,
    });
    expect(cleared).toBeNull();
  });
});
