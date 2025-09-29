import React from 'react';

interface ResourceLink {
  href: string;
  label: string;
  i18nKey?: string;
}

export interface SimulationNoticeMessages {
  title: string;
  description: string;
  sandbox: string;
  resourcesHeading: string;
  resources: ResourceLink[];
}

export const defaultSimulationNoticeMessages: SimulationNoticeMessages = {
  title: 'Training Simulation',
  description:
    'This interface reproduces security tooling for learning and awareness. It does not execute actions against real systems.',
  sandbox: 'All scenarios use sandboxed, fictitious data and remain isolated from your environment.',
  resourcesHeading: 'Learn about responsible security research',
  resources: [
    {
      href: 'https://www.kali.org/docs/policy/training-labs/',
      label: 'Kali Linux: responsible use of training labs',
      i18nKey: 'resourceGuidelines',
    },
    {
      href: 'https://owasp.org/www-community/Vulnerability_Disclosure',
      label: 'OWASP: vulnerability disclosure best practices',
      i18nKey: 'resourceDisclosure',
    },
  ],
};

interface SimulationNoticeProps {
  messages?: Partial<SimulationNoticeMessages> & {
    resources?: ResourceLink[];
  };
  baseI18nKey?: string;
  className?: string;
}

const SimulationNotice: React.FC<SimulationNoticeProps> = ({
  messages,
  baseI18nKey = 'simulationNotice',
  className = '',
}) => {
  const merged: SimulationNoticeMessages = {
    ...defaultSimulationNoticeMessages,
    ...messages,
    resources: messages?.resources ?? defaultSimulationNoticeMessages.resources,
  };

  const titleId = `${baseI18nKey}-title`;
  const descriptionId = `${baseI18nKey}-description`;

  return (
    <section
      className={`rounded-md border-l-4 border-yellow-500 bg-yellow-50 p-4 text-sm text-gray-900 shadow-sm dark:border-yellow-400 dark:bg-yellow-900/30 dark:text-yellow-50 ${className}`}
      role="note"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      data-i18n-key={`${baseI18nKey}.container`}
    >
      <h2
        id={titleId}
        className="text-base font-semibold"
        data-i18n-key={`${baseI18nKey}.title`}
      >
        {merged.title}
      </h2>
      <p
        id={descriptionId}
        className="mt-1"
        data-i18n-key={`${baseI18nKey}.description`}
      >
        {merged.description}
      </p>
      <p className="mt-1" data-i18n-key={`${baseI18nKey}.sandbox`}>
        {merged.sandbox}
      </p>
      <p
        className="mt-3 font-medium"
        data-i18n-key={`${baseI18nKey}.resourcesHeading`}
      >
        {merged.resourcesHeading}
      </p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {merged.resources.map((resource, index) => (
          <li key={resource.href}>
            <a
              href={resource.href}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-yellow-700 focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-500 dark:hover:text-yellow-200"
              data-i18n-key={`${baseI18nKey}.resources.${resource.i18nKey ?? index}`}
            >
              {resource.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default SimulationNotice;
