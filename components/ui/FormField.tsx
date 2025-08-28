import React from 'react';
import FormError from './FormError';

interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  error?: string;
  children: React.ReactNode;
}

const FormField = ({ error, children, className = '', ...props }: FormFieldProps) => (
  <div className={className} {...props}>
    {children}
    {error && <FormError>{error}</FormError>}
  </div>
);

export default FormField;
