import React from 'react';

interface DownloadCardProps {
  title: string;
  href: string;
  caption: string;
}

export default function DownloadCard({ title, href, caption }: DownloadCardProps) {
  return (
    <div className="flex flex-col rounded border p-4">
      <h2 className="mb-2 text-xl font-semibold">{title}</h2>
      <p className="mb-4">{caption}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto text-blue-500 hover:underline"
      >
        Learn more
      </a>
    </div>
  );
}
