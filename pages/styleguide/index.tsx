import React from 'react';
import ColorSwatch from '../../components/ui/ColorSwatch';
import ContrastChecker from '../../components/ui/ContrastChecker';

const pairs = [
  { fg: '#000000', bg: '#ffffff', label: 'Black on White' },
  { fg: '#333333', bg: '#ffffff', label: 'Dark Gray on White' },
  { fg: '#555555', bg: '#ffffff', label: 'Gray on White' },
  { fg: '#ffffff', bg: '#1E3A8A', label: 'White on Indigo' },
];

export default function Styleguide() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Color Contrast Swatches</h1>
      <p className="mb-6">Examples of color pairs with their WCAG contrast levels.</p>
      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        {pairs.map((p) => (
          <ColorSwatch key={p.label} {...p} />
        ))}
      </div>
      <ContrastChecker />
    </div>
  );
}
