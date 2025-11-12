import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import ReactGA from 'react-ga4';
import type { MouseEventHandler } from 'react';

import Certs from '../certs';
import SafetyNote from './SafetyNote';
import AboutSlides from './slides';
import ScrollableTimeline from '../../ScrollableTimeline';
import GitHubContributionHeatmap from './GitHubContributionHeatmap';
import GitHubStars from '../../GitHubStars';
import { getCspNonce } from '../../../utils/csp';
import { aboutProfile } from '../../../data/about/profile';
import type {
  AboutInterfaceController,
} from '../../../hooks/useAboutInterface';
import useAboutInterface from '../../../hooks/useAboutInterface';

const workerApps = [
  { id: 'hydra', label: 'Hydra' },
  { id: 'john', label: 'John the Ripper' },
  { id: 'metasploit', label: 'Metasploit' },
  { id: 'mimikatz', label: 'Mimikatz' },
  { id: 'radare2', label: 'Radare2' },
];

export interface AboutAppProps {
  controller?: AboutInterfaceController;
  showSlides?: boolean;
}

function AboutWindow({ controller }: { controller: AboutInterfaceController }) {
  const {
    sections,
    navProps,
    getTabProps,
    activeSectionId,
    liveMessage,
    tokens,
    focusRingClass,
    typography,
    shouldReduceMotion,
  } = controller;

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const nonce = getCspNonce();

  const structured = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Alex Unnippillil',
      url: 'https://unnippillil.com',
    }),
    []
  );

  const activeScreen = useMemo(() => {
    switch (activeSectionId) {
      case 'about':
        return (
          <AboutOverview
            focusRingClass={focusRingClass}
            shouldReduceMotion={shouldReduceMotion}
          />
        );
      case 'education':
        return <Education typography={typography} />;
      case 'skills':
        return (
          <Skills
            categories={aboutProfile.skillCategories}
            focusRingClass={focusRingClass}
            shouldReduceMotion={shouldReduceMotion}
          />
        );
      case 'certs':
        return (
          <section className="flex flex-col gap-6">
            <h2 className={typography.sectionHeading}>Certifications</h2>
            <Certs />
          </section>
        );
      case 'projects':
        return (
          <Projects
            projects={aboutProfile.projects}
            focusRingClass={focusRingClass}
            shouldReduceMotion={shouldReduceMotion}
          />
        );
      case 'resume':
        return <Resume focusRingClass={focusRingClass} />;
      default:
        return null;
    }
  }, [
    activeSectionId,
    focusRingClass,
    shouldReduceMotion,
    typography,
  ]);

  const mobileNavClass = shouldReduceMotion
    ? ''
    : 'transition-opacity duration-150';

  return (
    <main
      className={`relative flex h-full w-full select-none ${tokens.panel} ${tokens.text}`}
    >
      <Head>
        <title>About</title>
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }}
        />
      </Head>
      <div className="sr-only" aria-live="polite">
        {liveMessage}
      </div>
      <div
        {...navProps}
        className={`windowMainScreen hidden h-full w-1/4 flex-col overflow-y-auto border-r ${tokens.border} ${tokens.panel} text-sm md:flex`}
      >
        {sections.map((section) => (
          <AboutNavItem
            key={section.id}
            section={section}
            tabProps={getTabProps(section)}
          />
        ))}
      </div>
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileNavOpen((value) => !value)}
          className={`absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-md border ${tokens.border} ${tokens.panel} ${tokens.text}`}
        >
          <span className="sr-only">Toggle About navigation</span>
          <div
            className={`flex h-3 w-4 flex-col items-center justify-between ${
              shouldReduceMotion ? '' : 'transition-transform duration-150'
            } ${mobileNavOpen ? 'scale-95' : ''}`}
          >
            <span className="h-0.5 w-full rounded-full bg-current" />
            <span className="h-0.5 w-full rounded-full bg-current" />
            <span className="h-0.5 w-full rounded-full bg-current" />
          </div>
        </button>
        {mobileNavOpen && (
          <div
            {...navProps}
            className={`absolute left-2 top-12 z-30 w-48 rounded-md border ${tokens.border} ${tokens.panel} shadow-lg shadow-black/30 ${mobileNavClass}`}
          >
            {sections.map((section) => (
              <AboutNavItem
                key={section.id}
                section={section}
                tabProps={getTabProps(section)}
                extraClassName="w-full"
                onSelect={() => setMobileNavOpen(false)}
              />
            ))}
          </div>
        )}
      </div>
      <div
        className={`windowMainScreen flex flex-1 flex-col items-center overflow-y-auto px-4 pb-8 pt-6 ${tokens.surface}`}
      >
        <div className="w-full max-w-5xl space-y-8">{activeScreen}</div>
      </div>
    </main>
  );
}

