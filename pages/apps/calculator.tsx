import dynamic from 'next/dynamic';

const Calculator = dynamic(() => import('../../apps/calculator'), { ssr: false });

export default function CalculatorPage() {
  return <Calculator />;
}

