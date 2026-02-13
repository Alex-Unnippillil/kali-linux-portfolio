import React from 'react';

interface Step {
  title: string;
  link: string;
  description: string;
}

interface WorkflowCardProps {
  steps?: Step[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyCtaLabel?: string;
  emptyCtaHref?: string;
}

const defaultSteps: Step[] = [
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

const WorkflowCard: React.FC<WorkflowCardProps> = ({
  steps = defaultSteps,
  isLoading = false,
  emptyMessage = 'No workflow steps are available right now.',
  emptyCtaLabel = 'Browse sample workflows',
  emptyCtaHref = 'https://www.kali.org/docs/'
}) => {
  const hasSteps = steps.length > 0;
  const placeholderCount = Math.max(steps.length || 0, defaultSteps.length);

  return (
    <section className="p-4 rounded bg-ub-grey text-white">
      <h2 className="text-xl font-bold mb-2">Workflow</h2>
      <ul className="space-y-3" aria-live="polite">
        {isLoading &&
          Array.from({ length: placeholderCount }).map((_, index) => (
            <li
              key={`workflow-skeleton-${index}`}
              className="rounded border border-white/10 p-3"
              data-testid="workflow-skeleton"
              aria-busy="true"
            >
              <div className="h-4 w-32 animate-pulse rounded bg-white/30" />
              <div className="mt-3 h-3 w-full animate-pulse rounded bg-white/10" />
            </li>
          ))}

        {!isLoading && hasSteps &&
          steps.map((step) => (
            <li key={step.title} className="rounded border border-white/10 p-3">
              <a
                href={step.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ub-orange underline"
              >
                {step.title}
              </a>
              <p className="mt-2 text-sm text-white/80">{step.description}</p>
            </li>
          ))}

        {!isLoading && !hasSteps && (
          <li className="rounded border border-dashed border-white/20 p-6 text-center">
            <p className="text-base font-medium text-white/80">{emptyMessage}</p>
            <a
              href={emptyCtaHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center justify-center rounded bg-ub-orange px-4 py-2 text-sm font-semibold text-black transition hover:bg-ub-orange/90"
            >
              {emptyCtaLabel}
            </a>
          </li>
        )}
      </ul>
    </section>
  );
};

export default WorkflowCard;

