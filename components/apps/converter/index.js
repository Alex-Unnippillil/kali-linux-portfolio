import React from 'react';
import UnitConverter from './UnitConverter';
import CurrencyConverter from './CurrencyConverter';

const Converter = () => (
  <div className="converter-container h-full w-full p-4 overflow-y-auto bg-ub-cool-grey text-white">
    <div className="grid gap-4 converter-grid">
      <UnitConverter />
      <CurrencyConverter />
    </div>
    <style jsx>{`
      .converter-container {
        container-type: inline-size;
      }
      .converter-grid {
        transition: grid-template-columns 0.3s ease;
        grid-template-columns: 1fr;
      }
      @container (min-width: 48rem) {
        .converter-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `}</style>
  </div>
);

const displayConverter = () => <Converter />;

export default Converter;
export { displayConverter };

