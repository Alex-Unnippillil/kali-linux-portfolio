export const ouiDatabase = {
  '00:11:22': 'Test Vendor',
  'AA:BB:CC': 'Another Vendor',
};

export const lookupVendor = (mac) => {
  if (!mac) return 'Unknown';
  const prefix = mac.toUpperCase().slice(0, 8);
  return ouiDatabase[prefix] || 'Unknown';
};

export const getNetworkAlerts = (prev, curr, threshold = 20) => {
  const alerts = [];
  const prevMap = Object.fromEntries(prev.map((n) => [n.ssid, n]));
  curr.forEach((n) => {
    if (!prevMap[n.ssid]) {
      alerts.push({ type: 'new', ssid: n.ssid });
    } else {
      const delta = n.strength - prevMap[n.ssid].strength;
      if (Math.abs(delta) >= threshold) {
        alerts.push({ type: 'strength', ssid: n.ssid, delta });
      }
    }
  });
  return alerts;
};
