'use client';

import Image from 'next/image';
import AboutApp from '@/components/apps/About';

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M4.98 3.5C4.98 5.43 3.4 7 1.5 7S-1.98 5.43-1.98 3.5C-1.98 1.57-.4 0 1.5 0s3.48 1.57 3.48 3.5zM0 8h3v16H0V8zm7.5 0H11v2.2h.05c.49-.93 1.69-1.9 3.48-1.9 3.72 0 4.4 2.45 4.4 5.63V24h-3.5v-7.8c0-1.86-.03-4.25-2.59-4.25-2.6 0-3 2.03-3 4.13V24H7.5V8z" />
    </svg>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen w-full bg-[var(--kali-bg)] text-sm">
      <div className="max-w-screen-md mx-auto my-4 sm:my-8 p-4 sm:p-6">
        <section className="flex items-center mb-8">
          <Image
            src="/images/logos/bitmoji.png"
            alt="Alex Unnippillil"
            width={128}
            height={128}
            className="w-32 h-32 rounded-full"
            priority
          />
          <div className="ml-4 flex-1 space-y-1.5">
            <h1 className="text-xl font-bold">Alex Unnippillil</h1>
            <p className="text-gray-200">Cybersecurity Specialist</p>
          </div>
          <div className="ml-4 flex gap-3">
            <a
              href="https://github.com/unnippillil"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="text-white"
            >
              <GitHubIcon className="w-6 h-6" />
            </a>
            <a
              href="https://www.linkedin.com/in/alex-unnippillil"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="text-white"
            >
              <LinkedInIcon className="w-6 h-6" />
            </a>
          </div>
        </section>
        <AboutApp />
      </div>
    </div>
  );
}
