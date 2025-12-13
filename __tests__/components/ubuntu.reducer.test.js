import { initialUbuntuState, OS_STATES, osReducer } from '../../components/ubuntu';

describe('Ubuntu OS reducer transitions', () => {
        test('moves from shutdown to booting', () => {
                const shutdownState = { ...initialUbuntuState, osState: OS_STATES.SHUTDOWN };

                const result = osReducer(shutdownState, { type: 'SET_OS_STATE', payload: OS_STATES.BOOTING });

                expect(result.osState).toBe(OS_STATES.BOOTING);
        });

        test('moves from booting to desktop', () => {
                const bootingState = { ...initialUbuntuState, osState: OS_STATES.BOOTING };

                const result = osReducer(bootingState, { type: 'SET_OS_STATE', payload: OS_STATES.DESKTOP });

                expect(result.osState).toBe(OS_STATES.DESKTOP);
        });

        test('moves from desktop to locked', () => {
                const desktopState = { ...initialUbuntuState, osState: OS_STATES.DESKTOP };

                const result = osReducer(desktopState, { type: 'SET_OS_STATE', payload: OS_STATES.LOCKED });

                expect(result.osState).toBe(OS_STATES.LOCKED);
        });
});
