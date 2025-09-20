import React from 'react';
import { useDesktop } from '../core/DesktopProvider';

interface FormErrorProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
}

const FormError = ({ id, className = '', children }: FormErrorProps) => {
  const { tokens } = useDesktop();
  return (
    <p
      id={id}
      role="status"
      aria-live="polite"
      className={`text-red-600 mt-2 ${tokens.subtleText} ${className}`.trim()}
    >
      {children}
    </p>
  );
};

export default FormError;
