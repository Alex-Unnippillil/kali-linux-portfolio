import { useEffect } from 'react';

/**
 * Observes all <section> elements with a `data-accent` attribute and
 * updates the `--accent` CSS variable on the root element whenever a
 * section becomes visible in the viewport. The color transition is
 * handled via CSS using the `@property` rule for `--accent`.
 */
export default function useSectionAccent() {
  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>('section[data-accent]'),
    );
    if (sections.length === 0) return;

    const root = document.documentElement;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const color = (entry.target as HTMLElement).dataset.accent;
          if (color) {
            root.style.setProperty('--accent', color);
          }
        }
      });
    }, {
      threshold: 0.6,
    });

    sections.forEach((sec) => observer.observe(sec));

    return () => observer.disconnect();
  }, []);
}

