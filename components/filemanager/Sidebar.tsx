import { useContext, useState } from 'react';
import { NotificationsContext } from '../common/NotificationCenter';

interface Device {
  id: string;
  name: string;
}

const initialDevices: Device[] = [
  { id: 'usb-a', name: 'USB Drive A' },
  { id: 'usb-b', name: 'USB Drive B' },
];

export default function Sidebar() {
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const notifications = useContext(NotificationsContext);

  const eject = (device: Device) => {
    setDevices(prev => prev.filter(d => d.id !== device.id));
    notifications?.pushNotification('File Manager', `${device.name} ejected`);
  };

  const safelyRemove = (device: Device) => {
    notifications?.pushNotification('File Manager', `${device.name} safely removed`);
  };

  return (
    <aside>
      <section className="mb-4">
        <h3 className="mb-2 font-bold">Devices</h3>
        <ul>
          {devices.map(d => (
            <li key={d.id} className="flex items-center justify-between mb-1">
              <span>{d.name}</span>
              <div className="space-x-2">
                <button
                  className="text-blue-500 underline"
                  onClick={() => eject(d)}
                >
                  Eject
                </button>
                <button
                  className="text-blue-500 underline"
                  onClick={() => safelyRemove(d)}
                >
                  Safely Remove
                </button>
              </div>
            </li>
          ))}
          {devices.length === 0 && (
            <li className="text-gray-500">No devices</li>
          )}
        </ul>
      </section>
    </aside>
  );
}

