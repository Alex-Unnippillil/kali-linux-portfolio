import 'react';

declare module 'react-dom';

declare module 'react' {
  interface IframeHTMLAttributes<T> extends React.HTMLAttributes<T> {
    /**
     * Content Security Policy for the iframe.
     * https://developer.mozilla.org/docs/Web/HTML/Element/iframe#attr-csp
     */
    csp?: string;
  }
}
