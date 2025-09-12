"use client";

interface SplashProps {
  fading?: boolean;
}

export default function Splash({ fading }: SplashProps) {
  return <div className={fading ? "splash-screen splash-screen--hide" : "splash-screen"} />;
}
