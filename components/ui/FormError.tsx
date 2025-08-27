import React from 'react';

interface FormErrorProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
}

const FormError = ({ id, className = '', children }: FormErrorProps) => {
  const label =
    typeof children === 'string'
      ? `Error: ${children}`
      : 'Form error';
  return (
    <p
      id={id}
      role="alert"
      aria-live="assertive"
      aria-label={label}
      className={`text-red-600 text-sm mt-2 ${className}`.trim()}
    >
      {children}
    </p>
  );
};

export default FormError;
