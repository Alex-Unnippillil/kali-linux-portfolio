import type { ReactNode } from 'react';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { act, renderHook } from '@testing-library/react';
import {
  SettingsProvider,
  selectGameQuality,
  useGameSettingsActions,
  useGameSettingsSelector,
} from '../components/apps/GameSettingsContext';

describe('game settings selectors', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('selector does not rerender on unrelated updates', () => {
    let qualityRenders = 0;

    const QualityConsumer = () => {
      useGameSettingsSelector(selectGameQuality);
      qualityRenders += 1;
      return null;
    };

    const ContrastToggle = () => {
      const { setHighContrast } = useGameSettingsActions();
      return (
        <button type="button" onClick={() => setHighContrast(true)}>
          toggle contrast
        </button>
      );
    };

    render(
      <SettingsProvider>
        <QualityConsumer />
        <ContrastToggle />
      </SettingsProvider>,
    );

    const initial = qualityRenders;
    act(() => {
      fireEvent.click(screen.getByText('toggle contrast'));
    });

    expect(qualityRenders).toBe(initial);
  });

  test('actions reference remains stable', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SettingsProvider>{children}</SettingsProvider>
    );

    const { result } = renderHook(() => useGameSettingsActions(), { wrapper });
    const initialActions = result.current;

    act(() => {
      result.current.setDifficulty('hard');
    });

    expect(result.current).toBe(initialActions);
  });
});
