import React from 'react';

interface FigureProps {
  /** Image source */
  src: string;
  /** Alternative text for the image */
  alt: string;
  /** Optional caption displayed below the image */
  caption?: React.ReactNode;
  /** Optional className for custom styling */
  className?: string;
}

export default function Figure({ src, alt, caption, className = '' }: FigureProps) {
  return (
    <figure className={className}>
      <img src={src} alt={alt} className="max-w-full" />
      {caption && <figcaption className="text-center text-sm mt-2">{caption}</figcaption>}
    </figure>
  );
}
