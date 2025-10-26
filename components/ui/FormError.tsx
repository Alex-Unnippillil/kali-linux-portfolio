import React from 'react';

interface FormErrorProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
  /**
   * When true, the message represents a blocking error that should interrupt users.
   * Otherwise it is treated as a polite, non-blocking hint.
   */
  blocking?: boolean;
  /**
   * Id of the form control that should be described by this error message.
   */
  forId?: string;
}

const getAnnouncementText = (content: React.ReactNode) =>
  React.Children.toArray(content)
    .map((child) => (typeof child === 'string' || typeof child === 'number' ? child : ''))
    .join(' ')
    .trim();

const FormError = ({
  id,
  className = '',
  children,
  blocking = false,
  forId,
}: FormErrorProps) => {
  const generatedId = React.useId();
  const errorId = id ?? generatedId;
  const [displayContent, setDisplayContent] = React.useState(children);
  const lastAnnouncedRef = React.useRef<string>('');
  const [hasTarget, setHasTarget] = React.useState(false);

  React.useEffect(() => {
    const messageText = getAnnouncementText(children);

    if (!messageText) {
      lastAnnouncedRef.current = messageText;
      setDisplayContent((previous) => (Object.is(previous, children) ? previous : children));
      return;
    }

    if (messageText !== lastAnnouncedRef.current) {
      lastAnnouncedRef.current = messageText;
      setDisplayContent(children);
    }
  }, [children]);

  React.useEffect(() => {
    if (!forId || typeof document === 'undefined') {
      setHasTarget(false);
      return () => {};
    }

    const targetElement = document.getElementById(forId);

    if (!targetElement) {
      setHasTarget(false);
      return () => {};
    }

    setHasTarget(true);
    const currentDescriptor = targetElement.getAttribute('aria-describedby');
    const descriptors = currentDescriptor?.split(/\s+/).filter(Boolean) ?? [];

    if (!descriptors.includes(errorId)) {
      descriptors.push(errorId);
      targetElement.setAttribute('aria-describedby', descriptors.join(' '));
    }

    return () => {
      const latestDescriptor = targetElement.getAttribute('aria-describedby');
      if (!latestDescriptor) {
        return;
      }

      const remaining = latestDescriptor
        .split(/\s+/)
        .filter((token) => token && token !== errorId);

      if (remaining.length) {
        targetElement.setAttribute('aria-describedby', remaining.join(' '));
      } else {
        targetElement.removeAttribute('aria-describedby');
      }
    };
  }, [errorId, forId]);

  const handleJumpToField = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      if (!forId || typeof document === 'undefined') {
        return;
      }

      const targetElement = document.getElementById(forId) as HTMLElement | null;
      if (targetElement) {
        if (typeof targetElement.focus === 'function') {
          targetElement.focus();
        }

        if (typeof targetElement.scrollIntoView === 'function') {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    },
    [forId],
  );

  return (
    <p
      id={errorId}
      role={blocking ? 'alert' : 'status'}
      aria-live={blocking ? 'assertive' : 'polite'}
      className={`text-red-600 text-sm mt-2 ${className}`.trim()}
    >
      {displayContent}
      {hasTarget && (
        <>
          {' '}
          <a
            href={`#${forId}`}
            className="underline"
            onClick={handleJumpToField}
          >
            Jump to field
          </a>
        </>
      )}
    </p>
  );
};

export default FormError;
