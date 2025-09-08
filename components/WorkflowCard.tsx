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
  <section className="surface-200 p-4 rounded text-text">
    <h2 className="text-xl font-bold mb-2">Workflow</h2>
    <ul>
      {steps.map((s) => (
        <li key={s.title} className="mb-2">
          <a
            href={s.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ub-orange underline"
          >
            {s.title}
          </a>
          <p className="text-sm">{s.description}</p>
        </li>
      ))}
    </ul>
  </section>
);

export default WorkflowCard;

