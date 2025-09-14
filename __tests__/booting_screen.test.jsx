import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import BootingScreen from '../components/screen/booting_screen';

describe('BootingScreen', () => {
    it('triggers turnOn on user interaction when shut down', () => {
        const turnOn = jest.fn();
        render(<BootingScreen visible={false} isShutDown turnOn={turnOn} />);
        fireEvent.keyDown(window, { key: 'Enter' });
        fireEvent.click(window);
        expect(turnOn).toHaveBeenCalledTimes(2);
    });
});

