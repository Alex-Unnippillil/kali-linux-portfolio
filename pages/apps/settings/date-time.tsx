import ToggleSwitch from '../../../components/ToggleSwitch';
import { useSettings } from '../../../hooks/useSettings';

export default function DateTimeSettings() {
  const { networkTime, setNetworkTime } = useSettings();
  const tooltip = `Network Time Protocol (NTP) keeps your clock in sync using chrony.\nCommands:\n  sudo apt install chrony\n  sudo systemctl enable --now chrony`;
  return (
    <div className="p-4 text-ubt-grey">
      <h1 className="text-xl mb-4">Date &amp; Time</h1>
      <div className="flex items-center gap-2 mb-4">
        <span>Use network time (NTP)</span>
        <ToggleSwitch
          checked={networkTime}
          onChange={setNetworkTime}
          ariaLabel="use-network-time"
        />
        <span className="cursor-help" title={tooltip} aria-label="NTP info">ℹ️</span>
      </div>
      <textarea
        readOnly
        value={`sudo apt install chrony\nsudo systemctl enable --now chrony`}
        className="w-full bg-ub-cool-grey text-ubt-grey p-2 rounded"
      />
    </div>
  );
}
