import '../../utils/decimal';
import dynamic from 'next/dynamic';
import AppFrame from '../../components/apps/AppFrame';
import { AppLoadingState } from '../../components/apps/AppLoading';

const Calculator = dynamic(() => import('../../apps/calculator'), {
  ssr: false,
  loading: () => (
    <AppLoadingState
      title="Loading calculator"
      description="Bringing the keypad online."
    />
  ),
});

export default function CalculatorPage() {
  return (
    <AppFrame
      title="Calculator"
      icon="/themes/Yaru/apps/calc.svg"
      description="Switch between basic, scientific, and programmer modes with persistent history."
      helpTitle="What this calculator demo covers"
      helpContent={
        <ul className="list-disc space-y-2 pl-4 text-sm text-slate-200">
          <li>All math is evaluated locally through the bundled math.js runtime.</li>
          <li>History and preferences are stored in local storage so you can pick up where you left off.</li>
          <li>No external services are called; it is safe to explore offline.</li>
        </ul>
      }
      shortcuts={[
        { keys: 'Tab', description: 'Move between keypad buttons and input fields' },
        { keys: 'Enter', description: 'Evaluate the current expression' },
      ]}
    >
      <Calculator />
    </AppFrame>
  );
}
