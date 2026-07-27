"use client";

import { ReactNode, useEffect, useState } from "react";
import Splash from "../components/overlays/Splash";
import "../styles/index.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  const [showDesktop, setShowDesktop] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowDesktop(true);
      setTimeout(() => setShowSplash(false), 300);
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  return (
    <html lang="en">
      <body>
        {showDesktop && children}
        {showSplash && <Splash fading={showDesktop} />}
      </body>
    </html>
  );
}
