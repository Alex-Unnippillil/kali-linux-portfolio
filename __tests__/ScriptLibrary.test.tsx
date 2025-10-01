import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScriptLibrary, {
  type NmapScriptMeta,
} from '../components/apps/nmap-nse/ScriptLibrary';

const scripts: NmapScriptMeta[] = [
  {
    name: 'http-title',
    description: 'Fetches page titles from HTTP services.',
    tags: ['discovery', 'http'],
    categories: ['discovery', 'http'],
  },
  {
    name: 'ftp-anon',
    description: 'Checks for anonymous FTP access.',
    tags: ['ftp', 'auth'],
    categories: ['auth', 'ftp'],
  },
  {
    name: 'ssl-cert',
    description: 'Retrieves TLS certificate information.',
    tags: ['discovery', 'ssl'],
    categories: ['discovery', 'ssl'],
  },
];

const renderLibrary = () =>
  render(
    <ScriptLibrary
      scripts={scripts}
      selectedScripts={[]}
      onToggleScript={jest.fn()}
      onActiveScriptChange={jest.fn()}
      activeScript={null}
      scriptOptions={{}}
      onScriptOptionChange={jest.fn()}
    />
  );

const renderControlledLibrary = () => {
  const Wrapper: React.FC = () => {
    const [active, setActive] = React.useState<string | null>(null);
    return (
      <ScriptLibrary
        scripts={scripts}
        selectedScripts={[]}
        onToggleScript={jest.fn()}
        onActiveScriptChange={setActive}
        activeScript={active}
        scriptOptions={{}}
        onScriptOptionChange={jest.fn()}
      />
    );
  };
  return render(<Wrapper />);
};

describe('ScriptLibrary', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('filters scripts by search query', async () => {
    renderLibrary();
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/search scripts/i), 'ftp');
    expect(screen.getByRole('button', { name: 'ftp-anon' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'http-title' })
    ).not.toBeInTheDocument();
  });

  it('persists favorite selections', async () => {
    const user = userEvent.setup();
    const { unmount } = renderLibrary();
    const [toggle] = screen.getAllByLabelText(/toggle favorite for http-title/i);
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    unmount();
    renderLibrary();
    expect(
      screen.getAllByLabelText(/toggle favorite for http-title/i)[0]
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows script detail drawer with documentation link', async () => {
    renderControlledLibrary();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'http-title' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent(/Fetches page titles/i);
    const docLink = within(dialog).getByRole('link', { name: /view documentation/i });
    expect(docLink).toHaveAttribute(
      'href',
      'https://nmap.org/nsedoc/scripts/http-title.html'
    );
  });
});
