'use client';

import { GithubLogo } from '@phosphor-icons/react/dist/ssr/GithubLogo';
import { LinkedinLogo } from '@phosphor-icons/react/dist/ssr/LinkedinLogo';
import Image from 'next/image';
import AboutApp from '../../components/apps/About';

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
              <GithubLogo aria-hidden="true" className="h-6 w-6" />
            </a>
            <a
              href="https://www.linkedin.com/in/alex-unnippillil"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="text-white"
            >
              <LinkedinLogo aria-hidden="true" className="h-6 w-6" />
            </a>
          </div>
        </section>
        <AboutApp />
      </div>
    </div>
  );
}
