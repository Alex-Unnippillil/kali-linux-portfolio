import React from 'react';
import './hero.css';

/**
 * Hero heading renders a line break between words when the document theme is `kali`.
 * The break is only shown on screens `>=768px` to keep natural wrapping on mobile.
 */
export default function Hero() {
  return (
    <h1 className="hero-title text-4xl font-bold leading-tight md:text-6xl">
      Kali
      <br />
      Linux
    </h1>
  );
}
