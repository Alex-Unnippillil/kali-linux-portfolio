import React from 'react';

interface FormErrorProps {
  id?: string;
  className?: string;
  role?: 'status' | 'alert';
  ariaLive?: 'polite' | 'assertive';
  children: React.ReactNode;
}

const FormError = ({
  id,
  className = '',
  role = 'status',
  ariaLive,
  children,
}: FormErrorProps) => (
  <p
    id={id}
    role={role}
    aria-live={ariaLive ?? (role === 'alert' ? 'assertive' : 'polite')}
    className={`text-red-600 text-sm mt-2 ${className}`.trim()}
  >
    {children}
  </p>
);

export default FormError;
