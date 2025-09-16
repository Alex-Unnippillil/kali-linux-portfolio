'use client';

import React, { useEffect, useRef, useState } from 'react';

interface PreviewProps {
  file: File | null;
  className?: string;
  emptyState?: React.ReactNode;
}

const Preview: React.FC<PreviewProps> = ({
  file,
  className = '',
  emptyState = 'Select a file to preview.',
}) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [textError, setTextError] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const isImage = Boolean(file && file.type.startsWith('image/'));

  useEffect(() => {
    if (!file) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setObjectUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setObjectUrl(url);

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [file]);

  useEffect(() => {
    if (!file || isImage) {
      setTextContent('');
      setTextError(null);
      return;
    }

    let cancelled = false;
    const reader = new FileReader();
    setTextContent('');
    setTextError(null);

    reader.onload = () => {
      if (cancelled) return;

      if (typeof reader.result === 'string') {
        setTextContent(reader.result);
      } else {
        setTextContent('');
        setTextError('Unsupported text encoding.');
      }
    };

    reader.onerror = () => {
      if (cancelled) return;

      setTextContent('');
      setTextError('Failed to read file.');
    };

    reader.readAsText(file);

    return () => {
      cancelled = true;
      if (reader.readyState === FileReader.LOADING) {
        reader.abort();
      }
    };
  }, [file, isImage]);

  const handleImageLoad = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  if (!file) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center text-sm text-gray-400 ${className}`}
      >
        {emptyState}
      </div>
    );
  }

  if (isImage) {
    return (
      <div className={`flex h-full w-full items-center justify-center overflow-hidden ${className}`}>
        {objectUrl ? (
          <img
            src={objectUrl}
            alt={file.name}
            className="max-h-full max-w-full object-contain"
            onLoad={handleImageLoad}
          />
        ) : (
          <span className="text-sm text-gray-400">Generating preview…</span>
        )}
      </div>
    );
  }

  return (
    <div className={`h-full w-full overflow-auto ${className}`}>
      {textError ? (
        <div className="rounded bg-red-900/40 p-3 text-sm text-red-200">{textError}</div>
      ) : (
        <pre className="whitespace-pre-wrap break-words text-sm text-gray-100">{textContent}</pre>
      )}
    </div>
  );
};

export default Preview;
