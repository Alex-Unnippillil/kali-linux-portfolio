import { useEffect, useId, useRef, type ReactNode } from "react";
import styles from "./SettingsCenter.module.css";

export type IconName =
  | "home"
  | "appearance"
  | "display"
  | "input"
  | "sound"
  | "privacy"
  | "profiles"
  | "system"
  | "search"
  | "check"
  | "arrow"
  | "download"
  | "upload"
  | "reset";
const paths: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="m3 10 9-7 9 7v10H3Z" />
      <path d="M9 20v-7h6v7" />
    </>
  ),
  appearance: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-4c-1-1 0-3 2-3h2a3 3 0 0 0 3-3 9 9 0 0 0-9-8Z" />
      <path d="M7 10h.01M10 7h.01M15 7h.01M6 14h.01" strokeWidth="3" />
    </>
  ),
  display: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8m-4-4v4" />
    </>
  ),
  input: (
    <>
      <rect x="2" y="6" width="20" height="13" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M10 15h8" />
    </>
  ),
  sound: (
    <>
      <path d="m11 4-6 5H2v6h3l6 5Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
    </>
  ),
  privacy: (
    <>
      <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  profiles: (
    <>
      <rect x="5" y="3" width="14" height="17" rx="2" />
      <path d="M9 7h6M9 11h6M9 15h3" />
    </>
  ),
  system: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6m0-10h.01" />
    </>
  ),
  search: (
    <>
      <circle cx="10" cy="10" r="6" />
      <path d="m15 15 6 6" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  arrow: <path d="m9 5 7 7-7 7" />,
  download: (
    <>
      <path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4" />
    </>
  ),
  reset: (
    <>
      <path d="M3 10a9 9 0 1 1 1 8M3 3v7h7" />
    </>
  ),
};
export function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
export function Card({
  title,
  description,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${styles.card} ${className}`}>
      {title && (
        <div className={styles.cardHeading}>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
export function Row({
  name,
  title,
  description,
  children,
}: {
  name: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.row} data-setting={name}>
      <div className={styles.rowText}>
        <div className={styles.rowTitle}>{title}</div>
        <p>{description}</p>
      </div>
      <div className={styles.rowControl}>{children}</div>
    </div>
  );
}
export function Switch({
  title,
  description,
  value,
  onChange,
  name,
  disabled = false,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  name: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className={styles.row} data-setting={name}>
      <div className={styles.rowText}>
        <label id={`${id}-label`} htmlFor={id} className={styles.rowTitle}>
          {title}
        </label>
        <p id={`${id}-description`}>{description}</p>
      </div>
      <button
        id={id}
        className={styles.switch}
        type="button"
        role="switch"
        aria-checked={value}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-description`}
        onClick={() => onChange(!value)}
        disabled={disabled}
      >
        <span className={styles.switchState} aria-hidden="true">
          {value ? "On" : "Off"}
        </span>
        <span className={styles.switchTrack} aria-hidden="true">
          <span />
        </span>
      </button>
    </div>
  );
}
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <fieldset className={styles.segmented}>
      <legend className={styles.srOnly}>{label}</legend>
      {options.map((option) => (
        <label key={option.value} data-active={value === option.value}>
          <input
            type="radio"
            aria-label={option.label}
            name={id}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className={styles.slider}>
      <label htmlFor={id} className={styles.srOnly}>
        {label}
      </label>
      <output htmlFor={id}>
        {Math.round(value * 100) / 100}
        {unit}
      </output>
      <input
        id={id}
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}
/** Native modal: top layer, inert background, Escape support and bounded scrolling. */
export function Modal({
  title,
  children,
  onDismiss,
  returnFocus,
}: {
  title: string;
  children: ReactNode;
  onDismiss: () => void;
  returnFocus: HTMLElement | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    dialog
      ?.querySelector<HTMLElement>("[data-initial-focus]")
      ?.focus({ preventScroll: true });
    return () => {
      dialog?.close();
      returnFocus?.focus({ preventScroll: true });
    };
  }, [returnFocus]);
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), [href], [tabindex="0"]',
          ),
        );
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
    >
      <div className={styles.dialogHeader}>
        <h2 id={id}>{title}</h2>
        <button
          type="button"
          onClick={onDismiss}
          className={styles.iconButton}
          aria-label="Close dialog"
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
