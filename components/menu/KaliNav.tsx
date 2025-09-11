import React from "react";

const links = [
  { href: "https://www.kali.org/get-kali/", label: "Get Kali" },
  { href: "https://www.kali.org/blog/", label: "Blog" },
  { href: "https://www.kali.org/docs/", label: "Documentation" },
  { href: "https://www.kali.org/community/", label: "Community" },
  { href: "https://www.kali.org/developers/", label: "Developers" },
  { href: "https://www.kali.org/about/", label: "About" },
];

const KaliNav: React.FC = () => (
  <nav className="flex space-x-2">
    {links.map((link) => (
      <a
        key={link.href}
        href={link.href}
        className="px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] rounded"
        tabIndex={0}
      >
        {link.label}
      </a>
    ))}
  </nav>
);

export default KaliNav;
