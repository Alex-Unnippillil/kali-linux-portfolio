import React from 'react';
import styles from './form.module.css';
import { cx } from './utils';

export type FormTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cx(styles.control, styles.textarea, className)}
      {...props}
    />
  ),
);

FormTextarea.displayName = 'FormTextarea';

export default FormTextarea;
