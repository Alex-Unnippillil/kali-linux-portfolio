import { useSettings } from '../../../hooks/useSettings';

export default function WindowManagerTweaks() {
  const { snapThreshold, setSnapThreshold } = useSettings();
  return (
    <div className="flex justify-center my-4 items-center">
      <label htmlFor="snap-threshold" className="mr-2 text-ubt-grey">
        Snap Threshold:
      </label>
      <input
        id="snap-threshold"
        type="range"
        min="0"
        max="200"
        step="5"
        value={snapThreshold}
        onChange={(e) => setSnapThreshold(parseInt(e.target.value, 10))}
        className="ubuntu-slider"
        aria-label="Snap Threshold"
      />
      <span className="ml-2 text-ubt-grey">{snapThreshold}px</span>
    </div>
  );
}
