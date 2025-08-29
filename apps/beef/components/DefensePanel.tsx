import React from 'react';

export default function DefensePanel() {
  return (
    <div className="p-3 mb-4 text-xs bg-ub-warm-grey bg-opacity-40 rounded">
      <h3 className="text-sm font-bold mb-2">Browser Defenses</h3>
      <p className="mb-2">
        Modern browsers enforce <strong>Content Security Policy (CSP)</strong> to restrict
        the sources a page may load resources from. A simple policy might look like:
      </p>
      <pre className="bg-black text-white p-2 mb-2 overflow-x-auto">
        <code>{`Content-Security-Policy: default-src 'self'; script-src 'nonce-r4nd0m'`}</code>
      </pre>
      <p className="mb-2">
        This header allows scripts only from the current origin that include the correct nonce,
        blocking injected or third-party code. Learn more on{' '}
        <a
          href="https://developer.mozilla.org/docs/Web/HTTP/CSP"
          target="_blank"
          rel="noreferrer"
          className="text-ubt-blue underline"
        >
          MDN
        </a>
        .
      </p>
      <p className="mb-2">
        Browsers also offer mitigations like the <code>sandbox</code> attribute on iframes
        and <code>SameSite</code> cookies to reduce cross-site attacks. Example sandbox usage:
      </p>
      <pre className="bg-black text-white p-2 mb-2 overflow-x-auto">
        <code>{`<iframe sandbox="allow-scripts"></iframe>`}</code>
      </pre>
      <p>
        More details:
        {' '}
        <a
          href="https://developer.mozilla.org/docs/Web/HTML/Element/iframe#attr-sandbox"
          target="_blank"
          rel="noreferrer"
          className="text-ubt-blue underline"
        >
          iframe sandboxing
        </a>
        {' | '}
        <a
          href="https://developer.mozilla.org/docs/Web/HTTP/Headers/Set-Cookie#samesite"
          target="_blank"
          rel="noreferrer"
          className="text-ubt-blue underline"
        >
          SameSite cookies
        </a>
        .
      </p>
    </div>
  );
}

