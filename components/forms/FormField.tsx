import React, { ReactElement } from 'react';
import styles from './form.module.css';
import { cx } from './utils';

type ControlElement = ReactElement<{
  id?: string;
  required?: boolean;
  className?: string;
  'aria-describedby'?: string;
  'aria-errormessage'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
  'data-invalid'?: string | boolean;
}>;

export interface FormFieldProps
  extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  labelHidden?: boolean;
  children: ControlElement;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  description,
  error,
  required,
  labelHidden,
  children,
  startAdornment,
  endAdornment,
  className,
  ...rest
}) => {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  const describedByParts = [
    children.props['aria-describedby'],
    descriptionId,
    errorId,
  ].filter(Boolean);

  const mergedClassName = cx(
    children.props.className,
    startAdornment && styles.withStartAdornment,
    endAdornment && styles.withEndAdornment,
  );

  const control = React.cloneElement(children, {
    id,
    required: required ?? children.props.required,
    'aria-invalid': error ? true : children.props['aria-invalid'],
    'aria-describedby': describedByParts.length
      ? describedByParts.join(' ')
      : undefined,
    'aria-errormessage': error ? errorId : children.props['aria-errormessage'],
    'data-invalid': error ? 'true' : children.props['data-invalid'],
    className: mergedClassName,
  });

  return (
    <div
      {...rest}
      className={cx(styles.field, className)}
      data-invalid={error ? 'true' : undefined}
    >
      <label
        htmlFor={id}
        className={cx(styles.label, labelHidden && styles.visuallyHidden)}
      >
        <span>{label}</span>
        {required && (
          <span aria-hidden="true" className={styles.required}>
            *
          </span>
        )}
      </label>
      {description && (
        <p id={descriptionId} className={styles.description}>
          {description}
        </p>
      )}
      <div className={styles.controlContainer}>
        {startAdornment && (
          <span className={cx(styles.adornment, styles.adornmentStart)}>
            {startAdornment}
          </span>
        )}
        {control}
        {endAdornment && (
          <span className={cx(styles.adornment, styles.adornmentEnd)}>
            {endAdornment}
          </span>
        )}
      </div>
      {error && (
        <p id={errorId} role="status" aria-live="polite" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;
