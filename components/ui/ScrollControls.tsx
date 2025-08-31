import { useEffect, useState } from 'react';

const selectors = 'main section[id], main h2[id], main h3[id]';

export default function ScrollControls() {
  const [show, setShow] = useState(false);
  const [next, setNext] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const update = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setShow(scrollY > window.innerHeight);

      const sections = Array.from(
        document.querySelectorAll<HTMLElement>(selectors)
      );
      let candidate: HTMLElement | null = null;
      for (const el of sections) {
        const top = el.getBoundingClientRect().top + window.scrollY;
        if (top > scrollY + 1) {
          candidate = el;
          break;
        }
      }
      if (candidate) candidate.setAttribute('tabindex', '-1');
      setNext(candidate);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  const focusAfterScroll = (el: HTMLElement) => {
    const handle = () => {
      el.focus({ preventScroll: true });
      window.removeEventListener('scrollend', handle);
    };
    if ('onscrollend' in window) {
      window.addEventListener('scrollend', handle, { once: true });
    } else {
      setTimeout(handle, 500);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const main = document.querySelector('main');
    if (main instanceof HTMLElement) {
      main.setAttribute('tabindex', '-1');
      focusAfterScroll(main);
    }
  };

  const scrollToNext = () => {
    if (!next) return;
    next.scrollIntoView({ behavior: 'smooth', block: 'start' });
    focusAfterScroll(next);
  };

  if (!show) return null;

  return (
    <div
      className="fixed flex flex-col gap-2 z-50"
      style={{
        right: 'calc(env(safe-area-inset-right, 0px) + 1rem)',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
      }}
    >
      <button
        onClick={scrollToTop}
        aria-label="Back to top"
        className="rounded bg-gray-900/80 p-2 text-white shadow"
      >
        ↑
      </button>
      {next && (
        <button
          onClick={scrollToNext}
          aria-label="Next section"
          className="rounded bg-gray-900/80 p-2 text-white shadow"
        >
          ↓
        </button>
      )}
    </div>
  );
}

