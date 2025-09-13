import React from 'react'
import { render, screen, act } from '@testing-library/react'
import BootingScreen, { bootLines } from '../components/screen/booting_screen'

describe('BootingScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('reveals boot lines over time when visible', () => {
    render(<BootingScreen visible={true} isShutDown={false} turnOn={() => {}} />)

    const container = screen.getByTestId('boot-lines')
    expect(container.textContent).toBe('')

    act(() => {
      jest.advanceTimersByTime(250)
    })
    expect(container.textContent).toBe(bootLines[0])

    act(() => {
      jest.advanceTimersByTime(250)
    })
    expect(container.textContent).toBe(bootLines.slice(0, 2).join('\n'))
  })
})

