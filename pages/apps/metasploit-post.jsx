import createSuspenseAppPage from '../../utils/createSuspenseAppPage';

export default createSuspenseAppPage(() => import('../../apps/metasploit-post'), {
  appName: 'Metasploit Post',
});