function AboutAppBase({
  controller,
  showSlides,
}: {
  controller: AboutInterfaceController;
  showSlides: boolean;
}) {
  return (
    <>
      <AboutWindow controller={controller} />
      {showSlides && <AboutSlides />}
    </>
  );
}

function AboutAppWithHook({ showSlides }: { showSlides: boolean }) {
  const controller = useAboutInterface({
    sections: aboutProfile.sections,
    defaultSectionId: 'about',
    onSectionChange: (sectionId) =>
      ReactGA.send({
        hitType: 'pageview',
        page: `/${sectionId}`,
        title: 'Custom Title',
      }),
  });

  return <AboutAppBase controller={controller} showSlides={showSlides} />;
}

export default function AboutApp({
  controller,
  showSlides = true,
}: AboutAppProps) {
  if (controller) {
    return <AboutAppBase controller={controller} showSlides={showSlides} />;
  }

  return <AboutAppWithHook showSlides={showSlides} />;
}

export { default as SafetyNote } from './SafetyNote';

type AboutSection = (typeof aboutProfile.sections)[number];
type SkillCategory = (typeof aboutProfile.skillCategories)[number];

type TabProps = ReturnType<AboutInterfaceController['getTabProps']>;

interface AboutNavItemProps {
  section: AboutSection;
  tabProps: TabProps;
  extraClassName?: string;
  onSelect?: () => void;
}

function AboutNavItem({
  section,
  tabProps,
  extraClassName,
  onSelect,
}: AboutNavItemProps) {
  const handleClick: MouseEventHandler<HTMLDivElement> = (event) => {
    tabProps.onClick?.(event);
    onSelect?.();
  };

  return (
    <div
      {...tabProps}
      className={`${tabProps.className ?? ''} ${extraClassName ?? ''}`.trim()}
      onClick={handleClick}
    >
      <Image
        className="h-4 w-4 rounded border border-[color:var(--kali-border)]"
        alt={section.alt}
        src={section.icon}
        width={16}
        height={16}
        sizes="16px"
      />
      <span className="truncate text-[color:var(--color-text)]">{section.label}</span>
    </div>
  );
}

interface AboutOverviewProps {
  focusRingClass: string;
  shouldReduceMotion: boolean;
}

function AboutOverview({ focusRingClass, shouldReduceMotion }: AboutOverviewProps) {
  const linkFocus = `${focusRingClass} underline decoration-[color:var(--color-focus-ring)] decoration-2 underline-offset-4 transition-colors hover:text-[color:var(--kali-control)]`;

  return (
    <section className="flex flex-col items-center text-center">
      <div className="mt-4 w-24 md:mt-6 md:w-32">
        <Image
          className="w-full rounded-full border border-[color:var(--kali-border)] bg-black/30"
          src="/images/logos/bitmoji.png"
          alt="Alex Unnippillil Logo"
          width={256}
          height={256}
          sizes="(max-width: 768px) 50vw, 25vw"
          priority
        />
      </div>
      <div className="mt-4 space-y-1 text-base md:mt-8 md:text-2xl">
        <p>
          My name is <span className="font-bold">Alex Unnippillil</span>,
        </p>
        <p className="font-normal">
          I&apos;m a{' '}
          <span className="text-[color:var(--kali-control)] font-bold">
            Cybersecurity Specialist!
          </span>
        </p>
      </div>
      <div className="relative mt-6 w-32 border-t border-[color:var(--kali-border)] md:mt-8 md:w-48">
        <div className="absolute -top-2 left-0 h-4 w-4 -translate-y-1/2 rounded-full border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]" />
        <div className="absolute -top-2 right-0 h-4 w-4 -translate-y-1/2 rounded-full border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]" />
      </div>
      <ul className="emoji-list mt-6 w-full max-w-2xl space-y-3 text-left text-sm leading-relaxed text-[color:color-mix(in_srgb,var(--color-text)_82%,transparent)] md:text-base">
        <li className="list-pc">
          I&apos;m a <span className="font-medium">Technology Enthusiast</span> who thrives on learning and mastering the rapidly
          evolving world of tech. I completed four years of a{' '}
          <a
            className={linkFocus}
            href="https://shared.ontariotechu.ca/shared/faculty/fesns/documents/FESNS%20Program%20Maps/2018_nuclear_engineering_map_2017_entry.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            Nuclear Engineering
          </a>{' '}
          degree at Ontario Tech University before deciding to change my career goals and pursue my passion for{' '}
          <a
            className={linkFocus}
            href="https://businessandit.ontariotechu.ca/undergraduate/bachelor-of-information-technology/networking-and-information-technology-security/networking-and-i.t-security-bit-2023-2024_.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            Networking and I.T. Security
          </a>
          .
        </li>
        <li className="list-building">
          If you&apos;re looking for someone who always wants to help others and will put in the work 24/7, feel free to email{' '}
          <a className={linkFocus} href="mailto:alex.unnippillil@hotmail.com">
            alex.unnippillil@hotmail.com
          </a>
          .
        </li>
        <li className="list-time">
          When I&apos;m not learning new technical skills, I enjoy reading books, rock climbing, or watching{' '}
          <a
            className={linkFocus}
            href="https://www.youtube.com/@Alex-Unnippillil/playlists"
            target="_blank"
            rel="noopener noreferrer"
          >
            YouTube videos
          </a>{' '}
          and{' '}
          <a
            className={linkFocus}
            href="https://myanimelist.net/animelist/alex_u"
            target="_blank"
            rel="noopener noreferrer"
          >
            anime
          </a>
          .
        </li>
        <li className="list-star">
          I also have interests in deep learning, software development, and animation.
        </li>
      </ul>
      <WorkerStatus shouldReduceMotion={shouldReduceMotion} />
      <SafetyNote />
      <Timeline />
    </section>
  );
}

