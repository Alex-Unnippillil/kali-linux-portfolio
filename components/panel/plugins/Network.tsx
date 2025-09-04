import { useState } from 'react';
import Image from 'next/image';

const SSIDS = ['CoffeeShopWiFi', 'HomeNetwork', 'Airport Free WiFi'];

export default function Network() {
  const [current, setCurrent] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const icon = current
    ? '/themes/Yaru/status/network-wireless-signal-good-symbolic.svg'
    : '/themes/Yaru/status/network-wireless-signal-none-symbolic.svg';

  const tooltip = current ? `Connected to ${current}` : 'Disconnected';

  return (
    <div className="relative">
      <button
        type="button"
        title={tooltip}
        onClick={() => setOpen((prev) => !prev)}
        className="p-1"
      >
        <Image src={icon} alt="Network status" width={16} height={16} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded border bg-white shadow z-10">
          <ul className="py-1">
            {SSIDS.map((ssid) => (
              <li
                key={ssid}
                className="cursor-pointer px-3 py-1 hover:bg-gray-100"
                onClick={() => {
                  setCurrent(ssid);
                  setOpen(false);
                }}
              >
                {ssid}
              </li>
            ))}
            <li
              className="cursor-pointer px-3 py-1 hover:bg-gray-100"
              onClick={() => {
                setCurrent(null);
                setOpen(false);
              }}
            >
              Disconnect
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

