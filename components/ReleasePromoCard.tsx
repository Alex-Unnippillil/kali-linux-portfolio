import React from 'react';
import Link from 'next/link';

interface ReleasePromoCardProps {
  version: string;
  tagline?: string;
}

export default function ReleasePromoCard({ version, tagline }: ReleasePromoCardProps) {
  return (
    <section className="mb-6 rounded border p-4 bg-ub-grey text-white">
      <h2 className="text-xl font-bold mb-2">{version} Release</h2>
      {tagline && <p className="mb-4">{tagline}</p>}
      <Link
        href="/get-kali"
        className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
      >
        Get Kali
      </Link>
    </section>
  );
}
