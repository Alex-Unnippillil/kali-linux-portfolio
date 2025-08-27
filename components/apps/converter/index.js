import React from 'react';
import UnitConverter from './UnitConverter';
import CurrencyConverter from './CurrencyConverter';

const CATEGORY_ICONS = [
  { key: 'length', label: 'Length', icon: '/themes/Yaru/apps/length.svg' },
  { key: 'weight', label: 'Weight', icon: '/themes/Yaru/apps/weight.svg' },
];

const Converter = () => {
  return (
    <div className="h-full w-full p-4 overflow-y-auto bg-ub-cool-grey text-white">
      <div className="flex gap-4 mb-4">
        {CATEGORY_ICONS.map((cat) => (
          <div key={cat.key} className="converter-category">
            <img
              src={cat.icon}
              alt={`${cat.label} icon`}
              className="converter-category-icon"
            />
            <span className="text-sm">{cat.label}</span>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <UnitConverter />
        <CurrencyConverter />
      </div>
    </div>
  );
};

export default Converter;

export const displayConverter = () => <Converter />;

