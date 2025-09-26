import { fireEvent, render, screen } from '@testing-library/react';
import QuickSearchOverlay from '../components/common/QuickSearchOverlay';
import { QuickSearchIndex } from '../lib/quickSearch';

describe('QuickSearchOverlay', () => {
  const index: QuickSearchIndex = {
    apps: [
      {
        id: 'app:terminal',
        type: 'app',
        title: 'Terminal',
        description: 'Simulated shell environment.',
        keywords: ['terminal'],
        appId: 'terminal',
        icon: '/icons/terminal.svg',
      },
    ],
    files: [
      {
        id: 'file:resume',
        type: 'file',
        title: 'Resume.pdf',
        description: 'Download the project resume.',
        keywords: ['resume'],
        path: '/resume.pdf',
      },
    ],
    settings: [
      {
        id: 'setting:haptics',
        type: 'setting',
        title: 'Toggle haptics',
        description: 'Enable or disable vibration feedback.',
        keywords: ['haptics'],
        section: 'system',
        settingId: 'haptics',
      },
    ],
  };

  it('navigates results with keyboard and triggers handlers', () => {
    const openApp = jest.fn();
    const openFile = jest.fn();
    const openSetting = jest.fn();
    const onClose = jest.fn();

    render(
      <QuickSearchOverlay
        open
        onClose={onClose}
        openApp={openApp}
        openFile={openFile}
        openSetting={openSetting}
        index={index}
      />,
    );

    const input = screen.getByPlaceholderText('Search apps, files, and settings');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(openFile).toHaveBeenCalledWith(index.files[0]);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(openSetting).toHaveBeenCalledWith(index.settings[0]);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('filters results by query', () => {
    const { rerender } = render(
      <QuickSearchOverlay
        open
        onClose={jest.fn()}
        openApp={jest.fn()}
        openFile={jest.fn()}
        openSetting={jest.fn()}
        index={index}
      />,
    );

    const input = screen.getByPlaceholderText('Search apps, files, and settings');
    fireEvent.change(input, { target: { value: 'haptics' } });

    expect(screen.queryByText('Applications')).not.toBeInTheDocument();
    expect(screen.getByText('Toggle haptics')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'nope' } });
    expect(screen.getByText('No matching results')).toBeInTheDocument();

    rerender(
      <QuickSearchOverlay
        open={false}
        onClose={jest.fn()}
        openApp={jest.fn()}
        openFile={jest.fn()}
        openSetting={jest.fn()}
        index={index}
      />,
    );
  });

  it('closes on escape', () => {
    const onClose = jest.fn();
    render(
      <QuickSearchOverlay
        open
        onClose={onClose}
        openApp={jest.fn()}
        openFile={jest.fn()}
        openSetting={jest.fn()}
        index={index}
      />,
    );

    const input = screen.getByPlaceholderText('Search apps, files, and settings');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
