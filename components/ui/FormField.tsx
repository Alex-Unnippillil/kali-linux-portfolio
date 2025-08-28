import React from 'react';
import FormError from './FormError';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  className?: string;
  children: React.ReactElement;
}

const FormField = ({ id, label, error, className = '', children }: FormFieldProps) => (
  <div className={`mb-4 ${className}`.trim()}>
    <label htmlFor={id} className="mb-2 block text-sm font-medium">
      {label}
    </label>
    {React.cloneElement(children, {
      id,
      'aria-invalid': error ? 'true' : undefined,
      'aria-describedby': error ? `${id}-error` : undefined,
    })}
    {error && (
      <FormError id={`${id}-error`} className="mt-2">
        {error}
      </FormError>
    )}
  </div>
);

export default FormField;
