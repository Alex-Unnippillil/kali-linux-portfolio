import React from 'react';
import { typography } from '@/styles/theme';

interface FormErrorProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
}

const FormError = ({ id, className = '', children }: FormErrorProps) => (
  <p
    id={id}
    role="status"
    aria-live="polite"
    className={`mt-2 text-red-600 ${typography.bodySm} ${className}`.trim()}
  >
    {children}
  </p>
);

export default FormError;
