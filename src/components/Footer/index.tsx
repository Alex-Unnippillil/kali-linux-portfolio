"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";

const Footer = () => {
  const { theme, setTheme } = useSettings();
  const current = theme === "dark" ? "dark" : "light";

  useEffect(() => {
    // ensure HTML attribute stays in sync when component mounts
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const handleToggle = (mode: "light" | "dark") => {
    setTheme(mode === "light" ? "default" : "dark");
  };

  const segmentClasses = (mode: "light" | "dark") =>
    `px-3 py-1 text-xs focus:outline-none transition-colors ${
      current === mode
        ? "bg-ubt-cool-grey text-black"
        : "bg-ub-cool-grey text-white hover:bg-ubt-cool-grey hover:text-black"
    }`;

  return (
    <footer className="bg-ub-cool-grey text-white text-sm mt-8">
      <div className="max-w-screen-xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <h3 className="font-bold mb-2">Links</h3>
          <ul className="space-y-1">
            <li>
              <Link href="/">
                <span className="hover:underline">Home</span>
              </Link>
            </li>
            <li>
              <Link href="/about">
                <span className="hover:underline">About</span>
              </Link>
            </li>
            <li>
              <Link href="/contact">
                <span className="hover:underline">Contact</span>
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold mb-2">Platforms</h3>
          <ul className="space-y-1">
            <li>
              <a
                className="hover:underline"
                href="https://github.com/Alex-Unnippillil"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </li>
            <li>
              <a
                className="hover:underline"
                href="https://www.linkedin.com/in/unnippillil/"
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold mb-2">Development</h3>
          <ul className="space-y-1">
            <li>
              <a
                className="hover:underline"
                href="https://nextjs.org"
                target="_blank"
                rel="noopener noreferrer"
              >
                Next.js
              </a>
            </li>
            <li>
              <a
                className="hover:underline"
                href="https://tailwindcss.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Tailwind CSS
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold mb-2">Community</h3>
          <ul className="space-y-1">
            <li>
              <a
                className="hover:underline"
                href="https://www.kali.org/community/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Kali Community
              </a>
            </li>
            <li>
              <a
                className="hover:underline"
                href="https://discord.com/invite/kali-linux-official"
                target="_blank"
                rel="noopener noreferrer"
              >
                Discord
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="flex flex-col items-center border-t border-ubt-cool-grey px-4 py-4">
        <div className="inline-flex rounded overflow-hidden border border-ubt-cool-grey mb-2">
          <button
            type="button"
            className={segmentClasses("light")}
            onClick={() => handleToggle("light")}
            aria-pressed={current === "light"}
          >
            LIGHT
          </button>
          <button
            type="button"
            className={segmentClasses("dark")}
            onClick={() => handleToggle("dark")}
            aria-pressed={current === "dark"}
          >
            DARK
          </button>
        </div>
        <p className="text-xs text-gray-300">
          © 2024 Kali Linux Portfolio
        </p>
      </div>
    </footer>
  );
};

export default Footer;
