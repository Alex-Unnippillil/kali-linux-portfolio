import Image from "next/image";
import { useTheme } from "../hooks/useTheme";

interface SocialLink {
  href: string;
  label: string;
  icon: string;
}

const links: SocialLink[] = [
  {
    href: "https://bsky.app/profile/unnippillil.com",
    label: "Bluesky",
    icon: "/icons/social/bluesky.svg",
  },
  {
    href: "https://facebook.com/unnippillil",
    label: "Facebook",
    icon: "/icons/social/facebook.svg",
  },
  {
    href: "https://instagram.com/unnippillil",
    label: "Instagram",
    icon: "/icons/social/instagram.svg",
  },
  {
    href: "https://mastodon.social/@unnippillil",
    label: "Mastodon",
    icon: "/icons/social/mastodon.svg",
  },
  {
    href: "https://unnippillil.substack.com",
    label: "Substack",
    icon: "/icons/social/substack.svg",
  },
  {
    href: "https://x.com/unnippillil",
    label: "X",
    icon: "/icons/social/x.svg",
  },
  {
    href: "/rss.xml",
    label: "RSS",
    icon: "/icons/social/rss.svg",
  },
];

export default function Footer() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle theme"
        aria-pressed={isDark}
        className="mb-4 rounded p-2 focus:outline-none focus:ring"
      >
        {isDark ? "Light mode" : "Dark mode"}
      </button>
      <footer
        className="flex items-center justify-center gap-4 p-4"
        aria-label="social links"
      >
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded focus:outline-none focus:ring hover:opacity-80"
          >
            <Image
              src={link.icon}
              alt=""
              width={24}
              height={24}
              aria-hidden="true"
            />
            <span className="sr-only">{link.label}</span>
          </a>
        ))}
      </footer>
    </div>
  );
}
