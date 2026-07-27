import type { Viewport } from "next";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0f1317" },
    { media: "(prefers-color-scheme: light)", color: "#f5f5f5" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default viewport;
