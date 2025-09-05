'use client';

import { useEffect, useState } from 'react';
import Tabs from '../../../components/Tabs';

const tabs = [
  { id: 'general', label: 'General' },
  { id: 'wifi', label: 'Wi-Fi' },
  { id: 'security', label: 'Security' },
  { id: 'ipv4', label: 'IPv4' },
  { id: 'ipv6', label: 'IPv6' },
];

const emptyConn = {
  id: null,
  name: '',
  ssid: '',
  security: 'none',
  password: '',
  ipv4: { method: 'auto', address: '', netmask: '', gateway: '' },
  ipv6: { method: 'auto', address: '', prefix: '', gateway: '' },
};

export default function NetworkConnections() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [form, setForm] = useState(emptyConn);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/network/connections');
        if (res.ok) {
          const data = await res.json();
          setConnections(data.connections || []);
        }
      } catch (err) {
        console.error('Failed to load connections', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const saveAll = async (list) => {
    setConnections(list);
    try {
      await fetch('/api/network/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connections: list }),
      });
    } catch (err) {
      console.error('Failed to save', err);
    }
  };

  const openAdd = () => {
    setForm({ ...emptyConn, id: Date.now() });
    setErrors({});
    setActiveTab('general');
    setDialogOpen(true);
  };
  const openEdit = (conn) => {
    setForm(JSON.parse(JSON.stringify(conn)));
    setErrors({});
    setActiveTab('general');
    setDialogOpen(true);
  };

  const closeDialog = () => setDialogOpen(false);

  const validate = (c) => {
    const e = {};
    if (!c.name.trim()) e.name = 'Name required';
    if (!c.ssid.trim()) e.ssid = 'SSID required';
    if (c.security !== 'none' && !c.password) e.password = 'Password required';
    if (c.ipv4.method === 'manual') {
      if (!c.ipv4.address) e.ipv4_address = 'Address required';
      if (!c.ipv4.netmask) e.ipv4_netmask = 'Netmask required';
    }
    if (c.ipv6.method === 'manual') {
      if (!c.ipv6.address) e.ipv6_address = 'Address required';
      if (!c.ipv6.prefix) e.ipv6_prefix = 'Prefix required';
    }
    return e;
  };

  const handleSave = async () => {
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    const idx = connections.findIndex((c) => c.id === form.id);
    const list = idx === -1
      ? [...connections, form]
      : connections.map((c) => (c.id === form.id ? form : c));
    await saveAll(list);
    setDialogOpen(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this connection?')) return;
    const list = connections.filter((c) => c.id !== id);
    await saveAll(list);
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-2">
            <label className="block text-sm">
              Connection name
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded bg-gray-700 p-2"
              />
            </label>
            {errors.name && <p className="text-red-400 text-sm">{errors.name}</p>}
          </div>
        );
      case 'wifi':
        return (
          <div className="space-y-2">
            <label className="block text-sm">
              SSID
              <input
                type="text"
                value={form.ssid}
                onChange={(e) => setForm({ ...form, ssid: e.target.value })}
                className="mt-1 w-full rounded bg-gray-700 p-2"
              />
            </label>
            {errors.ssid && <p className="text-red-400 text-sm">{errors.ssid}</p>}
          </div>
        );
      case 'security':
        return (
          <div className="space-y-2">
            <label className="block text-sm">
              Security
              <select
                value={form.security}
                onChange={(e) => setForm({ ...form, security: e.target.value })}
                className="mt-1 w-full rounded bg-gray-700 p-2"
              >
                <option value="none">None</option>
                <option value="wpa2">WPA/WPA2 Personal</option>
              </select>
            </label>
            {form.security !== 'none' && (
              <label className="block text-sm">
                Password
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="mt-1 w-full rounded bg-gray-700 p-2"
                />
              </label>
            )}
            {errors.password && <p className="text-red-400 text-sm">{errors.password}</p>}
          </div>
        );
      case 'ipv4':
        return (
          <div className="space-y-2">
            <label className="block text-sm">
              Method
              <select
                value={form.ipv4.method}
                onChange={(e) =>
                  setForm({ ...form, ipv4: { ...form.ipv4, method: e.target.value } })
                }
                className="mt-1 w-full rounded bg-gray-700 p-2"
              >
                <option value="auto">Automatic (DHCP)</option>
                <option value="manual">Manual</option>
              </select>
            </label>
            {form.ipv4.method === 'manual' && (
              <>
                <label className="block text-sm">
                  Address
                  <input
                    type="text"
                    value={form.ipv4.address}
                    onChange={(e) =>
                      setForm({ ...form, ipv4: { ...form.ipv4, address: e.target.value } })
                    }
                    className="mt-1 w-full rounded bg-gray-700 p-2"
                  />
                </label>
                <label className="block text-sm">
                  Netmask
                  <input
                    type="text"
                    value={form.ipv4.netmask}
                    onChange={(e) =>
                      setForm({ ...form, ipv4: { ...form.ipv4, netmask: e.target.value } })
                    }
                    className="mt-1 w-full rounded bg-gray-700 p-2"
                  />
                </label>
                <label className="block text-sm">
                  Gateway
                  <input
                    type="text"
                    value={form.ipv4.gateway}
                    onChange={(e) =>
                      setForm({ ...form, ipv4: { ...form.ipv4, gateway: e.target.value } })
                    }
                    className="mt-1 w-full rounded bg-gray-700 p-2"
                  />
                </label>
              </>
            )}
            {(errors.ipv4_address || errors.ipv4_netmask) && (
              <p className="text-red-400 text-sm">
                {errors.ipv4_address || errors.ipv4_netmask}
              </p>
            )}
          </div>
        );
      case 'ipv6':
        return (
          <div className="space-y-2">
            <label className="block text-sm">
              Method
              <select
                value={form.ipv6.method}
                onChange={(e) =>
                  setForm({ ...form, ipv6: { ...form.ipv6, method: e.target.value } })
                }
                className="mt-1 w-full rounded bg-gray-700 p-2"
              >
                <option value="auto">Automatic</option>
                <option value="manual">Manual</option>
              </select>
            </label>
            {form.ipv6.method === 'manual' && (
              <>
                <label className="block text-sm">
                  Address
                  <input
                    type="text"
                    value={form.ipv6.address}
                    onChange={(e) =>
                      setForm({ ...form, ipv6: { ...form.ipv6, address: e.target.value } })
                    }
                    className="mt-1 w-full rounded bg-gray-700 p-2"
                  />
                </label>
                <label className="block text-sm">
                  Prefix
                  <input
                    type="text"
                    value={form.ipv6.prefix}
                    onChange={(e) =>
                      setForm({ ...form, ipv6: { ...form.ipv6, prefix: e.target.value } })
                    }
                    className="mt-1 w-full rounded bg-gray-700 p-2"
                  />
                </label>
                <label className="block text-sm">
                  Gateway
                  <input
                    type="text"
                    value={form.ipv6.gateway}
                    onChange={(e) =>
                      setForm({ ...form, ipv6: { ...form.ipv6, gateway: e.target.value } })
                    }
                    className="mt-1 w-full rounded bg-gray-700 p-2"
                  />
                </label>
              </>
            )}
            {errors.ipv6_address && (
              <p className="text-red-400 text-sm">{errors.ipv6_address}</p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen overflow-auto">
      <h1 className="text-2xl mb-4">Network Connections</h1>
      <button
        onClick={openAdd}
        className="mb-4 rounded bg-ub-orange px-4 py-2 text-white"
      >
        Add Connection
      </button>
      {loading ? (
        <p>Loading...</p>
      ) : connections.length === 0 ? (
        <p className="text-sm text-gray-400">No connections saved.</p>
      ) : (
        <ul className="space-y-2">
          {connections.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded border border-gray-700 p-2"
            >
              <div>
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-gray-400">{c.ssid}</div>
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => openEdit(c)}
                  className="px-2 py-1 rounded bg-blue-600 text-white"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="px-2 py-1 rounded bg-red-600 text-white"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl rounded bg-gray-800 p-4">
            <h2 className="mb-4 text-xl">
              {connections.some((c) => c.id === form.id) ? 'Edit' : 'Add'} Connection
            </h2>
            <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} className="mb-4" />
            <div>{renderTab()}</div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                type="button"
                onClick={closeDialog}
                className="rounded bg-gray-600 px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded bg-ub-orange px-4 py-2 text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
