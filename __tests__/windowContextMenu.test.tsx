import { Desktop } from '../components/screen/desktop'

jest.mock('react-ga4', () => ({ event: jest.fn(), send: jest.fn() }))

function syncSetState(instance: any) {
    instance.setState = (update: any, callback?: () => void) => {
        const nextState = typeof update === 'function' ? update(instance.state, instance.props) : update
        instance.state = { ...instance.state, ...nextState }
        if (callback) callback()
    }
}

function createDesktop(): any {
    const desktop = new Desktop()
    syncSetState(desktop)
    desktop.props = { snapEnabled: true, clearSession: jest.fn() } as any
    return desktop
}

describe('Desktop window context menu', () => {
    afterEach(() => {
        document.body.innerHTML = ''
        jest.clearAllMocks()
    })

    it('opens window context menu on right click', () => {
        const desktop = createDesktop()
        desktop.showContextMenu = jest.fn()

        const target = document.createElement('div')
        target.dataset.context = 'window'
        target.dataset.appId = 'demo-app'
        document.body.appendChild(target)

        const event = {
            preventDefault: jest.fn(),
            target,
            pageX: 10,
            pageY: 20,
        } as any

        desktop.checkContextMenu(event)

        expect(event.preventDefault).toHaveBeenCalled()
        expect(desktop.state.context_app).toBe('demo-app')
        expect(desktop.showContextMenu).toHaveBeenCalledWith(event, 'window')
    })

    it('opens window context menu via Shift+F10', () => {
        const desktop = createDesktop()
        desktop.showContextMenu = jest.fn()

        const target = document.createElement('div')
        target.dataset.context = 'window'
        target.dataset.appId = 'demo-app'
        target.getBoundingClientRect = () => ({ left: 15, top: 25, height: 30, width: 40, right: 55, bottom: 65 }) as any
        document.body.appendChild(target)

        const event = {
            shiftKey: true,
            key: 'F10',
            preventDefault: jest.fn(),
            target,
        } as any

        desktop.handleContextKey(event)

        expect(event.preventDefault).toHaveBeenCalled()
        expect(desktop.state.context_app).toBe('demo-app')
        const showMenuMock = desktop.showContextMenu as jest.Mock
        expect(showMenuMock).toHaveBeenCalled()
        const [, menuName] = showMenuMock.mock.calls[0]
        expect(menuName).toBe('window')
    })

    it('invokes window helpers for context actions', () => {
        const desktop = createDesktop()
        const windowInstance = {
            changeCursorToMove: jest.fn(),
            focusWindow: jest.fn(),
            minimizeWindow: jest.fn(),
            maximizeWindow: jest.fn(),
            snapWindow: jest.fn(),
            unsnapWindow: jest.fn(),
            closeWindow: jest.fn(),
            state: { maximized: false, snapped: null },
            props: { allowMaximize: true, resizable: true },
        } as any

        desktop.windowRefs['about-alex'] = windowInstance
        desktop.state.context_app = 'about-alex'
        desktop.state.minimized_windows['about-alex'] = false
        desktop.openApp = jest.fn()

        const root = document.createElement('div')
        root.id = 'about-alex'
        root.tabIndex = 0
        root.focus = jest.fn()
        const title = document.createElement('div')
        title.className = 'bg-ub-window-title'
        title.tabIndex = 0
        title.focus = jest.fn()
        root.appendChild(title)
        document.body.appendChild(root)

        desktop.handleWindowMenuAction('move')
        expect(windowInstance.changeCursorToMove).toHaveBeenCalled()
        expect(windowInstance.focusWindow).toHaveBeenCalled()
        expect(title.focus).toHaveBeenCalled()

        windowInstance.focusWindow.mockClear()
        windowInstance.unsnapWindow.mockClear()
        root.focus.mockClear()
        windowInstance.state.snapped = 'left'
        desktop.handleWindowMenuAction('resize')
        expect(windowInstance.unsnapWindow).toHaveBeenCalled()
        expect(windowInstance.focusWindow).toHaveBeenCalled()
        expect(root.focus).toHaveBeenCalled()

        windowInstance.minimizeWindow.mockClear()
        desktop.state.minimized_windows['about-alex'] = false
        desktop.handleWindowMenuAction('minimize')
        expect(windowInstance.minimizeWindow).toHaveBeenCalled()

        windowInstance.minimizeWindow.mockClear()
        desktop.state.minimized_windows['about-alex'] = true
        desktop.handleWindowMenuAction('minimize')
        expect(desktop.openApp).toHaveBeenCalledWith('about-alex')

        desktop.handleWindowMenuAction('maximize')
        expect(windowInstance.maximizeWindow).toHaveBeenCalled()

        windowInstance.snapWindow.mockClear()
        windowInstance.state.snapped = null
        desktop.handleWindowMenuAction('snap-left')
        expect(windowInstance.snapWindow).toHaveBeenCalledWith('left')

        windowInstance.snapWindow.mockClear()
        windowInstance.unsnapWindow.mockClear()
        windowInstance.state.snapped = 'left'
        desktop.handleWindowMenuAction('snap-left')
        expect(windowInstance.unsnapWindow).toHaveBeenCalled()

        windowInstance.unsnapWindow.mockClear()
        windowInstance.snapWindow.mockClear()
        windowInstance.state.snapped = 'right'
        desktop.handleWindowMenuAction('snap-right')
        expect(windowInstance.unsnapWindow).toHaveBeenCalled()

        windowInstance.unsnapWindow.mockClear()
        windowInstance.snapWindow.mockClear()
        windowInstance.state.snapped = null
        desktop.handleWindowMenuAction('snap-right')
        expect(windowInstance.snapWindow).toHaveBeenCalledWith('right')

        desktop.handleWindowMenuAction('close')
        expect(windowInstance.closeWindow).toHaveBeenCalled()
    })
})
