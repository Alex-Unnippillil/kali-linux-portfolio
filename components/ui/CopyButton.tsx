import React, { useState } from 'react';
import Toast from './Toast';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  label = 'Copy',
  className = '',
}) => {
  const [toast, setToast] = useState<string | null>(null);

  const copyText = async () => {
    if (!text) return;
    try {
      await navigator.clipboard?.writeText(text);
      setToast('Copied to clipboard');
    } catch (error) {
      setToast('Failed to copy');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={copyText}
        className={className}
      >
        {label}
      </button>
      {toast && (
        <Toast
          message={toast}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

export default CopyButton;
