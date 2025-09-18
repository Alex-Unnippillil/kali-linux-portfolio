import React from 'react';
import styles from './form.module.css';
import { cx } from './utils';

export interface FormCheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  id: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
}

const FormCheckbox = React.forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ id, label, description, error, className, required, ...props }, ref) => {
    const descriptionId = description ? `${id}-description` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div
        className={cx(styles.field, styles.checkboxField, className)}
        data-invalid={error ? 'true' : undefined}
      >
        <label htmlFor={id} className={styles.checkboxLabel}>
          <input
            {...props}
            ref={ref}
            id={id}
            type="checkbox"
            className={styles.checkboxInput}
            aria-describedby={describedBy}
            aria-invalid={error ? true : props['aria-invalid']}
            required={required}
          />
          <span className={styles.checkboxCopy}>
            <span>
              {label}
              {required && (
                <span aria-hidden="true" className={styles.required}>
                  *
                </span>
              )}
            </span>
            {description && (
              <span id={descriptionId} className={styles.description}>
                {description}
              </span>
            )}
          </span>
        </label>
        {error && (
          <p id={errorId} role="status" aria-live="polite" className={styles.error}>
            {error}
          </p>
        )}
      </div>
    );
  },
);

FormCheckbox.displayName = 'FormCheckbox';

export default FormCheckbox;
