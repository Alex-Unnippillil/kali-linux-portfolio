import Link from "next/link";

const sections = [
  {
    title: "Links",
    links: [
      { label: "Home", href: "#" },
      { label: "Downloads", href: "#" },
      { label: "Docs", href: "#" },
    ],
  },
  {
    title: "Platforms",
    links: [
      { label: "Desktop", href: "#" },
      { label: "Cloud", href: "#" },
      { label: "Containers", href: "#" },
    ],
  },
  {
    title: "Development",
    links: [
      { label: "Roadmap", href: "#" },
      { label: "GitHub", href: "#" },
      { label: "API", href: "#" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Forums", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Events", href: "#" },
    ],
  },
  {
    title: "Follow Us",
    links: [
      { label: "Twitter", href: "#" },
      { label: "YouTube", href: "#" },
      { label: "Mastodon", href: "#" },
    ],
  },
  {
    title: "Policies",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Security", href: "#" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-8">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-4 font-semibold">{section.title}</h3>
              <ul className="space-y-2 text-sm">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center text-sm text-gray-500">
          Kali Linux is developed by OffSec.
        </div>
      </div>
    </footer>
  );
}
