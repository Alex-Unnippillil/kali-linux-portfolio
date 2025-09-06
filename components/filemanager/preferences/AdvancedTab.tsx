import Link from 'next/link';
import { ChangeEvent } from 'react';

interface Props {
  handleDeviceEvents: boolean;
  setHandleDeviceEvents: (value: boolean) => void;
}

export default function AdvancedTab({ handleDeviceEvents, setHandleDeviceEvents }: Props) {
  const onToggle = (e: ChangeEvent<HTMLInputElement>) => {
    setHandleDeviceEvents(e.target.checked);
  };

  const checkboxId = 'enable-volume-management';

  return (
    <div className="flex flex-col gap-4 text-white">
      <div className="inline-flex items-center gap-2">
        <input
          id={checkboxId}
          type="checkbox"
          checked={handleDeviceEvents}
          onChange={onToggle}
          aria-label="Enable Volume Management"
        />
        <label htmlFor={checkboxId}>Enable Volume Management</label>
      </div>
      <Link href="/apps/settings/removable-media" className="text-sky-400 underline">
        Configure…
      </Link>
    </div>
  );
}
