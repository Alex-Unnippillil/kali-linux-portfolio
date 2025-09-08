import React from 'react';

const policies = [
  { label: 'Cookie Policy', href: 'https://www.kali.org/docs/policy/cookie/' },
  { label: 'Kali Linux EULA', href: 'https://www.kali.org/docs/policy/eula/' },
  { label: 'Kali Linux Network Service Policy', href: 'https://www.kali.org/docs/policy/kali-linux-network-service-policy/' },
  { label: 'Kali Linux Open Source Policy', href: 'https://www.kali.org/docs/policy/kali-linux-open-source-policy/' },
  { label: 'Kali Linux Trademark Policy', href: 'https://www.kali.org/docs/policy/trademark/' },
  { label: 'Kali Linux Update Policies', href: 'https://www.kali.org/docs/policy/kali-linux-security-update-policies/' },
  { label: 'Kali Linux User Policy', href: 'https://www.kali.org/docs/policy/kali-linux-user-policy/' },
  { label: "Kali's Relationship With Debian", href: 'https://www.kali.org/docs/policy/kali-linux-relationship-with-debian/' },
  { label: 'Penetration Testing Tools Policy', href: 'https://www.kali.org/docs/policy/penetration-testing-tools-policy/' },
  { label: 'Privacy Policy', href: 'https://www.kali.org/docs/policy/privacy/' },
];

const LegalPage: React.FC = () => (
  <div className="p-8 max-w-5xl mx-auto">
    <h1 className="text-2xl font-bold mb-6">Policies</h1>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
      {policies.map((p) => (
        <a
          key={p.href}
          href={p.href}
          className="text-blue-500 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {p.label}
        </a>
      ))}
    </div>
    <p className="text-xs text-gray-500">
      This portfolio is an independent project and is not affiliated with or endorsed by Kali Linux, Offensive Security, or any of their subsidiaries. Please review the official policies above for authoritative information.
    </p>
  </div>
);

export default LegalPage;
