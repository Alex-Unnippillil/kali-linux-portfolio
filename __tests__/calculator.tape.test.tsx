import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import Tape, { TapeEntry } from '../apps/calculator/components/Tape';

describe('Calculator Tape', () => {
  beforeEach(() => {
    document.body.innerHTML = '<input id="display" />';
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    window.localStorage.clear();
  });

  it('recalls result to display', () => {
    const entry: TapeEntry = { id: 'entry-1', expr: '1+1', result: '2' };
    const { getByLabelText } = render(
      <Tape entries={[entry]} />,
    );
    fireEvent.click(getByLabelText('recall result'));
    const display = document.getElementById('display') as HTMLInputElement;
    expect(display.value).toBe('2');
  });

  it('copies result to clipboard', async () => {
    const entry: TapeEntry = { id: 'entry-1', expr: '1+1', result: '2' };
    const { getByLabelText } = render(
      <Tape entries={[entry]} />,
    );
    fireEvent.click(getByLabelText('copy result'));
    await waitFor(() =>
      expect((navigator.clipboard as any).writeText).toHaveBeenCalledWith('2'),
    );
  });

  it('persists pinned entries across renders', async () => {
    const entry: TapeEntry = { id: 'entry-1', expr: '4*4', result: '16' };
    const { getByLabelText, rerender } = render(<Tape entries={[entry]} />);

    const pinButton = getByLabelText('pin entry');
    fireEvent.click(pinButton);

    await waitFor(() =>
      expect(window.localStorage.getItem('calc-pins')).toContain('entry-1'),
    );
    expect(pinButton).toHaveAttribute('aria-pressed', 'true');

    rerender(<Tape entries={[entry]} />);

    const persistedButton = getByLabelText('unpin entry');
    expect(persistedButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('clears history and pinned state', async () => {
    const entry: TapeEntry = { id: 'entry-1', expr: '5+7', result: '12' };
    const onClear = jest.fn();

    function Wrapper() {
      const [entries, setEntries] = React.useState([entry]);
      const handleClear = () => {
        onClear();
        setEntries([]);
      };
      return <Tape entries={entries} onClearHistory={handleClear} />;
    }

    const { getByLabelText } = render(<Wrapper />);

    const pinButton = getByLabelText('pin entry');
    fireEvent.click(pinButton);

    await waitFor(() =>
      expect(window.localStorage.getItem('calc-pins')).toContain('entry-1'),
    );

    fireEvent.click(getByLabelText('clear history'));

    await waitFor(() => expect(onClear).toHaveBeenCalled());
    await waitFor(() =>
      expect(window.localStorage.getItem('calc-pins')).toBe('[]'),
    );
  });
});
