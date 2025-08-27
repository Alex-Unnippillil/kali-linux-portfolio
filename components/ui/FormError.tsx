import React from 'react';

interface FormErrorProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
}

const FormError = ({ id, className = '', children }: FormErrorProps) => (
  <p
    id={id}
    role="alert"
    aria-live="assertive"
    className={`text-red-600 text-sm mt-2 ${className}`.trim()}
  >
    {children}
  </p>
);

export default FormError;
