import React, { FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react';

interface Segment {
  name: string;
}

interface Props {
  path: Segment[];
  onNavigate: (index: number) => void;
}

const canonicalizePath = (value: string): string => {
  const trimmed = value.trim().replace(/\\/g, '/');
  if (!trimmed) return '/';

  let sanitized = trimmed.replace(/\/{2,}/g, '/');
  sanitized = sanitized.replace(/^\/+/, '/');
  if (!sanitized.startsWith('/')) {
    sanitized = `/${sanitized}`;
  }
  if (sanitized.length > 1 && sanitized.endsWith('/')) {
    sanitized = sanitized.slice(0, -1);
  }
  return sanitized || '/';
};

const segmentsToString = (segments: Segment[]): string => {
  if (!segments.length) return '/';

  const parts = segments.map((segment, index) => {
    const raw = (segment.name ?? '').trim();
    if (index === 0 && (raw === '' || raw === '/')) {
      return '';
    }
    return raw.replace(/^\/+|\/+$/g, '');
  });

  const joined = parts.filter((part, index) => part || index === 0).join('/');
  return joined || '/';
};

const Breadcrumbs: React.FC<Props> = ({ path, onNavigate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  const options = useMemo(
    () => path.map((_, index) => canonicalizePath(segmentsToString(path.slice(0, index + 1)))),
    [path]
  );
  const currentPath = options[options.length - 1] ?? '/';
  const baseInputClass =
    'px-2 py-1 rounded bg-black bg-opacity-40 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm text-white';

  useEffect(() => {
    if (isEditing) {
      setInputValue(currentPath);
    }
  }, [currentPath, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      const input = inputRef.current;
      input.focus();
      input.select();
    }
  }, [isEditing]);

  const stopEditing = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const canonicalInput = canonicalizePath(inputValue);
    const targetIndex = options.findIndex((option) => option === canonicalInput);

    if (targetIndex === -1) {
      setError('Invalid path');
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
      return;
    }

    stopEditing();
    onNavigate(targetIndex);
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    if (error) {
      event.preventDefault();
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 0);
      return;
    }
    stopEditing();
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (error) {
      setError(null);
    }
    setInputValue(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      stopEditing();
    }
  };

  const startEditing = () => {
    setError(null);
    setIsEditing(true);
  };

  return (
    <div className="flex flex-col text-white">
      {isEditing ? (
        <>
          <form className="flex items-center space-x-2" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              aria-label="Current path"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className={`${baseInputClass}${error ? ' border border-red-400' : ''}`}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? `${errorId}-error` : undefined}
              autoComplete="off"
            />
          </form>
          {error && (
            <p id={`${errorId}-error`} role="alert" className="mt-1 text-xs text-red-300">
              {error}
            </p>
          )}
        </>
      ) : (
        <nav
          className="flex items-center space-x-1 text-white cursor-text"
          aria-label="Breadcrumb"
          onClick={startEditing}
        >
          {path.map((seg, idx) => (
            <React.Fragment key={idx}>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onNavigate(idx);
                }}
                className="hover:underline focus:outline-none"
              >
                {seg.name || '/'}
              </button>
              {idx < path.length - 1 && <span>/</span>}
            </React.Fragment>
          ))}
        </nav>
      )}
    </div>
  );
};

export default Breadcrumbs;
