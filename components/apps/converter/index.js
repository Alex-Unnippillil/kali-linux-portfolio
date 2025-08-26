import React from 'react';
import UnitConverter from './UnitConverter';
import CurrencyConverter from './CurrencyConverter';
import usePersistentState from '../../../hooks/usePersistentState';

const Converter = () => {
  const [activeTab, setActiveTab] = usePersistentState('converter-tab', 'unit');

  return (
    <div className="h-full w-full p-4 overflow-y-auto bg-ub-cool-grey text-white">
      <div className="mb-4 flex gap-2 border-b border-gray-600">
        <button
          className={
            'px-3 py-1 rounded-t ' +
            (activeTab === 'unit'
              ? 'bg-gray-700'
              : 'bg-gray-600 text-gray-300')
          }
          onClick={() => setActiveTab('unit')}
        >
          Units
        </button>
        <button
          className={
            'px-3 py-1 rounded-t ' +
            (activeTab === 'currency'
              ? 'bg-gray-700'
              : 'bg-gray-600 text-gray-300')
          }
          onClick={() => setActiveTab('currency')}
        >
          Currency
        </button>
      </div>
      {activeTab === 'currency' ? <CurrencyConverter /> : <UnitConverter />}
    </div>
  );
};

export default Converter;

export const displayConverter = () => <Converter />;

