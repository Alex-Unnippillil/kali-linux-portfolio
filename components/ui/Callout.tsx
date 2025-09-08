import React from 'react';

interface CalloutProps {
  variant: 'defaultCredentials' | 'readDocs' | 'verifyDownload' | 'mirrorInfo';
  children: React.ReactNode;
}

const KeyIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M15.75 5.25C17.4069 5.25 18.75 6.59315 18.75 8.25M21.75 8.25C21.75 11.5637 19.0637 14.25 15.75 14.25C15.3993 14.25 15.0555 14.2199 14.7213 14.1622C14.1583 14.0649 13.562 14.188 13.158 14.592L10.5 17.25H8.25V19.5H6V21.75H2.25V18.932C2.25 18.3352 2.48705 17.7629 2.90901 17.341L9.408 10.842C9.81202 10.438 9.93512 9.84172 9.83785 9.2787C9.7801 8.94446 9.75 8.60074 9.75 8.25C9.75 4.93629 12.4363 2.25 15.75 2.25C19.0637 2.25 21.75 4.93629 21.75 8.25Z"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const BookOpenIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M12 6.04168C10.4077 4.61656 8.30506 3.75 6 3.75C4.94809 3.75 3.93834 3.93046 3 4.26212V18.5121C3.93834 18.1805 4.94809 18 6 18C8.30506 18 10.4077 18.8666 12 20.2917M12 6.04168C13.5923 4.61656 15.6949 3.75 18 3.75C19.0519 3.75 20.0617 3.93046 21 4.26212V18.5121C20.0617 18.1805 19.0519 18 18 18C15.6949 18 13.5923 18.8666 12 20.2917M12 6.04168V20.2917"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ShieldCheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M12 3L3 5.25v6.75c0 5.523 3.807 10.74 9 12 5.193-1.26 9-6.477 9-12V5.25L12 3z"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 12l2 2 4-4"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const InfoIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M12 9.75h.008v.008H12V9.75Zm0 2.25v3.75m9-3.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const variants = {
  defaultCredentials: {
    icon: KeyIcon,
    border: 'border-yellow-400',
    label: 'Default credentials',
  },
  readDocs: {
    icon: BookOpenIcon,
    border: 'border-blue-400',
    label: 'Read the docs',
  },
  verifyDownload: {
    icon: ShieldCheckIcon,
    border: 'border-green-400',
    label: 'Verify downloads',
  },
  mirrorInfo: {
    icon: InfoIcon,
    border: 'border-blue-400',
    label: 'Mirror info',
  },
};

export default function Callout({ variant, children }: CalloutProps) {
  const V = variants[variant];
  const Icon = V.icon;
  return (
    <div className={`flex items-start space-x-3 border-l-4 p-4 ${V.border}`}>
      <Icon className="w-5 h-5 mt-1" aria-hidden="true" />
      <div>
        <h3 className="font-semibold">{V.label}</h3>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

