'use client';

import { useState, useRef, useEffect } from 'react';

interface Category {
  label: string;
  src: string;
}

const categories: Category[] = [
  {
    label: 'Security',
    src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  },
  {
    label: 'Images',
    src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  },
  {
    label: 'WSL',
    src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  },
  {
    label: 'NetHunter',
    src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  },
];

function LazyVideo({ src, label }: { src: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!el.src) {
              el.src = src;
              el.load();
            }
            el.play().catch(() => {});
          } else {
            el.pause();
          }
        });
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [src]);

  return (
    <video
      ref={ref}
      width={640}
      height={360}
      className="w-full max-w-2xl bg-black"
      muted
      loop
      playsInline
      preload="none"
      aria-label={label}
    />
  );
}

export default function WhatsNewPage() {
  const [active, setActive] = useState<string>(categories[0].label);
  const activeCategory = categories.find((c) => c.label === active) ?? categories[0];

  return (
    <div className="p-4">
      <div role="tablist" aria-label="Categories" className="mb-4 flex gap-2 border-b">
        {categories.map((cat) => (
          <button
            key={cat.label}
            role="tab"
            aria-selected={active === cat.label}
            type="button"
            onClick={() => setActive(cat.label)}
            className={`px-4 py-2 text-sm focus:outline-none ${active === cat.label ? 'border-b-2 border-blue-500 font-medium' : 'text-gray-500'}`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="flex justify-center">
        <LazyVideo key={activeCategory.label} src={activeCategory.src} label={activeCategory.label} />
      </div>
    </div>
  );
}

