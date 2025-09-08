import Link from 'next/link';

const navItems = [
  { href: '/get-kali', label: 'Get Kali' },
  { href: '/blog', label: 'Blog' },
  { href: '/docs', label: 'Documentation' },
  { href: '/community', label: 'Community' },
  { href: '/dev', label: 'Developers' },
  { href: '/about', label: 'About' },
];

export default function Header() {
  return (
    <header className="w-full bg-gray-900 text-white">
      <nav className="flex flex-col flex-wrap items-center justify-center gap-4 p-4 sm:flex-row">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="hover:underline">
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
