'use client';

import Terminal from '@/apps/terminal/components/Terminal';
import helpCards from '@/content/help-cards.json';

interface HelpCard {
  title: string;
  description: string;
  commands: string[];
}

export default function HelpCards() {
  const cards = helpCards as HelpCard[];

  return (
    <div className="grid gap-4">
      {cards.map((card) => (
        <div key={card.title} className="border rounded p-4 bg-white text-black dark:bg-gray-800 dark:text-white">
          <h2 className="text-lg font-bold mb-2">{card.title}</h2>
          <p className="mb-2">{card.description}</p>
          <Terminal className="p-2 rounded bg-black text-green-500">
            {card.commands.join('\n')}
          </Terminal>
        </div>
      ))}
    </div>
  );
}
