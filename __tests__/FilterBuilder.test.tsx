import React from 'react';
import { render, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterBuilder from '../apps/wireshark/components/FilterBuilder';
import WiresharkApp from '../components/apps/wireshark';

const originalWorker = global.Worker;

beforeAll(() => {
  if (!originalWorker) {
    (global as any).Worker = class {
      public onmessage: ((event: MessageEvent) => void) | null = null;
      // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
      postMessage() {}
      // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
      terminate() {}
    };
  }
});

afterAll(() => {
  if (!originalWorker) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (global as any).Worker;
  } else {
    global.Worker = originalWorker;
  }
});

describe('FilterBuilder', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('narrows suggestions based on debounced input', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
    });
    render(<FilterBuilder value="" onChange={onChange} />);

    const input = screen.getByPlaceholderText(/quick search/i);
    await user.click(input);
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(screen.getByTestId('suggestion-field-ip.addr')).toBeInTheDocument();

    await user.type(input, 'udp');
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(screen.getByTestId('suggestion-field-udp.port')).toBeInTheDocument();
    expect(
      screen.queryByTestId('suggestion-field-tcp.port')
    ).not.toBeInTheDocument();
  });

  it('allows keyboard selection of suggestions', async () => {
    const onChange = jest.fn();
    const onApply = jest.fn();
    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
    });
    render(
      <FilterBuilder value="" onChange={onChange} onApply={onApply} />
    );

    const input = screen.getByPlaceholderText(/quick search/i);
    await user.click(input);
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    await user.type(input, 'tcp');
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');

    expect(onApply).toHaveBeenCalledWith('tcp');
    expect(onChange).toHaveBeenCalledWith('tcp');
  });

  it('applies filters without remounting the builder', async () => {
    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
    });
    const packets = [
      { timestamp: '1', src: '1.1.1.1', dest: '2.2.2.2', protocol: 6, info: 'tcp packet' },
      { timestamp: '2', src: '3.3.3.3', dest: '4.4.4.4', protocol: 17, info: 'udp packet' },
    ];

    render(<WiresharkApp initialPackets={packets} />);

    const builder = screen.getByTestId('filter-builder');
    const input = within(builder).getByPlaceholderText(/quick search/i);

    await user.click(input);
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    await user.type(input, 'udp');
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');

    expect(screen.getByText('udp packet')).toBeInTheDocument();
    expect(screen.queryByText('tcp packet')).not.toBeInTheDocument();
    expect(screen.getByTestId('filter-builder')).toBe(builder);
  });
});
