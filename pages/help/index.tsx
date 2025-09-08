import React from 'react';
import HelpCards from '@/components/help/HelpCards';

export default function HelpPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Helpful Commands</h1>
      <HelpCards />
    </div>
  );
}
