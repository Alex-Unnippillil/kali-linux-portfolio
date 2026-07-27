import React from 'react';
import { spoofingJsonLd } from '../pages/spoofing';

describe('Spoofing structured data', () => {
  it('exports DefinedTerm and BreadcrumbList JSON-LD', () => {
    const [term, breadcrumb] = spoofingJsonLd;
    expect(term['@type']).toBe('DefinedTerm');
    expect(breadcrumb['@type']).toBe('BreadcrumbList');
  });
});