interface WorkerStatusProps {
  shouldReduceMotion: boolean;
}

function WorkerStatus({ shouldReduceMotion }: WorkerStatusProps) {
  const [status, setStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    workerApps.forEach((app) => {
      fetch(`/api/${app.id}`, { method: 'HEAD' })
        .then((res) => {
          setStatus((s) => ({ ...s, [app.id]: res.status < 500 ? 'Online' : 'Offline' }));
        })
        .catch(() => {
          setStatus((s) => ({ ...s, [app.id]: 'Offline' }));
        });
    });
  }, []);

  const pulseClass = shouldReduceMotion ? '' : 'animate-pulse';

  return (
    <section
      aria-labelledby="app-status-heading"
      className="mt-8 w-full max-w-xl rounded-lg border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_92%,transparent)] p-4"
    >
      <h2 id="app-status-heading" className="text-lg font-semibold text-[color:var(--color-text)] text-center">
        Worker App Availability
      </h2>
      <ul role="list" className="mt-3 divide-y divide-[color:var(--kali-border)]/40 text-sm">
        {workerApps.map((app) => (
          <li key={app.id} className="flex items-center justify-between py-2 text-[color:var(--color-text)]/85">
            <span className="capitalize">{app.label}</span>
            <span className="flex items-center gap-2" aria-live="polite">
              <span
                className={`h-2 w-2 rounded-full ${
                  status[app.id] === 'Online' ? `bg-[color:var(--kali-control)] ${pulseClass}` : 'bg-red-400'
                }`}
              />
              {status[app.id] || 'Checking...'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Timeline() {
  return (
    <div className="mt-10 w-full max-w-xl">
      <ScrollableTimeline />
      <div className="no-print mt-4 flex justify-end">
        <a
          href="/assets/timeline.pdf"
          download
          className="inline-flex items-center rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] px-3 py-1.5 text-sm font-medium text-[color:var(--color-text)] transition-colors hover:border-[color:var(--kali-control)] hover:text-[color:var(--kali-control)]"
        >
          Download Timeline PDF
        </a>
      </div>
    </div>
  );
}

interface EducationProps {
  typography: AboutInterfaceController['typography'];
}

function Education({ typography }: EducationProps) {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className={typography.sectionHeading}>Education</h2>
        <p className={typography.subtle}>
          Formal training across engineering and security disciplines that shape Alex&apos;s research-driven approach.
        </p>
      </header>
      <ul className="space-y-5 text-sm text-[color:color-mix(in_srgb,var(--color-text)_80%,transparent)] md:text-base">
        <li className="rounded-lg border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,transparent)] p-4 shadow-sm shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-[color:var(--color-text)]">Ontario Tech University</span>
            <span className="text-xs text-[color:color-mix(in_srgb,var(--color-text)_60%,transparent)]">2020 - 2024</span>
          </div>
          <p className="mt-1 text-sm text-[color:color-mix(in_srgb,var(--color-text)_75%,transparent)]">
            Networking and Information Technology Security (BIT)
          </p>
        </li>
        <li className="rounded-lg border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,transparent)] p-4 shadow-sm shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-[color:var(--color-text)]">Ontario Tech University</span>
            <span className="text-xs text-[color:color-mix(in_srgb,var(--color-text)_60%,transparent)]">2012 - 2016</span>
          </div>
          <p className="mt-1 text-sm text-[color:color-mix(in_srgb,var(--color-text)_75%,transparent)]">
            Nuclear Engineering (B.Eng)
          </p>
        </li>
        <li className="rounded-lg border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,transparent)] p-4 shadow-sm shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-[color:var(--color-text)]">
              St. John Paul II Catholic Secondary School
            </span>
            <span className="text-xs text-[color:color-mix(in_srgb,var(--color-text)_60%,transparent)]">2008 - 2012</span>
          </div>
          <p className="mt-1 text-sm text-[color:color-mix(in_srgb,var(--color-text)_75%,transparent)]">
            Specialist High Skills Major (SHSM) in Information &amp; Communication Technology
          </p>
        </li>
      </ul>
    </section>
  );
}

interface SkillsProps {
  categories: SkillCategory[];
  focusRingClass: string;
  shouldReduceMotion: boolean;
}

function Skills({ categories, focusRingClass, shouldReduceMotion }: SkillsProps) {
  const [filter, setFilter] = useState('');
  const transitionClass = shouldReduceMotion ? '' : 'transition-transform duration-150';

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-[color:var(--color-text)]">Technical Skills</h2>
        <p className="text-sm text-[color:color-mix(in_srgb,var(--color-text)_70%,transparent)] md:text-base">
          A snapshot of the tooling and platforms Alex relies on when hardening teams and running blue team exercises.
        </p>
      </header>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-[color:color-mix(in_srgb,var(--color-text)_75%,transparent)] md:text-base">
          I&apos;ve learned a variety of programming languages and frameworks while{' '}
          <span className="font-semibold text-[color:var(--kali-control)]">specializing in network security.</span>
        </p>
        <label className="flex w-full items-center gap-2 rounded-lg border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] px-3 py-2 text-sm text-[color:var(--color-text)] md:w-80">
          <span className="text-xs uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-text)_60%,transparent)]">
            Filter
          </span>
          <input
            type="text"
            className={`flex-1 bg-transparent text-sm text-[color:var(--color-text)] placeholder:text-[color:color-mix(in_srgb,var(--color-text)_50%,transparent)] focus:outline-none ${focusRingClass}`}
            placeholder="Search badges"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter skill badges"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {categories.map((category) => (
          <SkillSection
            key={category.id}
            category={category}
            filter={filter}
            focusRingClass={focusRingClass}
            transitionClass={transitionClass}
          />
        ))}
      </div>
      <div className="mt-6 space-y-4 rounded-lg border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_92%,transparent)] p-4 text-center">
        <h3 className="text-sm font-semibold text-[color:var(--color-text)] md:text-base">
          GitHub Contributions
        </h3>
        <GitHubContributionHeatmap username="alex-unnippillil" year={2025} />
        <p className="text-xs text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
          <span className="mr-1 font-semibold text-[color:var(--color-text)]">Portfolio repo stars:</span>
          <GitHubStars user="alex-unnippillil" repo="kali-linux-portfolio" />
        </p>
      </div>
    </section>
  );
}

