import React from 'react';
import Image from 'next/image';
import Head from 'next/head';
import clsx from 'clsx';
import ReactGA from 'react-ga4';

import Certs from '../certs';
import data from '../alex/data.json';
import SafetyNote from './SafetyNote';
import { getCspNonce } from '../../../utils/csp';
import AboutSlides from './slides';
import ScrollableTimeline from '../../ScrollableTimeline';
import GitHubContributionHeatmap from './GitHubContributionHeatmap';
import GitHubStars from '../../GitHubStars';
import SectionPanel from '../alex/SectionPanel';
import HeroHeader from './HeroHeader';

const sections = data.sections;

type SectionId = (typeof sections)[number]['id'];

const heroChips = [
  { label: 'Cybersecurity Specialist', icon: '🛡️' },
  { label: 'Network Defender', icon: '🌐' },
  { label: 'Lifelong Learner', icon: '📚' },
];

const navButtonClasses = (isActive: boolean) =>
  clsx(
    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus',
    isActive
      ? 'bg-gradient-to-r from-ub-gedit-light to-ubt-gedit-blue text-white shadow-lg shadow-black/40'
      : 'text-slate-200/80 hover:bg-white/5 hover:text-white',
  );

const AboutApp: React.FC = () => {
  const [activeScreen, setActiveScreen] = React.useState<SectionId>('about');
  const [navbarOpen, setNavbarOpen] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('about-section') as SectionId | null;
    if (stored && sections.some((section) => section.id === stored)) {
      setActiveScreen(stored);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('about-section', activeScreen);
    }
    ReactGA.send({ hitType: 'pageview', page: `/${activeScreen}`, title: `About - ${activeScreen}` });
  }, [activeScreen]);

  const handleActivate = React.useCallback((id: SectionId) => {
    setActiveScreen(id);
    setNavbarOpen(false);
  }, []);

  const handleNavKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'));
    let index = tabs.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      index = (index + 1) % tabs.length;
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      index = (index - 1 + tabs.length) % tabs.length;
    } else {
      return;
    }
    tabs.forEach((tab, i) => {
      tab.tabIndex = i === index ? 0 : -1;
    });
    tabs[index].focus();
  };

  const renderScreen = React.useMemo(() => {
    switch (activeScreen) {
      case 'about':
        return <Biography />;
      case 'education':
        return <Education />;
      case 'skills':
        return <Skills skills={data.skills} />;
      case 'certs':
        return <Certs />;
      case 'projects':
        return <Projects projects={data.projects} />;
      case 'resume':
        return <Resume />;
      default:
        return <Biography />;
    }
  }, [activeScreen]);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Alex Unnippillil',
    url: 'https://unnippillil.com',
  };
  const nonce = getCspNonce();

  return (
    <main className="relative flex h-full w-full select-none bg-ub-cool-grey text-white">
      <Head>
        <title>About</title>
        <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </Head>
      <aside
        className="hidden h-full w-1/4 min-w-[12rem] flex-col border-r border-black bg-kali-panel-dark/40 px-2 py-4 md:flex"
        role="tablist"
        aria-orientation="vertical"
        onKeyDown={handleNavKeyDown}
      >
        {sections.map((section) => {
          const isActive = activeScreen === section.id;
          return (
            <button
              key={section.id}
              id={section.id}
              role="tab"
              type="button"
              tabIndex={isActive ? 0 : -1}
              aria-selected={isActive}
              onClick={() => handleActivate(section.id)}
              className={navButtonClasses(isActive)}
            >
              <Image
                className="h-5 w-5 rounded border border-gray-600"
                alt={section.alt}
                src={section.icon}
                width={20}
                height={20}
                sizes="20px"
              />
              <span className="truncate text-left">{section.label}</span>
            </button>
          );
        })}
      </aside>
      <button
        type="button"
        onClick={() => setNavbarOpen((open) => !open)}
        className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-kali-panel-dark/70 text-white shadow-md shadow-black/40 transition hover:bg-kali-panel-dark md:hidden"
        aria-label="Toggle navigation"
        aria-expanded={navbarOpen}
      >
        <span className="block h-0.5 w-4 bg-current" />
        <span className="sr-only">Menu</span>
      </button>
      {navbarOpen && (
        <div
          className="absolute left-2 top-12 z-30 flex w-48 flex-col gap-2 rounded-xl border border-kali-border/40 bg-kali-panel-dark/95 p-3 shadow-xl shadow-black/60 md:hidden"
          role="tablist"
          aria-orientation="vertical"
          onKeyDown={handleNavKeyDown}
        >
          {sections.map((section) => {
            const isActive = activeScreen === section.id;
            return (
              <button
                key={section.id}
                id={`${section.id}-mobile`}
                type="button"
                role="tab"
                tabIndex={isActive ? 0 : -1}
                aria-selected={isActive}
                onClick={() => handleActivate(section.id)}
                className={navButtonClasses(isActive)}
              >
                <Image
                  className="h-5 w-5 rounded border border-gray-600"
                  alt={section.alt}
                  src={section.icon}
                  width={20}
                  height={20}
                  sizes="20px"
                />
                <span className="truncate text-left">{section.label}</span>
              </button>
            );
          })}
        </div>
      )}
      <section className="flex h-full w-full flex-col items-center overflow-y-auto bg-ub-grey px-3 py-6 md:w-3/4 md:px-6">
        <div className="flex w-full max-w-5xl flex-col gap-6 pb-10">{renderScreen}</div>
      </section>
      <AboutSlides />
    </main>
  );
};

