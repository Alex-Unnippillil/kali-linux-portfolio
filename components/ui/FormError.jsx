import React from 'react';
const FormError = ({ id, className = '', children }) => (<p id={id} role="alert" aria-live="assertive" className={`text-red-600 text-sm mt-2 ${className}`.trim()}>
    {children}
  </p>);
export default FormError;
