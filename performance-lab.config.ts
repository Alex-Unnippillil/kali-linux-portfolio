interface PerformanceLabAssertion {
  /**
   * CSS selector that should match the element reported as Largest Contentful Paint.
   */
  lcpSelector: string;
  /**
   * Maximum LCP value (in milliseconds) tolerated during automated checks.
   */
  maxLcpMs?: number;
}

interface PerformanceLabScenario {
  /** Unique label for the run so results are easy to identify. */
  label: string;
  /** URL path that will be tested. */
  url: string;
  /** Optional viewport to emulate during the run. */
  viewport?: {
    width: number;
    height: number;
    deviceScaleFactor?: number;
  };
  assertions: PerformanceLabAssertion;
}

interface PerformanceLabConfig {
  project: string;
  description?: string;
  scenarios: PerformanceLabScenario[];
}

const config: PerformanceLabConfig = {
  project: "kali-linux-portfolio",
  description:
    "Ensures the boot wallpaper is tagged as the LCP element and keeps paint time budgets within limits.",
  scenarios: [
    {
      label: "desktop-home-lcp",
      url: "/",
      viewport: {
        width: 1280,
        height: 720,
        deviceScaleFactor: 1,
      },
      assertions: {
        lcpSelector: "[data-lcp-image='true']",
        maxLcpMs: 2600,
      },
    },
  ],
};

export default config;
