'use client';

import Image from 'next/image';
import AboutApp from '../../components/apps/About';

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
    <div className="min-h-screen w-full bg-[var(--kali-bg)]">
      <div className="mx-auto flex min-h-screen max-w-screen-md flex-col px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-10 rounded-xl border border-[color:var(--kali-border)] bg-[var(--kali-surface)] p-5 shadow-sm shadow-black/20 sm:p-7">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
            <div className="flex justify-center sm:flex-shrink-0">
              <Image
                src="/images/logos/bitmoji.1b21789f.png"
                alt="Alex Unnippillil"
                width={128}
                height={128}
                className="h-32 w-32 rounded-full border border-[color:var(--kali-border)] bg-black/20 shadow-inner"
                priority
              />
            </div>
            <div className="flex-1 space-y-4 text-center sm:text-left">
              <div className="space-y-1.5">
                <h1 className="text-3xl font-semibold text-white sm:text-4xl">Alex Unnippillil</h1>
                <p className="text-base font-medium text-kali-text/90 sm:text-lg">Cybersecurity Specialist</p>
              </div>
              <p className="mx-auto max-w-xl text-base leading-relaxed text-kali-text/80 sm:mx-0">
                Building secure-by-default experiences with a Kali-inspired interface that keeps tooling approachable and
                transparent.
              </p>
              <nav className="flex justify-center gap-3 sm:justify-start" aria-label="Social profiles">
                <a
                  href="https://github.com/unnippillil"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  className="group inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--kali-border)] bg-[var(--kali-overlay)] text-white transition focus-visible:border-[color:var(--kali-control)] focus-visible:bg-[color:var(--kali-control-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] hover:border-[color:var(--kali-control)] hover:bg-[color:var(--kali-control-overlay)] hover:text-[color:var(--kali-control)]"
                >
                  <GitHubIcon className="h-5 w-5 transition-transform duration-150 group-hover:scale-110" />
                </a>
                <a
                  href="https://www.linkedin.com/in/alex-unnippillil"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="group inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--kali-border)] bg-[var(--kali-overlay)] text-white transition focus-visible:border-[color:var(--kali-control)] focus-visible:bg-[color:var(--kali-control-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] hover:border-[color:var(--kali-control)] hover:bg-[color:var(--kali-control-overlay)] hover:text-[color:var(--kali-control)]"
                >
                  <LinkedInIcon className="h-5 w-5 transition-transform duration-150 group-hover:scale-110" />
                </a>
              </nav>
            </div>
          </div>
        </header>

        <section aria-labelledby="about-highlights" className="mb-10">
          <div className="mb-6 space-y-2 sm:space-y-3">
            <h2 id="about-highlights" className="text-xl font-semibold text-white sm:text-2xl">
              Profile highlights
            </h2>
            <p className="max-w-2xl text-base leading-relaxed text-kali-text/80">
              A quick snapshot of the capabilities and recent impact driving Kali Linux Portfolio forward.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <article
              tabIndex={0}
              className="rounded-xl border border-[color:var(--kali-border)] bg-[var(--kali-surface)] p-5 shadow-sm shadow-black/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] hover:border-[color:color-mix(in_srgb,var(--kali-control)_60%,var(--kali-border))] hover:bg-[color-mix(in_srgb,var(--kali-control)_18%,var(--kali-surface))] hover:shadow-black/30"
              aria-labelledby="highlight-skills"
            >
              <h3 id="highlight-skills" className="text-lg font-semibold text-white">
                Core skills
              </h3>
              <p className="mt-2 text-base text-kali-text/80">
                End-to-end security reviews, secure coding mentorship, and blue team readiness exercises.
              </p>
              <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-kali-text/70">
                <li>Threat modeling &amp; mitigation playbooks</li>
                <li>Cloud hardening for AWS &amp; Vercel</li>
                <li>Automation with Python &amp; TypeScript</li>
              </ul>
            </article>
            <article
              tabIndex={0}
              className="rounded-xl border border-[color:var(--kali-border)] bg-[var(--kali-surface)] p-5 shadow-sm shadow-black/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] hover:border-[color:color-mix(in_srgb,var(--kali-control)_60%,var(--kali-border))] hover:bg-[color-mix(in_srgb,var(--kali-control)_18%,var(--kali-surface))] hover:shadow-black/30"
              aria-labelledby="highlight-experience"
            >
              <h3 id="highlight-experience" className="text-lg font-semibold text-white">
                Recent experience
              </h3>
              <p className="mt-2 text-base text-kali-text/80">
                Scaling a security operations desk that supports offensive and defensive simulations for modern stacks.
              </p>
              <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-kali-text/70">
                <li>Built tabletop drills for product teams</li>
                <li>Delivered SOC automation runbooks</li>
                <li>Partnered with dev teams on threat hunts</li>
              </ul>
            </article>
            <article
              tabIndex={0}
              className="rounded-xl border border-[color:var(--kali-border)] bg-[var(--kali-surface)] p-5 shadow-sm shadow-black/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] hover:border-[color:color-mix(in_srgb,var(--kali-control)_60%,var(--kali-border))] hover:bg-[color-mix(in_srgb,var(--kali-control)_18%,var(--kali-surface))] hover:shadow-black/30"
              aria-labelledby="highlight-contact"
            >
              <h3 id="highlight-contact" className="text-lg font-semibold text-white">
                Connect with Alex
              </h3>
              <p className="mt-2 text-base text-kali-text/80">
                Open to collaborations, conference talks, and proactive security reviews across the builder ecosystem.
              </p>
              <div className="mt-4 space-y-3 text-kali-text/80">
                <a
                  href="mailto:alex@unnippillil.com"
                  className="inline-flex items-center text-base font-medium text-[color:var(--kali-control)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] hover:text-[color:color-mix(in_srgb,var(--kali-control)_85%,var(--kali-text))]"
                >
                  alex@unnippillil.com
                </a>
                <p className="text-sm text-kali-text/70">
                  Based in Chicago • Available for remote-first engagements.
                </p>
              </div>
            </article>
          </div>
        </section>

        <AboutApp />
      </div>
    </div>
  );
}
