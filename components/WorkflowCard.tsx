import React from 'react';

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
  <section className="p-lg rounded-lg bg-surface-panel text-text-primary shadow-md space-y-sm">
    <h2 className="text-xl font-bold">Workflow</h2>
    <ul className="space-y-sm">
      {steps.map((s) => (
        <li key={s.title} className="space-y-1">
          <a
            href={s.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-highlight underline hover:text-brand-secondary transition-colors duration-fast"
          >
            {s.title}
          </a>
          <p className="text-sm text-text-muted">{s.description}</p>
        </li>
      ))}
    </ul>
  </section>
);

export default WorkflowCard;

