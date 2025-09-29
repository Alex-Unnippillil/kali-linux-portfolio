import React, { forwardRef, useId } from 'react';

interface FormErrorProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
}

const FormError = forwardRef<HTMLParagraphElement, FormErrorProps>(
  ({ id, className = '', children }, ref) => {
    const autoId = useId();
    const resolvedId = id ?? `form-error-${autoId.replace(/:/g, '')}`;

    return (
      <p
        ref={ref}
        id={resolvedId}
        role="status"
        aria-live="polite"
        className={`text-red-600 text-sm mt-2 ${className}`.trim()}
      >
        {children}
      </p>
    );
  }
);

FormError.displayName = 'FormError';

export default FormError;
