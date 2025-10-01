import React, { useId } from 'react';
import clsx from 'clsx';

import {
  getDocAnchor,
  openDocAnchor,
  resolveDocTarget,
} from './docsRegistry';

interface HelpLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /**
   * Identifier of the documentation anchor to open. Must match a registered
   * anchor id.
   */
  anchor: string;
  /**
   * Visible label for the link. Defaults to “What’s this?”.
   */
  children?: React.ReactNode;
}

const DEFAULT_LABEL = "What's this?";

const announceFor = (anchorId: string) => {
  const entry = getDocAnchor(anchorId) ?? resolveDocTarget(anchorId);
  if (!entry) {
    return {
      name: `${DEFAULT_LABEL} Open documentation viewer`,
      hint: 'Opens documentation viewer in a side panel.',
      target: anchorId,
    };
  }

  const hint = entry.srHint ?? entry.description;
  const name = `${DEFAULT_LABEL} Learn about ${entry.title} in Docs Viewer`;
  return {
    name,
    hint:
      hint ?? `Opens the Docs Viewer to ${entry.title}.`,
    target: entry.target,
  };
};

const HelpLink = React.forwardRef<HTMLAnchorElement, HelpLinkProps>(
  ({ anchor, className, children, onClick, onKeyDown, ...props }, ref) => {
    const srId = useId();
    const { name, hint, target } = announceFor(anchor);

    const follow = () => {
      openDocAnchor(target);
    };

    const handleClick: React.MouseEventHandler<HTMLAnchorElement> = event => {
      event.preventDefault();
      follow();
      onClick?.(event);
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLAnchorElement> = event => {
      if (event.key === ' ' || event.key === 'Spacebar' || event.key === 'Space') {
        event.preventDefault();
        follow();
      }
      onKeyDown?.(event);
    };

    const href = `#docs/${encodeURIComponent(target)}`;

    return (
      <a
        {...props}
        ref={ref}
        href={href}
        data-docs-target={target}
        className={clsx(
          'ml-2 text-sm text-ubt-grey underline decoration-dotted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 hover:text-white',
          className,
        )}
        aria-label={name}
        aria-describedby={srId}
        aria-controls="docs-viewer"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {children ?? DEFAULT_LABEL}
        <span id={srId} className="sr-only">
          {hint}
        </span>
      </a>
    );
  },
);

HelpLink.displayName = 'HelpLink';

export default HelpLink;

