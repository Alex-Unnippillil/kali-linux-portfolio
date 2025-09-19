import React from 'react';
import { useLiveAnnouncement } from '../../hooks/useLiveRegion';

interface FormErrorProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
}

const FormError = ({ id, className = '', children }: FormErrorProps) => {
  useLiveAnnouncement(children, { politeness: 'assertive', priority: 'urgent' });

  return (
    <p
      id={id}
      role="status"
      aria-live="off"
      className={`text-red-600 text-sm mt-2 ${className}`.trim()}
    >
      {children}
    </p>
  );
};

export default FormError;
