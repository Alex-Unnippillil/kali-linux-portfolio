import createSuspenseAppPage from '../../utils/createSuspenseAppPage';

export default createSuspenseAppPage(() => import('../../apps/blackjack'), {
  appName: 'Blackjack',
});