export default function AboutAppWrapper() {
  return <AboutApp />;
}

export { default as SafetyNote } from './SafetyNote';

function Biography() {
  return (
    <div className="flex flex-col gap-6">
      <SectionPanel spacing="lg" className="items-center text-center">
        <HeroHeader
          name="Alex Unnippillil"
          title="Cybersecurity Specialist"
          subtitle="Technology enthusiast focused on resilient systems and human-first defenses."
          imageSrc="/images/logos/bitmoji.png"
          imageAlt="Alex Unnippillil logo"
          chips={heroChips}
        />
      </SectionPanel>
      <SectionPanel title="Background" subtitle="Curiosity, community, and continuous learning" spacing="md">
        <ul className="kali-body space-y-3 text-left">
          <li className="flex gap-2">
            <span aria-hidden="true">💻</span>
            <span>
              I&apos;m a <strong className="text-white">Technology Enthusiast</strong> dedicated to learning and mastering the rapidly evolving world of tech. I completed four years of a{' '}
              <a className="kali-link" href="https://shared.ontariotechu.ca/shared/faculty/fesns/documents/FESNS%20Program%20Maps/2018_nuclear_engineering_map_2017_entry.pdf" target="_blank" rel="noopener noreferrer">
                Nuclear Engineering
              </a>{' '}
              degree at Ontario Tech University before redirecting my career toward{' '}
              <a className="kali-link" href="https://businessandit.ontariotechu.ca/undergraduate/bachelor-of-information-technology/networking-and-information-technology-security/networking-and-i.t-security-bit-2023-2024_.pdf" target="_blank" rel="noopener noreferrer">
                Networking and I.T. Security
              </a>
              .
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true">🤝</span>
            <span>
              I love teaming up with people who care about collaboration and mentorship. If that resonates with you, reach out at{' '}
              <a className="kali-link" href="mailto:alex.unnippillil@hotmail.com">alex.unnippillil@hotmail.com</a>.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true">🧠</span>
            <span>
              Away from the keyboard you&apos;ll find me reading, rock climbing, or diving into{' '}
              <a className="kali-link" href="https://www.youtube.com/@Alex-Unnippillil/playlists" target="_blank" rel="noopener noreferrer">
                YouTube rabbit holes
              </a>{' '}
              and{' '}
              <a className="kali-link" href="https://myanimelist.net/animelist/alex_u" target="_blank" rel="noopener noreferrer">
                anime storytelling
              </a>
              .
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true">⭐</span>
            <span>
              I&apos;m fascinated by deep learning, software craftsmanship, and animation—fields that constantly challenge me to adapt and grow.
            </span>
          </li>
        </ul>
        <SafetyNote />
      </SectionPanel>
      <SectionPanel title="Worker App Availability" subtitle="Simulated tooling keeps things safe and educational" spacing="md">
        <WorkerStatus />
      </SectionPanel>
      <SectionPanel title="Career Timeline" subtitle="Milestones that shaped my security journey" spacing="md">
        <Timeline />
      </SectionPanel>
    </div>
  );
}

