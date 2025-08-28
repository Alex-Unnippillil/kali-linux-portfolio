import React from 'react';
import FormError from './FormError';

interface FormFieldProps {
  id?: string;
  className?: string;
  error?: string;
  children: React.ReactNode;
}

const FormField = ({ id, className = '', error, children }: FormFieldProps) => (
  <div id={id} className={className}>
    {children}
    {error && <FormError>{error}</FormError>}
  </div>
);

export default FormField;
