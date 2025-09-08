import React from 'react';

const socialLinks = [
  { href: 'https://bsky.app/profile/kalilinux.bsky.social', label: 'Bluesky' },
  { href: 'https://www.facebook.com/KaliLinux', label: 'Facebook' },
  { href: 'https://www.instagram.com/kalilinux/', label: 'Instagram' },
  { href: 'https://infosec.exchange/@kalilinux', label: 'Mastodon' },
  { href: 'https://kalilinux.substack.com/', label: 'Substack' },
  { href: 'https://x.com/kalilinux', label: 'X' },
  { href: 'https://www.kali.org/newsletter/', label: 'Newsletter' },
  { href: 'https://www.kali.org/rss.xml', label: 'RSS' },
];

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 p-4 text-sm" role="contentinfo">
      <div>
        <h2 className="font-semibold">Follow Us</h2>
        <ul className="mt-2 space-y-1">
          {socialLinks.map(({ href, label }) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="text-blue-600 underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}

