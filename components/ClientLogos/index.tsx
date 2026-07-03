"use client";

import React from 'react';

interface Logo {
  src: string;
  alt: string;
}

interface LogoGroup {
  title: string;
  logos: Logo[];
}

const logoGroups: LogoGroup[] = [
  {
    title: 'Security',
    logos: [
      { src: '/images/client-logos/security.svg', alt: 'Security Corp' },
      { src: '/images/client-logos/devops.svg', alt: 'DevOps Services' }
    ]
  },
  {
    title: 'Finance',
    logos: [
      { src: '/images/client-logos/finance.svg', alt: 'Finance Inc' },
      { src: '/images/client-logos/analytics.svg', alt: 'Analytics LLC' }
    ]
  }
];

const ClientLogos: React.FC = () => {
  return (
    <div className="space-y-8">
      {logoGroups.map(group => (
        <section key={group.title}>
          <h3 className="text-center font-semibold mb-4">{group.title}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 place-items-center">
            {group.logos.map(logo => (
              <img
                key={logo.alt}
                src={logo.src}
                alt={logo.alt}
                className="h-12 w-auto filter grayscale hover:grayscale-0 transition"
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default ClientLogos;
