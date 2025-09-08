import React from "react";
import PolicyPage from "../components/PolicyPage";

interface PolicyLink {
  label: string;
  href: string;
  author: string;
  updated: string;
}

const policies: PolicyLink[] = [
  {
    label: "Cookie Policy",
    href: "https://www.kali.org/docs/policy/cookie/",
    author: "Offensive Security",
    updated: "2024-05-01",
  },
  {
    label: "Kali Linux EULA",
    href: "https://www.kali.org/docs/policy/eula/",
    author: "Offensive Security",
    updated: "2024-05-01",
  },
  {
    label: "Kali Linux Network Service Policy",
    href: "https://www.kali.org/docs/policy/kali-linux-network-service-policy/",
    author: "Offensive Security",
    updated: "2024-05-01",
  },
  {
    label: "Kali Linux Open Source Policy",
    href: "https://www.kali.org/docs/policy/kali-linux-open-source-policy/",
    author: "Offensive Security",
    updated: "2024-05-01",
  },
  {
    label: "Kali Linux Trademark Policy",
    href: "https://www.kali.org/docs/policy/trademark/",
    author: "Offensive Security",
    updated: "2024-05-01",
  },
  {
    label: "Kali Linux Update Policies",
    href: "https://www.kali.org/docs/policy/kali-linux-security-update-policies/",
    author: "Offensive Security",
    updated: "2024-05-01",
  },
  {
    label: "Kali Linux User Policy",
    href: "https://www.kali.org/docs/policy/kali-linux-user-policy/",
    author: "Offensive Security",
    updated: "2024-05-01",
  },
  {
    label: "Kali's Relationship With Debian",
    href: "https://www.kali.org/docs/policy/kali-linux-relationship-with-debian/",
    author: "Offensive Security",
    updated: "2024-05-01",
  },
  {
    label: "Penetration Testing Tools Policy",
    href: "https://www.kali.org/docs/policy/penetration-testing-tools-policy/",
    author: "Offensive Security",
    updated: "2024-05-01",
  },
  {
    label: "Privacy Policy",
    href: "https://www.kali.org/docs/policy/privacy/",
    author: "Offensive Security",
    updated: "2024-05-01",
  },
];

const LegalPage: React.FC = () => (
  <PolicyPage
    title="Policies"
    author="Portfolio Maintainer"
    updated="2024-09-07"
  >
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
      {policies.map((p) => (
        <div key={p.href} className="space-y-1">
          <a
            href={p.href}
            className="text-blue-500 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {p.label}
          </a>
          <p className="text-xs text-gray-500">
            Last updated: {p.updated} · Author: {p.author}
          </p>
        </div>
      ))}
    </div>
    <p className="text-xs text-gray-500">
      This portfolio is an independent project and is not affiliated with or
      endorsed by Kali Linux, Offensive Security, or any of their subsidiaries.
      Please review the official policies above for authoritative information.
    </p>
  </PolicyPage>
);

export default LegalPage;
