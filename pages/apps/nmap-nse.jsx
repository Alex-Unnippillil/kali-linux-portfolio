import createSuspenseAppPage from '../../utils/createSuspenseAppPage';

export default createSuspenseAppPage(() => import('../../apps/nmap-nse'), {
  appName: 'Nmap NSE',
});
