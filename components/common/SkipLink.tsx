import React from "react";
import clsx from "clsx";

export interface SkipLinkProps extends React.ComponentPropsWithoutRef<"a"> {
  /**
   * Element id to focus when the skip link is activated.
   * Falls back to the first `<main>` element if not found.
   */
  targetId?: string;
}

const focusElement = (element: HTMLElement | null) => {
  if (!element) return;

  const hadTabIndex = element.hasAttribute("tabindex");
  if (!hadTabIndex) {
    element.setAttribute("tabindex", "-1");
  }

  const removeTemporaryTabIndex = () => {
    if (!hadTabIndex) {
      element.removeAttribute("tabindex");
    }
    element.removeEventListener("blur", removeTemporaryTabIndex);
    element.removeEventListener("focusout", removeTemporaryTabIndex);
  };

  element.addEventListener("blur", removeTemporaryTabIndex);
  element.addEventListener("focusout", removeTemporaryTabIndex);

  try {
    element.focus();
  } catch {
    // noop: focus is best effort and may throw in unsupported environments
  }
};

const SkipLink = React.forwardRef<HTMLAnchorElement, SkipLinkProps>(
  (
    {
      targetId = "main-content",
      className,
      children = "Skip to main content",
      onClick,
      ...props
    },
    ref,
  ) => {
    const handleActivate = React.useCallback<React.MouseEventHandler<HTMLAnchorElement>>(
      (event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;

        const ownerDocument = event.currentTarget.ownerDocument ?? document;
        const target = ownerDocument.getElementById(targetId) ?? ownerDocument.querySelector<HTMLElement>("main");
        if (!target) return;

        event.preventDefault();
        focusElement(target);
      },
      [onClick, targetId],
    );

    return (
      <a
        ref={ref}
        href={`#${targetId}`}
        className={clsx(
          "skip-link sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:shadow-lg focus:outline-none",
          className,
        )}
        onClick={handleActivate}
        {...props}
      >
        {children}
      </a>
    );
  },
);

SkipLink.displayName = "SkipLink";

export default SkipLink;
