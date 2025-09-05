import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

const INITIAL_DEVICES = [
  { id: 1, name: 'Headphones', connected: false },
  { id: 2, name: 'Keyboard', connected: false },
  { id: 3, name: 'Mouse', connected: false },
];

export default function Bluetooth() {
  const [devices, setDevices] = useState(INITIAL_DEVICES);
  const [showList, setShowList] = useState(false);
  const [menu, setMenu] = useState({ visible: false, x: 0, y: 0, device: null });
  const listRef = useRef(null);

  const connected = devices.filter((d) => d.connected);

  const toggleList = () => setShowList((s) => !s);

  const handleContextMenu = (e, device) => {
    e.preventDefault();
    setMenu({ visible: true, x: e.clientX, y: e.clientY, device });
  };

  const updateDevice = (id, changes) => {
    setDevices((prev) =>
      prev
        .map((d) => (d.id === id ? { ...d, ...changes } : d))
        .filter(Boolean)
    );
  };

  const handleAction = (action) => {
    const device = menu.device;
    if (!device) return;
    if (action === 'connect') updateDevice(device.id, { connected: true });
    if (action === 'disconnect') updateDevice(device.id, { connected: false });
    if (action === 'remove') setDevices((prev) => prev.filter((d) => d.id !== device.id));
    setMenu({ visible: false, x: 0, y: 0, device: null });
  };

  useEffect(() => {
    const closeMenu = () => setMenu((m) => ({ ...m, visible: false }));
    if (menu.visible) document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, [menu.visible]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (listRef.current && !listRef.current.contains(e.target)) {
        setShowList(false);
      }
    };
    if (showList) document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showList]);

  return (
    <span className="mx-1.5 relative inline-block">
      <span
        className="cursor-pointer"
        onClick={toggleList}
        title={
          connected.length
            ? `Connected: ${connected.map((d) => d.name).join(', ')}`
            : 'Bluetooth: Off'
        }
      >
        <Image
          width={16}
          height={16}
          src="/themes/Yaru/status/bluetooth-symbolic.svg"
          alt="bluetooth"
          className="inline status-symbol w-4 h-4"
          sizes="16px"
        />
      </span>
      {showList && (
        <ul
          ref={listRef}
          className="absolute right-0 mt-1 w-40 rounded bg-gray-800 text-sm text-white shadow-lg z-50"
        >
          {devices.map((d) => (
            <li
              key={d.id}
              onContextMenu={(e) => handleContextMenu(e, d)}
              className="flex justify-between px-2 py-1 hover:bg-gray-700"
            >
              <span>{d.name}</span>
              <span className="text-xs">
                {d.connected ? 'Connected' : 'Disconnected'}
              </span>
            </li>
          ))}
          {!devices.length && (
            <li className="px-2 py-1 text-center text-xs text-gray-400">No devices</li>
          )}
        </ul>
      )}
      {menu.visible && menu.device && (
        <div
          className="fixed z-50 w-40 rounded bg-gray-800 text-white shadow-md"
          style={{ top: menu.y, left: menu.x }}
        >
          {!menu.device.connected && (
            <button
              className="block w-full px-2 py-1 text-left hover:bg-gray-700"
              onClick={() => handleAction('connect')}
            >
              Connect
            </button>
          )}
          {menu.device.connected && (
            <button
              className="block w-full px-2 py-1 text-left hover:bg-gray-700"
              onClick={() => handleAction('disconnect')}
            >
              Disconnect
            </button>
          )}
          <button
            className="block w-full px-2 py-1 text-left hover:bg-gray-700"
            onClick={() => handleAction('remove')}
          >
            Remove
          </button>
        </div>
      )}
    </span>
  );
}

