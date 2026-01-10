import Head from 'next/head';
import Image from 'next/image';
import React from 'react';
import ScrollableTimeline from '../components/ScrollableTimeline';
import aboutJson from '../components/apps/alex/data.json';
import resumeJson from '../components/apps/alex/resume.json';

type SectionId = 'overview' | 'experience' | 'skills' | 'projects' | 'timeline' | 'connect';

interface SectionDefinition {
  id: SectionId;
  label: string;
  title: string;
  summary: string;
}

interface SkillBadge {
  src: string;
  alt: string;
  description: string;
}

interface AboutData {
  skills: {
    networkingSecurity: SkillBadge[];
    softwaresOperating: SkillBadge[];
    languagesTools: SkillBadge[];
    frameworksLibraries: SkillBadge[];
  };
  projects: {
    name: string;
    date: string;
    link: string;
    description: string[];
    domains: string[];
  }[];
}

interface ResumeData {
  experience: {
    date: string;
    description: string;
    tags: string[];
  }[];
}

const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    id: 'overview',
    label: 'Overview',
    title: 'Who is Alex?',
    summary: 'A quick introduction and what motivates Alex as a cybersecurity specialist.',
  },
  {
    id: 'experience',
    label: 'Experience',
    title: 'Education & Experience',
    summary: 'Key academic milestones and formative career highlights.',
  },
  {
    id: 'skills',
    label: 'Skills',
    title: 'Technical Skills Snapshot',
    summary: 'Highlight technologies Alex works with most frequently.',
  },
  {
    id: 'projects',
    label: 'Projects',
    title: 'Featured Projects',
    summary: 'Selected hands-on projects that demonstrate security tooling and automation.',
  },
  {
    id: 'timeline',
    label: 'Timeline',
    title: 'Interactive Timeline',
    summary: 'Scroll through notable achievements using the interactive gallery.',
  },
  {
    id: 'connect',
    label: 'Connect',
    title: 'Connect with Alex',
    summary: 'Ways to reach out and explore more of Alex’s work.',
  },
];

const SECTION_ORDER = SECTION_DEFINITIONS.map((section) => section.id);

const aboutData = aboutJson as AboutData;
const resumeData = resumeJson as ResumeData;

const skillGroups: { title: string; badges: SkillBadge[] }[] = [
  { title: 'Networking & Security', badges: aboutData.skills.networkingSecurity.slice(0, 8) },
  { title: 'Software & Operating Systems', badges: aboutData.skills.softwaresOperating.slice(0, 8) },
  { title: 'Languages & Tools', badges: aboutData.skills.languagesTools.slice(0, 8) },
  { title: 'Frameworks & Libraries', badges: aboutData.skills.frameworksLibraries.slice(0, 8) },
];

const featuredProjects = aboutData.projects.slice(0, 6);

