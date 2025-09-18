import React from 'react';
import styles from './form.module.css';
import { cx } from './utils';

export type FormInputProps = React.InputHTMLAttributes<HTMLInputElement>;

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cx(styles.control, className)}
      {...props}
    />
  ),
);

FormInput.displayName = 'FormInput';

export default FormInput;
