import createSuspenseAppPage from '../../utils/createSuspenseAppPage';

export default createSuspenseAppPage(() => import('../../apps/subnet-calculator'), {
  appName: 'Subnet Calculator',
});
