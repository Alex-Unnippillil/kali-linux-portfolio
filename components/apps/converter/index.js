import React from 'react';
import UnitConverter from './UnitConverter';
import CurrencyConverter from './CurrencyConverter';

const Converter = () => {
  return (
    <div className="h-full w-full p-4 overflow-y-auto bg-panel text-white">
      <div className="grid gap-4 md:grid-cols-2">
        <UnitConverter />
        <CurrencyConverter />
      </div>
    </div>
  );
};

export default Converter;

export const displayConverter = () => <Converter />;

