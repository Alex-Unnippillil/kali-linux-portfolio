'use client';

import AboutApp from '../../components/apps/About';

export default function AboutPage() {
  return (
    <div className="min-h-screen w-full bg-[var(--kali-bg)] text-sm">
      <div className="max-w-screen-md mx-auto my-4 sm:my-8 p-4 sm:p-6">
        <AboutApp />
      </div>
    </div>
  );
}
