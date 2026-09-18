'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import useIsTouchDevice from '../../hooks/useIsTouchDevice';
import styles from './DesktopGuide.module.css';

const SEEN_KEY = 'kali:desktop-guide:v1';

/** Optional in-desktop help, never a landing page, modal, or entry gate. */
export default function DesktopGuide() {
  const [open, setOpen] = useState(false);
  const [firstVisit, setFirstVisit] = useState(false);
  const touchAvailable = useIsTouchDevice();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const id = useId();
  const remember = () => {
    setFirstVisit(false);
    try { window.localStorage.setItem(SEEN_KEY, 'seen'); } catch { /* Private browsing still works. */ }
  };

  useEffect(() => {
    try { setFirstVisit(window.localStorage.getItem(SEEN_KEY) !== 'seen'); } catch { /* No persistence required. */ }
  }, []);
  useEffect(() => {
    if (!open) return;
    close.current?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  const dismiss = () => { setOpen(false); remember(); trigger.current?.focus({ preventScroll: true }); };
  return <div ref={root} className={styles.guide} onKeyDown={(event) => {
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); dismiss(); }
  }}>
    {open && <aside id={id} className={styles.panel} aria-label="Using this desktop">
      <div className={styles.heading}><div><span className={styles.eyebrow}>A desktop, in your browser</span><h2>Make yourself at home.</h2></div><button ref={close} type="button" className={styles.close} onClick={dismiss} aria-label="Close desktop tips">×</button></div>
      <p>Start with About Alex, explore Projects, or open an app from the launcher. You are already in the desktop.</p>
      <div className={styles.tip}><span className={styles.symbol} aria-hidden="true">↖</span><div><h3>Mouse and keyboard</h3><p>Double-click a desktop icon, or select it and press Enter. Drag a window by its title bar; use its corner to resize.</p></div></div>
      <div className={styles.tip}><span className={styles.symbol} aria-hidden="true">☝</span><div><h3>{touchAvailable ? 'Touch is ready too' : 'Built for touch too'}</h3><p>Tap an app once to open it. On a phone, windows fit your screen automatically. Minimize and use the taskbar to switch apps.</p></div></div>
      <div className={styles.tip}><span className={styles.symbol} aria-hidden="true">⌨</span><div><h3>Keep your place</h3><p>Tab moves between controls. Enter activates them. A mouse, keyboard, and touchscreen can be used together—no mode to select.</p></div></div>
      <p className={styles.note}>This is a portfolio OS simulation. Browser permissions stay in your control, and security tools are learning environments.</p>
      <button type="button" className={styles.done} onClick={dismiss}>Explore the desktop</button>
    </aside>}
    <div className={styles.controls}><button ref={trigger} type="button" className={styles.trigger} aria-label="Desktop tips" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => { remember(); setOpen((value) => !value); }}><span className={styles.question} aria-hidden="true">?</span><span className={!firstVisit && !open ? styles.compactLabel : undefined}>{firstVisit ? 'New here? Desktop tips' : 'Desktop tips'}</span></button>{firstVisit && !open && <button type="button" className={styles.dismissHint} aria-label="Dismiss desktop hint" onClick={remember}>×</button>}</div>
  </div>;
}
