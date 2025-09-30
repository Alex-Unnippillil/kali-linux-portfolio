import React, { useEffect, useState } from 'react';

interface Step {
  time: string;
  title: string;
  link: string;
  description: string;
}

const steps: Step[] = [
  {
    time: '08:00',
    title: 'Reconnaissance',
    link: 'https://www.kali.org/tools/nmap/',
    description: 'Discover and map targets.'
  },
  {
    time: '10:15',
    title: 'Exploitation',
    link: 'https://docs.rapid7.com/metasploit/',
    description: 'Leverage vulnerabilities with Metasploit.'
  },
  {
    time: '13:45',
    title: 'Post-Exploitation',
    link: 'https://docs.rapid7.com/metasploit/about-post-exploitation/',
    description: 'Gather data and maintain access ethically.'
  }
];

const SMALL_BREAKPOINT = '(max-width: 640px)';

const useIsSmallScreen = () => {
  const [isSmall, setIsSmall] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(SMALL_BREAKPOINT).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(SMALL_BREAKPOINT);
    const handler = (event: MediaQueryListEvent) => setIsSmall(event.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      mediaQuery.addListener(handler);
    }

    setIsSmall(mediaQuery.matches);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, []);

  return isSmall;
};

const WorkflowCard: React.FC = () => {
  const isSmall = useIsSmallScreen();

  return (
    <section className="p-4 rounded bg-ub-grey text-white">
      <h2 className="text-xl font-bold mb-2">Workflow</h2>
      <ul className={`relative flex flex-col gap-6 pt-2 ${isSmall ? '' : 'md:gap-8'}`} aria-label="Workflow timeline">
        {steps.map((s, index) => (
          <li
            key={s.title}
            className={`relative grid gap-4 grid-cols-[4.5rem,1fr] ${!isSmall ? 'md:grid-cols-[5.5rem,1fr]' : ''}`}
          >
            <time className="text-xs font-mono uppercase tracking-wider text-ubt-blue text-right self-start">
              {s.time}
            </time>
            <div className={`relative pl-6 ${index !== steps.length - 1 ? 'pb-6' : ''}`}>
              <span
                className="absolute left-0 top-1.5 h-3 w-3 rounded-full border-2 border-ub-grey bg-ub-orange shadow-sm"
                aria-hidden="true"
              />
              {index !== steps.length - 1 && (
                <span
                  className="absolute left-1.5 top-4 bottom-0 w-px bg-slate-500"
                  aria-hidden="true"
                />
              )}
              <a
                href={s.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ub-orange underline font-semibold"
              >
                {s.title}
              </a>
              <p className="text-sm leading-relaxed text-slate-200">{s.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default WorkflowCard;

