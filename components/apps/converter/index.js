import React from 'react';
import UnitConverter from './UnitConverter';
import CurrencyConverter from './CurrencyConverter';

const Converter = () => (
  <div className="h-full w-full p-4 overflow-y-auto bg-ub-cool-grey text-white">
    <div className="grid gap-4 md:grid-cols-2">
      <UnitConverter />
      <CurrencyConverter />
    </div>
  </div>
);

const displayConverter = () => <Converter />;

export default Converter;
export { displayConverter };

