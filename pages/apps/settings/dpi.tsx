import { useSettings } from '../../../hooks/useSettings';

export default function DpiSettings() {
  const { density, setDensity } = useSettings();
  return (
    <div className="p-4 text-ubt-grey">
      <h1 className="text-xl mb-4">Display</h1>
      <div className="flex items-center gap-2">
        <span>Interface density</span>
        <button
          onClick={() => setDensity(density === 'cozy' ? 'compact' : 'cozy')}
          className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
        >
          {density === 'cozy' ? 'Cozy' : 'Compact'}
        </button>
      </div>
    </div>
  );
}
