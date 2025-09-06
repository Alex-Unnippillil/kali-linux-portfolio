import { render, screen, fireEvent } from '@testing-library/react';
import PropertiesDialog from '../components/ui/PropertiesDialog';
import { getDefaultApp } from '../utils/mimeDefaults';

describe('PropertiesDialog Open With', () => {
  test('sets default application for MIME type', () => {
    const item = { name: 'doc.txt', kind: 'file', type: 'text/plain', handle: { move: jest.fn() } };
    render(<PropertiesDialog item={item} onClose={() => {}} />);
    fireEvent.change(screen.getByTestId('open-with-input'), { target: { value: 'TextEdit' } });
    fireEvent.click(screen.getByText('Save'));
    expect(getDefaultApp('text/plain')).toBe('TextEdit');
  });
});
