import React, { forwardRef } from 'react';
import clsx from 'clsx';

type FieldState = 'default' | 'success' | 'error';

interface BaseFieldProps {
  label?: React.ReactNode;
  description?: React.ReactNode;
  message?: React.ReactNode;
  state?: FieldState;
  className?: string;
  inputClassName?: string;
  loading?: boolean;
}

export interface TextFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    BaseFieldProps {
  id: string;
}

export interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement>, BaseFieldProps {
  id: string;
}

const stateStyles: Record<FieldState, string> = {
  default: 'border-[color:var(--color-border)] focus-visible:outline-[var(--color-focus-ring)]',
  success: 'border-[color:var(--game-color-success)] focus-visible:outline-[color:var(--game-color-success)]',
  error: 'border-[color:var(--game-color-danger)] focus-visible:outline-[color:var(--game-color-danger)]',
};

const messageStyles: Record<FieldState, string> = {
  default: 'text-kali-text/70',
  success: 'text-[color:var(--game-color-success)]',
  error: 'text-[color:var(--game-color-danger)]',
};

const buildDescribedBy = (
  propsDescribedBy: string | undefined,
  descriptionId: string | undefined,
  messageId: string | undefined,
) => {
  return [propsDescribedBy, descriptionId, messageId].filter(Boolean).join(' ') || undefined;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    id,
    label,
    description,
    message,
    state = 'default',
    className,
    inputClassName,
    loading = false,
    disabled,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    ...props
  },
  ref,
) {
  const descriptionId = description ? `${id}-description` : undefined;
  const messageId = message ? `${id}-message` : undefined;
  const combinedDescribedBy = buildDescribedBy(ariaDescribedBy, descriptionId, messageId);
  const showError = state === 'error';

  return (
    <div className={clsx('flex flex-col gap-2 text-sm text-kali-text', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-kali-text">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          ref={ref}
          disabled={disabled}
          className={clsx(
            'block w-full rounded-[var(--radius-md)] border bg-kali-secondary/40 px-3 py-2 text-base text-kali-text shadow-sm transition duration-[var(--motion-fast)] placeholder:text-kali-text/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-[color:var(--color-muted)] disabled:text-kali-text/50',
            stateStyles[state],
            loading && 'pr-10',
            inputClassName,
          )}
          aria-describedby={combinedDescribedBy}
          aria-invalid={showError || ariaInvalid ? true : undefined}
          {...props}
        />
        {loading && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-3 inline-flex h-4 w-4 self-center animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
      </div>
      {description && (
        <p id={descriptionId} className="text-xs text-kali-text/70">
          {description}
        </p>
      )}
      {message && (
        <p id={messageId} className={clsx('text-xs', messageStyles[state])}>
          {message}
        </p>
      )}
    </div>
  );
});

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField(
  {
    id,
    label,
    description,
    message,
    state = 'default',
    className,
    inputClassName,
    loading = false,
    disabled,
    rows = 4,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    ...props
  },
  ref,
) {
  const descriptionId = description ? `${id}-description` : undefined;
  const messageId = message ? `${id}-message` : undefined;
  const combinedDescribedBy = buildDescribedBy(ariaDescribedBy, descriptionId, messageId);
  const showError = state === 'error';

  return (
    <div className={clsx('flex flex-col gap-2 text-sm text-kali-text', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-kali-text">
          {label}
        </label>
      )}
      <div className="relative">
        <textarea
          id={id}
          ref={ref}
          disabled={disabled}
          rows={rows}
          className={clsx(
            'block w-full rounded-[var(--radius-md)] border bg-kali-secondary/40 px-3 py-2 text-base text-kali-text shadow-sm transition duration-[var(--motion-fast)] placeholder:text-kali-text/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-[color:var(--color-muted)] disabled:text-kali-text/50',
            stateStyles[state],
            loading && 'pr-10',
            inputClassName,
          )}
          aria-describedby={combinedDescribedBy}
          aria-invalid={showError || ariaInvalid ? true : undefined}
          {...props}
        />
        {loading && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-3 inline-flex h-4 w-4 self-center animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
      </div>
      {description && (
        <p id={descriptionId} className="text-xs text-kali-text/70">
          {description}
        </p>
      )}
      {message && (
        <p id={messageId} className={clsx('text-xs', messageStyles[state])}>
          {message}
        </p>
      )}
    </div>
  );
});
