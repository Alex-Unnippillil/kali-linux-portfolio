import React, { useEffect } from 'react';

interface FormErrorProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
}

const baseClassName = 'mt-2 text-sm text-red-500 block leading-snug';

const FormError = ({ id, className = '', children }: FormErrorProps) => {
  useEffect(() => {
    if (typeof window === 'undefined' || !id) return;

    const describedField = document.querySelector<HTMLElement>(
      `[aria-describedby~="${id}"][aria-invalid="true"]`
    );

    if (!describedField) return;

    const firstInvalidField = document.querySelector<HTMLElement>(
      '[aria-invalid="true"]'
    );

    if (!firstInvalidField || firstInvalidField !== describedField) return;

    if (typeof describedField.scrollIntoView === 'function') {
      describedField.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (document.activeElement !== describedField) {
      const focusable = describedField as HTMLElement & {
        focus(options?: FocusOptions): void;
      };
      focusable.focus?.({ preventScroll: true });
    }
  }, [id, children]);

  const classes = [baseClassName, className].filter(Boolean).join(' ');

  return (
    <p id={id} role="status" aria-live="polite" className={classes}>
      {children}
    </p>
  );
};

export default FormError;