interface SkillSectionProps {
  category: SkillCategory;
  filter: string;
  focusRingClass: string;
  transitionClass: string;
}

function SkillSection({ category, filter, focusRingClass, transitionClass }: SkillSectionProps) {
  const [selected, setSelected] = useState<SkillCategory['badges'][number] | null>(null);
  const filteredBadges = category.badges.filter((badge) =>
    badge.alt.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <article className="flex flex-col rounded-lg border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_95%,transparent)] p-4 shadow-sm shadow-black/20">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--color-text)] md:text-base">
          {category.title}
        </h3>
        <span className="text-xs text-[color:color-mix(in_srgb,var(--color-text)_60%,transparent)]">
          {filteredBadges.length} badges
        </span>
      </header>
      <div className="mt-3 flex flex-wrap gap-2">
        {filteredBadges.map((badge) => (
          <button
            key={badge.alt}
            type="button"
            className={`rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] px-2 py-1 text-xs text-[color:var(--color-text)] shadow-sm hover:border-[color:var(--kali-control)] hover:text-[color:var(--kali-control)] ${focusRingClass} ${transitionClass}`}
            onClick={() => setSelected(badge)}
          >
            {badge.alt}
          </button>
        ))}
      </div>
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={selected.alt}
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-xs rounded-lg border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] p-4 text-center shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h4 className="text-base font-semibold text-[color:var(--color-text)]">{selected.alt}</h4>
            <p className="mt-2 text-sm text-[color:color-mix(in_srgb,var(--color-text)_75%,transparent)]">
              {selected.description}
            </p>
            <button
              type="button"
              className={`mt-4 inline-flex items-center rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] px-3 py-1 text-sm text-[color:var(--color-text)] hover:text-[color:var(--kali-control)] ${focusRingClass}`}
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

