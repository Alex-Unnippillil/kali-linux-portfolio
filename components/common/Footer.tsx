import Link from 'next/link';
import React from 'react';

const Footer: React.FC = () => (
  <footer className="bg-ub-cool-grey text-ubt-grey text-sm mt-8 border-t border-gray-800">
    <div className="max-w-6xl mx-auto p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div>
        <h3 className="font-semibold mb-2">Policies</h3>
        <ul className="space-y-1">
          <li>
            <Link href="/legal" className="hover:underline">
              Legal Notice
            </Link>
          </li>
          <li>
            <Link href="/disclaimer" className="hover:underline">
              Disclaimer
            </Link>
          </li>
        </ul>
      </div>
    </div>
  </footer>
);

export default Footer;