const AboutAlexPage: React.FC = () => {
  const [activeId, setActiveId] = React.useState<SectionId>('overview');
  const [focusIndex, setFocusIndex] = React.useState(0);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  const navToggleRef = React.useRef<HTMLButtonElement>(null);
  const mobileNavRef = React.useRef<HTMLDivElement>(null);
  const focusTimeoutRef = React.useRef<number | null>(null);

  const sectionRefs = React.useRef<Record<SectionId, HTMLElement | null>>({
    overview: null,
    experience: null,
    skills: null,
    projects: null,
    timeline: null,
    connect: null,
  });
  const headingRefs = React.useRef<Record<SectionId, HTMLHeadingElement | null>>({
    overview: null,
    experience: null,
    skills: null,
    projects: null,
    timeline: null,
    connect: null,
  });

  const closeMobileNav = React.useCallback(() => {
    setMobileNavOpen(false);
    window.requestAnimationFrame(() => {
      navToggleRef.current?.focus();
    });
  }, []);

  React.useEffect(() => {
    return () => {
      if (focusTimeoutRef.current) {
        window.clearTimeout(focusTimeoutRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) =>
            SECTION_ORDER.indexOf((a.target as HTMLElement).dataset.sectionId as SectionId) -
            SECTION_ORDER.indexOf((b.target as HTMLElement).dataset.sectionId as SectionId),
          );

        if (visible.length > 0) {
          const nextId = (visible[0].target as HTMLElement).dataset.sectionId as SectionId;
          setActiveId((prev) => (prev === nextId ? prev : nextId));
          return;
        }

        const nearest = entries
          .slice()
          .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0];

        if (nearest) {
          const nextId = (nearest.target as HTMLElement).dataset.sectionId as SectionId;
          setActiveId((prev) => (prev === nextId ? prev : nextId));
        }
      },
      {
        rootMargin: '-45% 0px -45%',
        threshold: [0.2, 0.4, 0.6],
      },
    );

    const observedElements: HTMLElement[] = [];
    const raf = window.requestAnimationFrame(() => {
      SECTION_DEFINITIONS.forEach((section) => {
        const element = sectionRefs.current[section.id];
        if (element && !observedElements.includes(element)) {
          observer.observe(element);
          observedElements.push(element);
        }
      });
    });

    return () => {
      window.cancelAnimationFrame(raf);
      observedElements.forEach((element) => observer.unobserve(element));
      observer.disconnect();
    };
  }, []);

  React.useEffect(() => {
    const index = SECTION_ORDER.indexOf(activeId);
    if (index !== -1) {
      setFocusIndex(index);
    }
  }, [activeId]);

  React.useEffect(() => {
    if (!mobileNavOpen) {
      return undefined;
    }

    const activeButton = mobileNavRef.current?.querySelector<HTMLButtonElement>('button[aria-current]');
    const fallbackButton = mobileNavRef.current?.querySelector<HTMLButtonElement>('button[data-section-target]');
    const buttonToFocus = activeButton || fallbackButton;
    if (buttonToFocus) {
      buttonToFocus.focus();
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!mobileNavRef.current || mobileNavRef.current.contains(event.target as Node)) {
        return;
      }
      closeMobileNav();
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [mobileNavOpen, closeMobileNav]);

  const handleSelect = React.useCallback(
    (id: SectionId) => {
      const element = sectionRefs.current[id];
      if (!element) {
        return;
      }

      const prefersReducedMotion =
        typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      element.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      setActiveId(id);
      setFocusIndex(SECTION_ORDER.indexOf(id));

      if (focusTimeoutRef.current) {
        window.clearTimeout(focusTimeoutRef.current);
      }

      const focusHeading = () => {
        const heading = headingRefs.current[id];
        if (heading) {
          heading.focus({ preventScroll: true });
        }
      };

      if (prefersReducedMotion) {
        focusHeading();
      } else {
        focusTimeoutRef.current = window.setTimeout(focusHeading, 300);
      }

      if (mobileNavOpen) {
        closeMobileNav();
      }
    },
    [mobileNavOpen, closeMobileNav],
  );

  const handleNavKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>, context: 'desktop' | 'mobile') => {
      const buttons = Array.from(
        event.currentTarget.querySelectorAll<HTMLButtonElement>('button[data-section-target]'),
      );
      if (buttons.length === 0) {
        return;
      }

      const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
      let nextIndex = currentIndex;

      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          event.preventDefault();
          nextIndex = (currentIndex + 1) % buttons.length;
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          event.preventDefault();
          nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
          break;
        case 'Home':
          event.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          event.preventDefault();
          nextIndex = buttons.length - 1;
          break;
        case 'Escape':
          if (context === 'mobile') {
            event.preventDefault();
            closeMobileNav();
          }
          return;
        default:
          return;
      }

      setFocusIndex(nextIndex);
      buttons[nextIndex].focus();
    },
    [closeMobileNav],
  );

  const renderNavList = (id?: string, context: 'desktop' | 'mobile' = 'desktop') => (
    <div onKeyDown={(event) => handleNavKeyDown(event, context)}>
      <ul id={id} role="list" className="flex flex-col gap-1">
        {SECTION_DEFINITIONS.map((section, index) => {
          const isActive = activeId === section.id;
          return (
            <li key={section.id}>
              <button
                type="button"
                data-section-target={section.id}
                aria-controls={section.id}
                aria-current={isActive ? 'location' : undefined}
                onClick={() => handleSelect(section.id)}
                tabIndex={focusIndex === index ? 0 : -1}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue ${
                  isActive ? 'bg-ub-gedit-light text-gray-900 font-semibold' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <span className="block font-medium">{section.label}</span>
                <span className="mt-0.5 block text-xs text-gray-300">{section.summary}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <main className="min-h-screen bg-ub-cool-grey text-white">
      <Head>
        <title>About Alex</title>
        <meta
          name="description"
          content="Explore Alex Unnippillil’s background, experience, skills, and featured projects with a keyboard-friendly sticky navigation."
        />
      </Head>
      <a href="#overview" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-black">
        Skip to main content
      </a>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 md:flex-row md:gap-12 md:py-16">
        <aside className="hidden w-72 shrink-0 md:block">
          <nav aria-label="Page sections" className="sticky top-24 space-y-3">
            <div className="flex items-center gap-3 rounded-md bg-white/10 p-3">
              <Image
                src="/images/logos/bitmoji.png"
                alt="Illustration of Alex Unnippillil"
                width={56}
                height={56}
                className="rounded-full border border-white/30"
                sizes="56px"
                priority
              />
              <div>
                <p className="text-sm text-gray-300">Alex Unnippillil</p>
                <p className="text-base font-semibold text-white">Cybersecurity Specialist</p>
              </div>
            </div>
            {renderNavList(undefined, 'desktop')}
          </nav>
        </aside>
        <div className="flex-1 md:max-w-2xl">
          <header className="mb-6 md:mb-10">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">About Alex Unnippillil</h1>
            <p className="mt-3 max-w-2xl text-base text-gray-200 md:text-lg">
              Dive into the journey of a cybersecurity specialist who blends hands-on lab work, offensive tooling simulations,
              and community education into an accessible desktop-style portfolio experience.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 md:hidden">
              <button
                ref={navToggleRef}
                type="button"
                onClick={() => setMobileNavOpen((open) => !open)}
                aria-expanded={mobileNavOpen}
                aria-controls="about-alex-nav"
                className="rounded-md bg-ubt-blue px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {mobileNavOpen ? 'Hide sections' : 'Show sections'}
              </button>
            </div>
            {mobileNavOpen && (
              <div
                ref={mobileNavRef}
                className="mt-4 rounded-md bg-white/10 p-4 shadow-lg md:hidden"
                id="about-alex-nav"
                role="dialog"
                aria-modal="true"
                aria-label="Page sections"
              >
                {renderNavList('about-alex-nav-list', 'mobile')}
              </div>
            )}
          </header>
          <article className="space-y-16">
            {SECTION_DEFINITIONS.map((section) => (
              <section
                key={section.id}
                id={section.id}
                ref={(element) => {
                  sectionRefs.current[section.id] = element;
                }}
                data-section-id={section.id}
                aria-labelledby={`${section.id}-heading`}
                className="scroll-mt-32 rounded-lg bg-white/5 p-6 shadow-lg ring-1 ring-white/10"
              >
                <header>
                  <h2
                    id={`${section.id}-heading`}
                    ref={(element) => {
                      headingRefs.current[section.id] = element;
                    }}
                    tabIndex={-1}
                    className="text-2xl font-semibold text-white"
                  >
                    {section.title}
                  </h2>
                  <p className="mt-2 text-sm text-gray-300 md:text-base">{section.summary}</p>
                </header>
                {renderSectionContent(section.id)}
              </section>
            ))}
          </article>
        </div>
      </div>
    </main>
  );
};

const renderSectionContent = (id: SectionId) => {
  switch (id) {
    case 'overview':
      return (
        <div className="mt-6 space-y-4 text-base leading-relaxed text-gray-100 md:text-lg">
          <p>
            Alex Unnippillil is a lifelong learner who pivoted from a Nuclear Engineering degree to specialize in Networking and
            Information Technology Security. That career change sparked a deep curiosity for how offensive tooling works under the
            hood and how to translate that knowledge into safe, educational simulations.
          </p>
          <p>
            When Alex is not reverse-engineering techniques or coaching newcomers, you will often find him experimenting with
            automation projects, rock climbing, or curating playlists and anime recommendations for friends. Collaboration and
            teaching are recurring threads in every project showcased across this portfolio.
          </p>
        </div>
      );
    case 'experience':
      return (
        <div className="mt-6">
          <ul className="space-y-4" role="list">
            {resumeData.experience.map((item) => (
              <li key={`${item.date}-${item.description}`} className="rounded-md bg-white/5 p-4">
                <div className="text-sm font-semibold uppercase tracking-wide text-ubt-blue">{item.date}</div>
                <p className="mt-2 text-sm text-gray-100 md:text-base">{item.description}</p>
                {item.tags.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2 text-xs text-gray-300">
                    {item.tags.map((tag) => (
                      <li key={tag} className="rounded-full bg-white/10 px-2 py-1">
                        #{tag}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      );
    case 'skills':
      return (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {skillGroups.map((group) => (
            <section key={group.title} aria-label={group.title} className="rounded-md bg-white/5 p-4">
              <h3 className="text-lg font-semibold text-white">{group.title}</h3>
              <ul className="mt-3 flex flex-wrap gap-2" role="list">
                {group.badges.map((badge) => (
                  <li key={badge.alt} className="flex items-center gap-2 rounded-full bg-black/30 px-2 py-1 text-xs text-gray-100">
                    <img
                      src={badge.src}
                      alt={badge.alt}
                      title={badge.description}
                      className="h-6 w-auto rounded"
                    />
                    <span className="hidden sm:inline">{badge.description}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      );
    case 'projects':
      return (
        <div className="mt-6 space-y-5">
          {featuredProjects.map((project) => (
            <article key={project.name} className="rounded-md bg-white/5 p-4 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
                <h3 className="text-lg font-semibold text-white">
                  <a href={project.link} target="_blank" rel="noopener noreferrer" className="underline decoration-ubt-blue">
                    {project.name}
                  </a>
                </h3>
                <span className="text-xs uppercase tracking-wide text-gray-300">{project.date}</span>
              </div>
              <ul className="mt-2 space-y-2 text-sm text-gray-200" role="list">
                {project.description.map((line) => (
                  <li key={line} className="leading-snug">
                    {line}
                  </li>
                ))}
              </ul>
              {project.domains.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2 text-xs text-gray-300">
                  {project.domains.map((domain) => (
                    <li key={domain} className="rounded-full bg-black/40 px-2 py-1">
                      #{domain}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      );
    case 'timeline':
      return (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-gray-200 md:text-base">
            Switch between year and month views to explore Alex’s milestones. Use the arrow keys to move between cards and Enter
            to drill into a year for more detail.
          </p>
          <div className="rounded-md bg-white/5 p-4">
            <ScrollableTimeline />
          </div>
        </div>
      );
    case 'connect':
      return (
        <div className="mt-6 space-y-4 text-sm text-gray-200 md:text-base">
          <p>
            Reach out directly at{' '}
            <a href="mailto:alex.unnippillil@hotmail.com" className="font-semibold text-ubt-blue underline">
              alex.unnippillil@hotmail.com
            </a>{' '}
            for collaboration opportunities, lab walkthroughs, or speaking engagements.
          </p>
          <p>
            Prefer to browse first? Explore curated learning playlists on{' '}
            <a
              href="https://www.youtube.com/@Alex-Unnippillil/playlists"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-ubt-blue underline"
            >
              YouTube
            </a>{' '}
            or check out detailed anime recommendations via{' '}
            <a
              href="https://myanimelist.net/animelist/alex_u"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-ubt-blue underline"
            >
              MyAnimeList
            </a>
            .
          </p>
          <p>
            You can also install the desktop portfolio as a Progressive Web App and pin favorite simulations or utilities for
            quick access. The About page remembers your last section, ensuring you can resume where you left off.
          </p>
        </div>
      );
    default:
      return null;
  }
};

export default AboutAlexPage;
