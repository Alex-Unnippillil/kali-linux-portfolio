"use client";

import { ButtonHTMLAttributes, PropsWithChildren, useCallback } from 'react';

type ShowDesktopButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>;

const minimizedStyles = `
  [data-window][data-minimized="true"] {
    pointer-events: none !important;
    opacity: 0 !important;
    transform: scale(0.9) translateY(20px) !important;
    transition: transform 150ms ease, opacity 150ms ease;
  }
`;

const ShowDesktopButton = ({ children, ...props }: ShowDesktopButtonProps) => {
  const handleClick = useCallback(() => {
    const windows = document.querySelectorAll<HTMLElement>('[data-window]');
    windows.forEach((windowEl) => {
      windowEl.setAttribute('data-minimized', 'true');
      windowEl.style.pointerEvents = 'none';
      windowEl.style.opacity = '0';
      windowEl.style.transform = 'scale(0.9) translateY(20px)';
      windowEl.style.transition = 'transform 150ms ease, opacity 150ms ease';
    });
  }, []);

  return (
    <>
      <style>{minimizedStyles}</style>
      <button type="button" onClick={handleClick} {...props}>
        {children ?? 'Show Desktop'}
      </button>
    </>
  );
};

export default ShowDesktopButton;
