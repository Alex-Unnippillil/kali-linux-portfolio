import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MyDocument from '../pages/_document';

jest.mock('next/document', () => ({
  __esModule: true,
  default: require('react').Component,
  Html: 'html',
  Head: 'head',
  Main: 'main',
  NextScript: function ScriptsMock() { return null; },
}));

test('the HTML identifies the public build revision without relying on Next internal IDs', () => {
  const original = process.env.NEXT_PUBLIC_BUILD_ID;
  try {
    process.env.NEXT_PUBLIC_BUILD_ID = 'a'.repeat(40);
    expect(renderToStaticMarkup(<MyDocument />)).toContain('name="kali-build-revision" content="' + 'a'.repeat(40) + '"');
    delete process.env.NEXT_PUBLIC_BUILD_ID;
    expect(renderToStaticMarkup(<MyDocument />)).toContain('name="kali-build-revision" content="development"');
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_BUILD_ID;
    else process.env.NEXT_PUBLIC_BUILD_ID = original;
  }
});
