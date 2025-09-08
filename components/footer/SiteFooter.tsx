import React from 'react';

interface LinkItem {
  label: string;
  href: string;
}

interface Section {
  title: string;
  links: LinkItem[];
}

const sections: Section[] = [
  {
    title: 'Get Kali',
    links: [
      { label: 'Downloads', href: '/get-kali' },
      { label: 'NetHunter App Store', href: '/nethunter-appstore' },
    ],
  },
  {
    title: 'Documentation',
    links: [
      { label: 'Kali Docs', href: 'https://www.kali.org/docs/' },
      { label: 'Kali Blog', href: 'https://www.kali.org/blog/' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Discord', href: 'https://discord.kali.org/' },
      { label: 'Forums', href: 'https://forums.kali.org/' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: 'https://www.kali.org/docs/policy/privacy/' },
      {
        label: 'Trademark Policy',
        href: 'https://www.kali.org/docs/policy/trademark/',
      },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-gray-700 mt-8 p-4 text-sm" data-testid="site-footer">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="font-semibold mb-2">{section.title}</h2>
            <ul className="space-y-1">
              {section.links.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="hover:underline">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs">
        Kali Linux is a trademark of Offensive Security. This is a fan site and is
        not affiliated with or endorsed by Offensive Security or Kali Linux.
      </p>
    </footer>
  );
}

