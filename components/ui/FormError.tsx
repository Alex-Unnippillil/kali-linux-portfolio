import React, { useEffect, useMemo } from 'react';
import useAnnounce from '../../hooks/useAnnounce';

interface FormErrorProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
}

const flattenText = (node: React.ReactNode): string => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  if (React.isValidElement(node)) return flattenText(node.props.children);
  return '';
};

const FormError = ({ id, className = '', children }: FormErrorProps) => {
  const { announceAssertive } = useAnnounce();
  const textContent = useMemo(() => flattenText(children).trim(), [children]);

  useEffect(() => {
    if (textContent) {
      announceAssertive(textContent);
    }
  }, [announceAssertive, textContent]);

  return (
    <p id={id} className={`text-red-600 text-sm mt-2 ${className}`.trim()}>
      {children}
    </p>
  );
};

export default FormError;
