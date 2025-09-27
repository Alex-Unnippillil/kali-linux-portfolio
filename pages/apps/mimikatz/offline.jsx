import createSuspenseAppPage from '../../../utils/createSuspenseAppPage';

export default createSuspenseAppPage(
  () => import('../../../apps/mimikatz/offline'),
  {
    appName: 'Mimikatz Offline',
  },
);
