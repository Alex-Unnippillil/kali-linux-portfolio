import KismetApp from '../components/apps/kismet';

// This file only type-checks; no runtime assertions
test('onNetworkDiscovered type matches', () => {
  const _ok: Parameters<typeof KismetApp>[0]['onNetworkDiscovered'] = (n) => {
    console.log(n?.bssid);
  };
});
