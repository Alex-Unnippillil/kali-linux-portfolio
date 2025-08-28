import React, { useState, useCallback } from 'react';
import FormError from './FormError';

interface FormFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string | number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: any) => void;
  onValidChange?: (valid: boolean) => void;
}

const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  type = 'text',
  value,
  min,
  max,
  step,
  onChange,
  onValidChange,
}) => {
  const [error, setError] = useState('');

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = type === 'number' ? e.target.valueAsNumber : e.target.value;
      onChange(val);
      let err = '';
      if (type === 'number') {
        if (Number.isNaN(val)) {
          err = 'Value required';
        } else {
          if (min !== undefined && val < min) err = `Minimum ${min}`;
          else if (max !== undefined && val > max) err = `Maximum ${max}`;
        }
      }
      setError(err);
      onValidChange?.(!err);
    },
    [onChange, onValidChange, min, max, type]
  );

  return (
    <div className="mb-4">
      <label htmlFor={id} className="mr-2">
        {label}:
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        aria-describedby={error ? `${id}-error` : undefined}
        className="text-black px-2"
      />
      {error && <FormError id={`${id}-error`}>{error}</FormError>}
    </div>
  );
};

export default FormField;

