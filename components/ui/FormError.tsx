import React, { useId } from 'react';

interface FormErrorProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
}

const FormError = ({ id, className = '', children }: FormErrorProps) => {
  const generatedId = useId();
  const errorId = id ?? generatedId;

  return (
    <p
      id={errorId}
      role="status"
      aria-live="polite"
      className={`text-red-600 text-sm mt-2 ${className}`.trim()}
    >
      {children}
    </p>
  );
};

export default FormError;