const workerApps = [
  { id: 'hydra', label: 'Hydra' },
  { id: 'john', label: 'John the Ripper' },
  { id: 'metasploit', label: 'Metasploit' },
  { id: 'mimikatz', label: 'Mimikatz' },
  { id: 'radare2', label: 'Radare2' },
];

function WorkerStatus() {
  const [status, setStatus] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    workerApps.forEach((app) => {
      fetch(`/api/${app.id}`, { method: 'HEAD' })
        .then((res) => {
          setStatus((prev) => ({ ...prev, [app.id]: res.status < 500 ? 'Online' : 'Offline' }));
        })
        .catch(() => {
          setStatus((prev) => ({ ...prev, [app.id]: 'Offline' }));
        });
    });
  }, []);

  return (
    <ul role="list" className="grid gap-3 sm:grid-cols-2">
      {workerApps.map((app) => {
        const state = status[app.id] || 'Checking...';
        const isOnline = state === 'Online';
        return (
          <li key={app.id} className="flex items-center justify-between rounded-xl border border-kali-border/40 bg-kali-panel-dark/60 px-3 py-2">
            <span className="kali-body font-semibold text-white">{app.label}</span>
            <span
              className={clsx('kali-chip px-3 py-1 normal-case', {
                'bg-emerald-500/20 text-emerald-300': isOnline,
                'bg-amber-500/20 text-amber-200': state === 'Checking...',
                'bg-rose-500/20 text-rose-200': !isOnline && state !== 'Checking...',
              })}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: isOnline ? '#34d399' : state === 'Checking...' ? '#fbbf24' : '#f87171' }} aria-hidden="true" />
              {state}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Timeline() {
  return (
    <div className="space-y-4">
      <ScrollableTimeline />
      <div className="no-print flex justify-end">
        <a href="/assets/timeline.pdf" download className="kali-cta">
          <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v14m0 0 4-4m-4 4-4-4M5 21h14" />
          </svg>
          Download timeline
        </a>
      </div>
    </div>
  );
}

function Education() {
  const educationHistory = [
    {
      school: 'Ontario Tech University',
      years: '2020 - 2024',
      program: 'Networking and Information Technology Security',
    },
    {
      school: 'Ontario Tech University',
      years: '2012 - 2016',
      program: 'Nuclear Engineering',
    },
    {
      school: 'St. John Paul II Catholic Secondary School',
      years: '2008 - 2012',
      program: 'Ontario Secondary School Diploma',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <SectionPanel title="Education" subtitle="Formal training that underpins my practice" spacing="lg">
        <ol className="flex flex-col gap-5">
          {educationHistory.map((entry) => (
            <li key={entry.school} className="rounded-2xl border border-kali-border/40 bg-kali-panel-dark/60 p-4 shadow-inner shadow-black/20">
              <h3 className="kali-heading-md">{entry.school}</h3>
              <p className="kali-body-muted">{entry.years}</p>
              <p className="kali-body text-slate-100">{entry.program}</p>
            </li>
          ))}
        </ol>
      </SectionPanel>
    </div>
  );
}

type SkillGroup = {
  title: string;
  items: { src: string; alt: string; description: string }[];
};

type SkillsProps = {
  skills: {
    networkingSecurity: SkillGroup['items'];
    softwaresOperating: SkillGroup['items'];
    languagesTools: SkillGroup['items'];
    frameworksLibraries: SkillGroup['items'];
  };
};

function Skills({ skills }: SkillsProps) {
  const groups: SkillGroup[] = [
    { title: 'Networking & Security', items: skills.networkingSecurity },
    { title: 'Softwares & Operating Systems', items: skills.softwaresOperating },
    { title: 'Languages & Tools', items: skills.languagesTools },
    { title: 'Frameworks & Libraries', items: skills.frameworksLibraries },
  ];
  const [filter, setFilter] = React.useState('');
  const [selected, setSelected] = React.useState<SkillGroup['items'][number] | null>(null);

  const handleSelect = (skill: SkillGroup['items'][number]) => {
    setSelected(skill);
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionPanel title="Explore the toolkit" subtitle="Filter to quickly find the stacks you&apos;re curious about" spacing="md">
        <label className="flex w-full items-center gap-3 rounded-xl border border-kali-border/40 bg-kali-panel-dark/60 px-4 py-3">
          <svg aria-hidden="true" className="h-4 w-4 text-ubt-blue" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
          </svg>
          <input
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Search skills"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
            aria-label="Search skills"
          />
        </label>
      </SectionPanel>
      <div className="grid gap-6 lg:grid-cols-2">
        {groups.map((group) => {
          const filteredItems = group.items.filter((item) => item.alt.toLowerCase().includes(filter.toLowerCase()));
          return (
            <SectionPanel key={group.title} title={group.title} spacing="md">
              <div className="flex flex-wrap gap-2">
                {filteredItems.map((item) => (
                  <SkillChip key={item.alt} skill={item} onSelect={handleSelect} isActive={selected?.alt === item.alt} />
                ))}
                {filteredItems.length === 0 && <p className="kali-body-muted">No results. Try another term.</p>}
              </div>
            </SectionPanel>
          );
        })}
      </div>
      {selected && (
        <SectionPanel title={selected.alt} subtitle="Skill snapshot" spacing="sm">
          <p className="kali-body">{selected.description}</p>
        </SectionPanel>
      )}
      <SectionPanel title="GitHub Contributions" subtitle="Recent activity and stars" spacing="md">
        <div className="flex flex-col items-center gap-4">
          <GitHubContributionHeatmap username="alex-unnippillil" year={2025} />
          <div className="kali-body-muted flex items-center gap-2 text-xs">
            <span className="font-semibold text-white">Portfolio repo stars:</span>
            <GitHubStars user="alex-unnippillil" repo="kali-linux-portfolio" />
          </div>
        </div>
      </SectionPanel>
    </div>
  );
}

type SkillChipProps = {
  skill: SkillGroup['items'][number];
  isActive: boolean;
  onSelect: (skill: SkillGroup['items'][number]) => void;
};

const SkillChip: React.FC<SkillChipProps> = ({ skill, onSelect, isActive }) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(skill)}
      className={clsx(
        'kali-chip cursor-pointer bg-gradient-to-r from-kali-panel-dark/80 via-kali-panel-dark/70 to-kali-panel-dark/60 px-3 py-1.5 text-[0.7rem] capitalize hover:from-ub-gedit-light/30 hover:to-ubt-gedit-blue/30',
        isActive && 'ring-2 ring-offset-2 ring-offset-kali-panel-dark ring-ubt-blue',
      )}
    >
      <span className="flex h-4 w-4 items-center justify-center overflow-hidden rounded-full bg-black/40">
        <img src={skill.src} alt="" loading="lazy" className="h-4 w-4 object-contain" />
      </span>
      {skill.alt}
    </button>
  );
};

type ProjectsProps = {
  projects: {
    name: string;
    date: string;
    link: string;
    description: string[];
    domains: string[];
  }[];
};

const domainPalette: Record<string, { bg: string; dot: string }> = {
  python: { bg: 'from-emerald-500/20 via-emerald-500/10 to-emerald-500/30', dot: '#34d399' },
  javascript: { bg: 'from-amber-400/20 via-amber-400/10 to-amber-400/30', dot: '#facc15' },
  html5: { bg: 'from-rose-500/20 via-rose-500/10 to-rose-500/30', dot: '#fb7185' },
  css: { bg: 'from-sky-500/20 via-sky-500/10 to-sky-500/30', dot: '#38bdf8' },
  'c++': { bg: 'from-indigo-500/20 via-indigo-500/10 to-indigo-500/30', dot: '#a5b4fc' },
  c: { bg: 'from-violet-500/20 via-violet-500/10 to-violet-500/30', dot: '#c4b5fd' },
  react: { bg: 'from-cyan-500/20 via-cyan-500/10 to-cyan-500/30', dot: '#5eead4' },
  tailwindcss: { bg: 'from-teal-500/20 via-teal-500/10 to-teal-500/30', dot: '#14b8a6' },
  'next.js': { bg: 'from-slate-500/20 via-slate-500/10 to-slate-500/30', dot: '#cbd5f5' },
};

function Projects({ projects }: ProjectsProps) {
  return (
    <div className="flex flex-col gap-6">
      <SectionPanel title="Projects" subtitle="Open-source and academic explorations" spacing="lg">
        <div className="flex flex-col gap-5">
          {projects.map((project) => {
            const projectNameFromLink = project.link.split('/');
            const projectName = projectNameFromLink[projectNameFromLink.length - 1];
            return (
              <article key={project.link} className="rounded-2xl border border-kali-border/40 bg-kali-panel-dark/60 p-5 shadow-inner shadow-black/20">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <a href={project.link} target="_blank" rel="noopener noreferrer" className="kali-link text-base sm:text-lg capitalize">
                      {project.name.toLowerCase()}
                    </a>
                    <GitHubStars user="alex-unnippillil" repo={projectName} />
                  </div>
                  <span className="kali-body-muted">{project.date}</span>
                </div>
                <ul className="kali-body-muted mt-3 space-y-2 pl-4">
                  {project.description.map((desc) => (
                    <li key={desc} className="list-disc text-slate-200">
                      {desc}
                    </li>
                  ))}
                </ul>
                {project.domains?.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {project.domains.map((domain) => (
                      <ProjectChip key={`${project.link}-${domain}`} domain={domain} href={project.link} />
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </SectionPanel>
    </div>
  );
}

type ProjectChipProps = {
  domain: string;
  href: string;
};

const ProjectChip: React.FC<ProjectChipProps> = ({ domain, href }) => {
  const palette = domainPalette[domain.toLowerCase()] ?? { bg: 'from-slate-500/10 via-slate-500/5 to-slate-500/20', dot: '#cbd5f5' };
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx('kali-chip cursor-pointer bg-gradient-to-r text-[0.68rem] lowercase hover:from-ub-gedit-light/30 hover:to-ubt-gedit-blue/30', palette.bg)}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: palette.dot }} aria-hidden="true" />
      {domain}
    </a>
  );
};

function Resume() {
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
      } catch (error) {
        console.error('Share failed', error);
      }
    } else {
      window.location.href = vcardUrl;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionPanel title="Resume" subtitle="Download, share, or explore right in the window" spacing="lg">
        <div className="no-print flex flex-wrap gap-3">
          <a href="/assets/Alex-Unnippillil-Resume.pdf" download onClick={handleDownload} className="kali-cta">
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v14m0 0 4-4m-4 4-4-4M5 21h14" />
            </svg>
            Download PDF
          </a>
          <a href="/assets/alex-unnippillil.vcf" download className="kali-cta">
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v16H4z" />
            </svg>
            Save vCard
          </a>
          <button type="button" onClick={shareContact} className="kali-cta">
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 8a3 3 0 1 0-6 0v8a3 3 0 1 0 6 0V8ZM8 12H5m14 0h-3" />
            </svg>
            Share contact
          </button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-kali-border/40 bg-kali-panel-dark/70 shadow-inner shadow-black/40">
          <object className="h-[60vh] w-full" data="/assets/Alex-Unnippillil-Resume.pdf" type="application/pdf">
            <p className="kali-body p-4 text-center">
              Unable to display PDF.&nbsp;
              <a href="/assets/Alex-Unnippillil-Resume.pdf" target="_blank" rel="noopener noreferrer" className="kali-link" onClick={handleDownload}>
                Download the resume
              </a>
            </p>
          </object>
        </div>
      </SectionPanel>
    </div>
  );
}
