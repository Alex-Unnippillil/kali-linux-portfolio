import React from 'react';
import styles from './form.module.css';
import { cx } from './utils';

export type FormSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cx(styles.control, styles.select, className)}
      {...props}
    >
      {children}
    </select>
  ),
);

FormSelect.displayName = 'FormSelect';

export default FormSelect;
