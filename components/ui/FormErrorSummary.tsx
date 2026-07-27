import React, { forwardRef, useCallback } from 'react';

export interface FormErrorSummaryItem {
  fieldId: string;
  label: string;
  message: string;
}

interface FormErrorSummaryProps {
  title?: string;
  description?: string;
  errors: FormErrorSummaryItem[];
  className?: string;
}

const FormErrorSummary = forwardRef<HTMLDivElement, FormErrorSummaryProps>(
  ({ title = 'There is a problem', description, errors, className = '' }, ref) => {
    const handleNavigate = useCallback((event: React.MouseEvent<HTMLAnchorElement>, fieldId: string) => {
      event.preventDefault();
      const target = document.getElementById(fieldId);
      if (!target) return;
      if ('focus' in target && typeof (target as HTMLElement).focus === 'function') {
        const element = target as HTMLElement;
        try {
          element.focus({ preventScroll: true });
        } catch {
          element.focus();
        }
      }
      if ('scrollIntoView' in target && typeof target.scrollIntoView === 'function') {
        try {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch {
          target.scrollIntoView();
        }
      }
    }, []);

    return (
      <div
        ref={ref}
        role="alert"
        aria-live="assertive"
        tabIndex={-1}
        className={`rounded border-l-4 border-red-400 bg-red-900/60 p-4 text-sm text-red-100 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-200 ${className}`.trim()}
      >
        <p className="font-semibold">{title}</p>
        {description && <p className="mt-1 text-red-100/90">{description}</p>}
        {errors.length > 0 && (
          <ul className="mt-3 space-y-1 list-disc pl-5">
            {errors.map(({ fieldId, label, message }) => (
              <li key={fieldId}>
                <a
                  href={`#${fieldId}`}
                  onClick={(event) => handleNavigate(event, fieldId)}
                  className="underline decoration-red-200 decoration-dotted underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
                >
                  <span className="font-semibold">{label}:</span> {message}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
);

FormErrorSummary.displayName = 'FormErrorSummary';

export default FormErrorSummary;
