import type { ReactElement } from 'react';
import Link from 'next/link';

export const MOBILE_BREAKPOINT = 600;

const MobileLanding = (): ReactElement => (
  <main
    className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0d1117] px-6 py-12 text-center text-white"
    aria-labelledby="mobile-landing-title"
  >
    <div className="max-w-md space-y-3">
      <p className="text-sm uppercase tracking-[0.2em] text-gray-400">
        Kali Linux Portfolio
      </p>
      <h1 id="mobile-landing-title" className="text-2xl font-semibold">
        Best experienced on desktop
      </h1>
      <p className="text-base text-gray-300">
        This portfolio simulates a desktop environment. For a smoother
        experience, revisit on a larger screen or jump to a quick overview
        below.
      </p>
    </div>
    <nav aria-label="Quick links">
      <ul className="flex flex-col items-center gap-3 text-lg font-medium text-[#58a6ff]">
        <li>
          <Link href="/profile" className="underline-offset-4 hover:underline">
            View profile
          </Link>
        </li>
        <li>
          <Link href="/contact" className="underline-offset-4 hover:underline">
            Contact
          </Link>
        </li>
      </ul>
    </nav>
  </main>
);

export default MobileLanding;
