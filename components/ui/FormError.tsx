import React from 'react';

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
    className={`text-[color:var(--kali-danger)] text-sm mt-2 ${className}`.trim()}
  >
    {children}
  </p>
);

export default FormError;
