'use client';
import { useEffect, useState } from 'react';
import { convertUnit, unitMap } from '../../components/apps/converter/unitData';
import FormulaExplanation from './components/FormulaExplanation';

const currencyRates: Record<string, number> = {
  USD: 1,
  EUR: 0.9,
  GBP: 0.8,
  JPY: 110,
};

const categoryUnits: Record<string, string[]> = {
  length: Object.keys(unitMap.length),
  mass: Object.keys(unitMap.mass),
  temperature: Object.keys(unitMap.temperature),
  currency: Object.keys(currencyRates),
};

function convert(
  category: string,
  from: string,
  to: string,
  value: number,
): number {
  if (category === 'currency') {
    return (value / currencyRates[from]) * currencyRates[to];
  }
  return convertUnit(category as any, from as any, to as any, value);
}

export default function Converter() {
  const categories = Object.keys(categoryUnits);
  const [category, setCategory] = useState('length');
  const [fromUnit, setFromUnit] = useState(categoryUnits.length[0]);
  const [toUnit, setToUnit] = useState(categoryUnits.length[1]);
  const [fromValue, setFromValue] = useState('');
  const [toValue, setToValue] = useState('');
  const [precision, setPrecision] = useState(2);
  const [sigFig, setSigFig] = useState(false);
  const [explanation, setExplanation] = useState<{
    category: string;
    from: string;
    to: string;
    input: number;
    output: number;
  } | null>(null);
  const [favourites, setFavourites] = useState<string[]>([]);

  // load favourites
  useEffect(() => {
    try {
      const stored = localStorage.getItem('converter-favourites');
      if (stored) setFavourites(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  // persist favourites
  useEffect(() => {
    try {
      localStorage.setItem('converter-favourites', JSON.stringify(favourites));
    } catch {
      // ignore
    }
  }, [favourites]);

  const units = categoryUnits[category];

  const format = (num: number) =>
    sigFig ? Number(num).toPrecision(precision) : Number(num).toFixed(precision);

  const convertFrom = (val: string) => {
    setFromValue(val);
    const n = parseFloat(val);
    if (isNaN(n)) {
      setToValue('');
      setExplanation(null);
      return;
    }
    const converted = convert(category, fromUnit, toUnit, n);
    setToValue(format(converted));
    setExplanation({
      category,
      from: fromUnit,
      to: toUnit,
      input: n,
      output: converted,
    });
  };

  const convertTo = (val: string) => {
    setToValue(val);
    const n = parseFloat(val);
    if (isNaN(n)) {
      setFromValue('');
      setExplanation(null);
      return;
    }
    const converted = convert(category, toUnit, fromUnit, n);
    setFromValue(format(converted));
    setExplanation({
      category,
      from: toUnit,
      to: fromUnit,
      input: n,
      output: converted,
    });
  };

  // Recalculate when units or precision change
  useEffect(() => {
    if (fromValue !== '') {
      convertFrom(fromValue);
    } else if (toValue !== '') {
      convertTo(toValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, fromUnit, toUnit, precision, sigFig]);

  const swap = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    setFromValue(toValue);
    setToValue(fromValue);
  };

  const saveFavourite = () => {
    if (!fromValue || !toValue) return;
    const fav = `${fromValue} ${fromUnit} = ${toValue} ${toUnit}`;
    setFavourites((prev) => [...prev, fav]);
  };

  const applyFavourite = (fav: string) => {
    const match = fav.match(/([\d.eE+-]+) (\w+) = ([\d.eE+-]+) (\w+)/);
    if (!match) return;
    const [, fv, fu, tv, tu] = match;
    const cat = categories.find((c) =>
      categoryUnits[c].includes(fu) && categoryUnits[c].includes(tu),
    );
    if (!cat) return;
    setCategory(cat);
    setFromUnit(fu);
    setToUnit(tu);
    setFromValue(fv);
    setToValue(tv);
  };

  useEffect(() => {
    const units = categoryUnits[category];
    if (!units.includes(fromUnit)) setFromUnit(units[0]);
    if (!units.includes(toUnit)) setToUnit(units[1] || units[0]);
    setFromValue('');
    setToValue('');
    setExplanation(null);
  }, [category]);

  return (
    <div className="converter-container h-full w-full p-4 overflow-y-auto bg-ub-cool-grey text-white">
      <h2 className="text-xl mb-2">Converter</h2>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="ml-2 text-black p-1 rounded"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="ml-4 flex items-center gap-1">
          <span>Precision: {precision}</span>
          <input
            type="range"
            min="0"
            max="10"
            value={precision}
            onChange={(e) => setPrecision(parseInt(e.target.value))}
          />
        </label>
        <label className="ml-4 flex items-center gap-1">
          <input
            type="checkbox"
            checked={sigFig}
            onChange={(e) => setSigFig(e.target.checked)}
          />
          Sig figs
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <input
            type="number"
            value={fromValue}
            onChange={(e) => convertFrom(e.target.value)}
            className="text-black p-1 rounded"
            aria-label="from value"
          />
          <select
            value={fromUnit}
            onChange={(e) => setFromUnit(e.target.value)}
            className="text-black p-1 rounded mt-2"
          >
            {units.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <input
            type="number"
            value={toValue}
            onChange={(e) => convertTo(e.target.value)}
            className="text-black p-1 rounded"
            aria-label="to value"
          />
          <select
            value={toUnit}
            onChange={(e) => setToUnit(e.target.value)}
            className="text-black p-1 rounded mt-2"
          >
            {units.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-center gap-2 mt-4">
        <button onClick={swap} className="bg-gray-600 px-2 py-1 rounded">
          Swap
        </button>
        <button onClick={saveFavourite} className="bg-gray-600 px-2 py-1 rounded">
          Save
        </button>
      </div>
      {explanation && (
        <FormulaExplanation
          category={explanation.category}
          from={explanation.from}
          to={explanation.to}
          input={explanation.input}
          output={explanation.output}
          precision={precision}
          sigFig={sigFig}
        />
      )}
      <div className="mt-6">
        <h3 className="text-lg mb-2">Favourites</h3>
        {favourites.length === 0 ? (
          <div>No favourites yet</div>
        ) : (
          <ul className="list-disc list-inside space-y-1">
            {favourites.map((f, i) => (
              <li key={i}>
                <button
                  className="underline"
                  onClick={() => applyFavourite(f)}
                >
                  {f}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
