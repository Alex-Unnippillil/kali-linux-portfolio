import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HandshakeDiagram, {
  createDiagramModel,
  handshakeCaptureData,
  type HandshakeCapture,
} from '../apps/reaver/components/HandshakeDiagram';

const capture: HandshakeCapture = handshakeCaptureData;

describe('createDiagramModel', () => {
  it('sorts messages by relative time and frame', () => {
    const model = createDiagramModel(capture);
    const relativeTimes = model.messages.map((message) => message.relativeTime);
    const sorted = [...relativeTimes].sort((a, b) => a - b);
    expect(relativeTimes).toEqual(sorted);
    expect(model.messages).toHaveLength(capture.messages.length);
  });

  it('keeps labels within the diagram bounds', () => {
    const model = createDiagramModel(capture);
    model.messages.forEach((message) => {
      expect(message.labelX).toBeGreaterThanOrEqual(8);
      expect(message.labelX + message.labelWidth).toBeLessThanOrEqual(
        model.width
      );
      expect(message.startX).toBeDefined();
      expect(message.endX).toBeDefined();
    });
  });
});

describe('HandshakeDiagram component', () => {
  it('renders the participants and all handshake steps', () => {
    const { container } = render(<HandshakeDiagram />);

    capture.participants.forEach((participant) => {
      expect(screen.getByText(participant.label)).toBeInTheDocument();
    });

    capture.messages.forEach((message) => {
      expect(screen.getAllByText(message.step).length).toBeGreaterThan(0);
      expect(screen.getByText(message.summary)).toBeInTheDocument();
    });

    expect(
      container.querySelectorAll('[data-testid="handshake-lifeline"]').length
    ).toBe(capture.participants.length);
    expect(
      container.querySelectorAll('[data-testid="handshake-arrow"]').length
    ).toBe(capture.messages.length);

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toMatchSnapshot();
  });

  it('copies step labels to the clipboard', async () => {
    const user = userEvent.setup();
    const writeText = jest.fn().mockResolvedValue(undefined);
    const nav: any = navigator;
    const originalClipboard = nav.clipboard;
    nav.clipboard = { writeText };

    const { getByRole, findByTestId } = render(<HandshakeDiagram />);
    const copyButton = getByRole('button', { name: /Copy M1 label/i });
    await user.click(copyButton);

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('M1'));

    const feedback = await findByTestId('copy-feedback');
    expect(feedback.textContent).toMatch(/copied to clipboard/i);

    nav.clipboard = originalClipboard;
  });
});
