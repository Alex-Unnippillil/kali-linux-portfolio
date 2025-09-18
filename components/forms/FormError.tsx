import React from 'react';
import styles from './form.module.css';
import { cx } from './utils';

export interface FormErrorProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
}

const FormError: React.FC<FormErrorProps> = ({ id, className, children }) => (
  <p
    id={id}
    role="status"
    aria-live="polite"
    className={cx(styles.error, className)}
  >
    {children}
  </p>
);

export default FormError;