interface ProjectsProps {
  projects: typeof aboutProfile.projects;
  focusRingClass: string;
  shouldReduceMotion: boolean;
}

function Projects({ projects, focusRingClass, shouldReduceMotion }: ProjectsProps) {
  const cardTransition = shouldReduceMotion ? '' : 'transition-colors duration-150';

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-[color:var(--color-text)]">Projects</h2>
        <p className="text-sm text-[color:color-mix(in_srgb,var(--color-text)_70%,transparent)] md:text-base">
          A cross-section of repositories showcasing automation, crypto experimentation, and interactive tools.
        </p>
      </header>
      <div className="space-y-4">
        {projects.map((project) => {
          const projectNameFromLink = project.link.split('/');
          const projectName = projectNameFromLink[projectNameFromLink.length - 1];
          return (
            <article
              key={project.link}
              className={`rounded-lg border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_94%,transparent)] p-4 shadow-sm shadow-black/25 ${cardTransition} hover:border-[color:var(--kali-control)]`}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-lg font-semibold capitalize text-[color:var(--color-text)] hover:text-[color:var(--kali-control)] ${focusRingClass}`}
                    >
                      {project.name.toLowerCase()}
                    </a>
                    <GitHubStars user="alex-unnippillil" repo={projectName} />
                  </div>
                  <ul className="ml-4 list-disc space-y-1 text-sm text-[color:color-mix(in_srgb,var(--color-text)_75%,transparent)]">
                    {project.description.map((description) => (
                      <li key={description}>{description}</li>
                    ))}
                  </ul>
                </div>
                <span className="shrink-0 text-xs text-[color:color-mix(in_srgb,var(--color-text)_60%,transparent)]">
                  {project.date}
                </span>
              </div>
              {project.domains?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {project.domains.map((domain) => (
                    <span
                      key={`${project.name}-${domain}`}
                      className="rounded-full border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] px-2 py-0.5 text-xs font-medium text-[color:var(--color-text)]"
                    >
                      {domain}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

interface ResumeProps {
  focusRingClass: string;
}

function Resume({ focusRingClass }: ResumeProps) {
  const handleDownload = () => {
    ReactGA.event({ category: 'resume', action: 'download' });
  };

  const shareContact = async () => {
    const vcardUrl = '/assets/alex-unnippillil.vcf';
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Alex Unnippillil Contact',
          url: window.location.origin + vcardUrl,
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      window.location.href = vcardUrl;
    }
  };

  const buttonClass = `inline-flex items-center rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-control)] px-3 py-1.5 text-sm font-medium text-slate-900 shadow-sm hover:brightness-110 ${focusRingClass}`;

  return (
    <section className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap justify-end gap-2">
        <a
          href="/assets/Alex-Unnippillil-Resume.pdf"
          download
          onClick={handleDownload}
          className={buttonClass}
        >
          Download
        </a>
        <a href="/assets/alex-unnippillil.vcf" download className={buttonClass}>
          vCard
        </a>
        <button type="button" onClick={shareContact} className={buttonClass}>
          Share contact
        </button>
      </div>
      <object
        className="flex-1 rounded-lg border border-[color:var(--kali-border)]"
        data="/assets/Alex-Unnippillil-Resume.pdf"
        type="application/pdf"
      >
        <p className="p-4 text-center text-[color:var(--color-text)]">
          Unable to display PDF.&nbsp;
          <a
            href="/assets/Alex-Unnippillil-Resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className={`text-[color:var(--kali-control)] underline ${focusRingClass}`}
            onClick={handleDownload}
          >
            Download the resume
          </a>
        </p>
      </object>
    </section>
  );
}
