import Ubuntu from '../components/ubuntu';
import Meta from '../components/SEO/Meta';
import InstallButton from '../components/InstallButton';
import MockTerminal from '../components/MockTerminal';

/**
 * @returns {JSX.Element}
 */
const App = () => (
  <>
    <Meta />
    <Ubuntu />
    <InstallButton />
    <div className="p-4">
      <MockTerminal />
    </div>
  </>
);

export default App;
