import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';

interface Step {
  title: string;
  link: string;
  description: string;
}

const steps: Step[] = [
  {
    title: 'Reconnaissance',
    link: 'https://www.kali.org/tools/nmap/',
    description: 'Discover and map targets.',
  },
  {
    title: 'Exploitation',
    link: 'https://docs.rapid7.com/metasploit/',
    description: 'Leverage vulnerabilities with Metasploit.',
  },
  {
    title: 'Post-Exploitation',
    link: 'https://docs.rapid7.com/metasploit/about-post-exploitation/',
    description: 'Gather data and maintain access ethically.',
  },
];

const WorkflowCard: React.FC = () => (
  <Card className="bg-ub-grey/95 text-white" aria-labelledby="workflow-card-title">
    <CardHeader>
      <CardTitle id="workflow-card-title">Workflow</CardTitle>
      <CardDescription>
        Follow the high-level stages of an authorized security assessment with curated documentation links.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <ul className="space-y-3 text-sm" role="list">
        {steps.map((step) => (
          <li key={step.title} className="flex flex-col gap-1">
            <a
              href={step.link}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-ub-orange underline-offset-4 hover:underline"
            >
              {step.title}
            </a>
            <span className="text-white/80">{step.description}</span>
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);

export default WorkflowCard;

