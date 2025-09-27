import createSuspenseAppPage from '../../utils/createSuspenseAppPage';

export default createSuspenseAppPage(() => import('../../apps/volatility'), {
  appName: 'Volatility Lab',
});
