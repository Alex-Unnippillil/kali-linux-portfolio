import { useEffect, useMemo, useState } from "react";
import posts from "@/data/kali-blog.json";

const STORAGE_KEY = "release-highlight-dismissed";

interface Post {
  title: string;
  link: string;
  date: string;
}

export default function ReleaseHighlight() {
  const [visible, setVisible] = useState(false);

  const latest = useMemo(() => {
    return (posts as Post[])
      .filter((p) => p.title.includes("Release"))
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      )[0];
  }, []);

  useEffect(() => {
    if (!latest) return;
    if (typeof window === "undefined") return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed !== latest.link) {
      setVisible(true);
    }
  }, [latest]);

  const dismiss = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, latest.link);
    }
    setVisible(false);
  };

  if (!latest || !visible) return null;

  return (
    <div className="Surface rounded p-4 flex items-start justify-between">
      <div className="flex-1">
        <h3 className="text-lg font-semibold mb-1">Latest Release</h3>
        <a
          href={latest.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline"
        >
          {latest.title}
        </a>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="ml-4 text-gray-500 hover:text-gray-700"
      >
        ×
      </button>
    </div>
  );
}

