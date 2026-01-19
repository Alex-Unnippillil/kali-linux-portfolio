import React from 'react';
import UnitConverter from './UnitConverter';
import CurrencyConverter from './CurrencyConverter';
import TemperatureConverter from './TemperatureConverter';
import Base64Converter from './Base64Converter';
import HashConverter from './HashConverter';
import usePersistentState from '../../../hooks/usePersistentState';

const tabs = [
  { id: 'unit', label: 'Unit', component: <UnitConverter /> },
  { id: 'currency', label: 'Currency', component: <CurrencyConverter /> },
  { id: 'temperature', label: 'Temperature', component: <TemperatureConverter /> },
  { id: 'base64', label: 'Base64', component: <Base64Converter /> },
  { id: 'hash', label: 'Hash', component: <HashConverter /> },
];

const Converter = () => {
  const [tab, setTab] = usePersistentState('converter-tab', 'unit');

  return (
    <div className="converter-container h-full w-full p-4 overflow-y-auto bg-ub-cool-grey text-white">
      <div className="flex mb-4 border-b border-gray-600">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`px-4 py-2 ${tab === t.id ? 'border-b-2 border-white' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.find((t) => t.id === tab)?.component}
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
