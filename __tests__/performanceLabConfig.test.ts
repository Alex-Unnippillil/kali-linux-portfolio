import config from "../performance-lab.config";

describe("performance lab configuration", () => {
  it("tracks the wallpaper as the LCP element", () => {
    const desktopScenario = config.scenarios.find(
      (scenario) => scenario.label === "desktop-home-lcp"
    );
    expect(desktopScenario).toBeDefined();
    expect(desktopScenario?.assertions.lcpSelector).toBe("[data-lcp-image='true']");
  });
});
