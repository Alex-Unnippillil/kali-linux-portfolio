import React from 'react';

interface DownloadCardProps {
  /** Title of the downloadable item */
  title: string;
  /** Short description */
  description?: string;
  /** URL to download */
  href: string;
  /** Optional className for custom styling */
  className?: string;
}

export default function DownloadCard({ title, description, href, className = '' }: DownloadCardProps) {
  const label = `Download ${title}`;
  return (
    <article
      className={`border rounded p-4 ${className}`.trim()}
      aria-label={label}
    >
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && <p className="text-sm mb-4">{description}</p>}
      <a href={href} download aria-label={label} className="text-blue-600 underline">
        Download
      </a>
    </article>
  );
}
