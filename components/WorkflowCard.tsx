import React from 'react';
import { computeRelAttribute, LINK_UNAVAILABLE_COPY, sanitizeUrl } from '../utils/urlPolicy';

interface Step {
  title: string;
  link: string;
  description: string;
}

const steps: Step[] = [
  {
    title: 'Reconnaissance',
    link: 'https://www.kali.org/tools/nmap/',
    description: 'Discover and map targets.'
  },
  {
    title: 'Exploitation',
    link: 'https://docs.rapid7.com/metasploit/',
    description: 'Leverage vulnerabilities with Metasploit.'
  },
  {
    title: 'Post-Exploitation',
    link: 'https://docs.rapid7.com/metasploit/about-post-exploitation/',
    description: 'Gather data and maintain access ethically.'
  }
];

const WorkflowCard: React.FC = () => (
  <section className="p-4 rounded bg-ub-grey text-white">
    <h2 className="text-xl font-bold mb-2">Workflow</h2>
    <ul>
      {steps.map((s) => (
        <li key={s.title} className="mb-2">
          {(() => {
            const safeLink = sanitizeUrl(s.link);
            if (!safeLink) {
              return (
                <span className="italic text-ubt-grey">
                  {s.title} ({LINK_UNAVAILABLE_COPY})
                </span>
              );
            }
            return (
              <a
                href={safeLink.href}
                target="_blank"
                rel={computeRelAttribute(safeLink.isExternal)}
                className="text-ub-orange underline"
              >
                {s.title}
              </a>
            );
          })()}
          <p className="text-sm">{s.description}</p>
        </li>
      ))}
    </ul>
  </section>
);

export default WorkflowCard;

