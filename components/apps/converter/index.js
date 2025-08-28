import React, { useState } from 'react';
import UnitConverter from './UnitConverter';
import CurrencyConverter from './CurrencyConverter';

const Converter = () => {
  const [tab, setTab] = useState('units');

  return (
    <div className="converter-container h-full w-full p-4 overflow-y-auto bg-ub-cool-grey text-white">
      <div className="flex mb-4 border-b border-gray-600">
        <button
          className={`px-4 py-2 ${tab === 'units' ? 'border-b-2 border-white' : ''}`}
          onClick={() => setTab('units')}
        >
          Units
        </button>
        <button
          className={`px-4 py-2 ${tab === 'currency' ? 'border-b-2 border-white' : ''}`}
          onClick={() => setTab('currency')}
        >
          Currency
        </button>
      </div>
      {tab === 'units' ? <UnitConverter /> : <CurrencyConverter />}
      <style jsx>{`
        .converter-container {
          container-type: inline-size;
        }
      `}</style>
    </div>
  );
};

const displayConverter = () => <Converter />;

export default Converter;
export { displayConverter };

