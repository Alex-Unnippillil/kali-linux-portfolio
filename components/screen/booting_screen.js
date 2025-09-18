import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'

const GRID_COLUMNS = 2

const PowerIcon = ({ className }) => (
    <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M12 2.25v9.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
        />
        <path
            d="M7.05 4.74a8.25 8.25 0 1010.4 0"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
        />
    </svg>
)

const RestartIcon = ({ className }) => (
    <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M20 4v6h-6"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M20 10a8 8 0 11-2.35-5.65L20 6"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
)

const LockIcon = ({ className }) => (
    <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <rect
            x="5"
            y="10"
            width="14"
            height="11"
            rx="2.5"
            stroke="currentColor"
            strokeWidth="1.75"
        />
        <path
            d="M8 10V7a4 4 0 118 0v3"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
        />
    </svg>
)

const CancelIcon = ({ className }) => (
    <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M6 6l12 12M18 6l-12 12"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
        />
    </svg>
)

function BootingScreen(props) {
    const [menuActive, setMenuActive] = useState(false)
    const [powerState, setPowerState] = useState('menu')
    const [focusedIndex, setFocusedIndex] = useState(0)
    const optionRefs = useRef([])
    const powerButtonRef = useRef(null)

    const cancelShutdown = props.cancelShutdown || (() => { })
    const lockScreen = props.lockScreen || (() => { })

    const menuOptions = useMemo(() => {
        const options = [
            {
                id: 'power-off',
                label: 'Power Off',
                description: 'Shut down Kali Linux completely.',
                icon: <PowerIcon className="h-7 w-7" />,
                onSelect: () => {
                    setMenuActive(false)
                    setPowerState('poweringDown')
                }
            },
            {
                id: 'restart',
                label: 'Restart',
                description: 'Reboot and return to the desktop.',
                icon: <RestartIcon className="h-7 w-7" />,
                onSelect: () => props.turnOn && props.turnOn()
            },
            props.lockScreen ? {
                id: 'lock',
                label: 'Lock',
                description: 'Lock the current session.',
                icon: <LockIcon className="h-7 w-7" />,
                onSelect: () => {
                    lockScreen()
                    cancelShutdown()
                }
            } : null,
            {
                id: 'cancel',
                label: 'Cancel',
                description: 'Return to the desktop.',
                icon: <CancelIcon className="h-7 w-7" />,
                onSelect: () => cancelShutdown()
            }
        ]

        return options.filter(Boolean)
    }, [cancelShutdown, lockScreen, props.lockScreen, props.turnOn])

    useEffect(() => {
        if (props.isShutDown) {
            setPowerState('menu')
            setFocusedIndex(0)
        }
    }, [props.isShutDown])

    useEffect(() => {
        if (!props.isShutDown) {
            setMenuActive(false)
            return
        }

        setMenuActive(true)
        return () => setMenuActive(false)
    }, [powerState, props.isShutDown])

    useEffect(() => {
        if (props.isShutDown && powerState === 'menu' && optionRefs.current[focusedIndex]) {
            optionRefs.current[focusedIndex].focus()
        }
    }, [focusedIndex, powerState, props.isShutDown])

    useEffect(() => {
        if (powerState === 'poweringDown' && powerButtonRef.current) {
            powerButtonRef.current.focus()
        }
    }, [powerState])

    const handleGridKeyDown = useCallback((event) => {
        if (!props.isShutDown || powerState !== 'menu') return
        const total = menuOptions.length
        if (!total) return

        const handleMove = (newIndex) => {
            const normalized = (newIndex + total) % total
            setFocusedIndex(normalized)
        }

        switch (event.key) {
            case 'ArrowRight':
                event.preventDefault()
                handleMove(focusedIndex + 1)
                break
            case 'ArrowLeft':
                event.preventDefault()
                handleMove(focusedIndex - 1)
                break
            case 'ArrowDown':
                event.preventDefault()
                handleMove(focusedIndex + GRID_COLUMNS)
                break
            case 'ArrowUp':
                event.preventDefault()
                handleMove(focusedIndex - GRID_COLUMNS)
                break
            case 'Home':
                event.preventDefault()
                handleMove(0)
                break
            case 'End':
                event.preventDefault()
                handleMove(total - 1)
                break
            case 'Enter':
            case ' ':
                event.preventDefault()
                if (menuOptions[focusedIndex]) {
                    menuOptions[focusedIndex].onSelect()
                }
                break
            default:
                break
        }
    }, [focusedIndex, menuOptions, powerState, props.isShutDown])

    useEffect(() => {
        if (!props.isShutDown) return
        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                cancelShutdown()
            }
        }
        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [cancelShutdown, props.isShutDown])

    const showOverlay = props.visible || props.isShutDown

    return (
        <div
            style={{
                ...(showOverlay ? { zIndex: '100' } : { zIndex: '-20' }),
                contentVisibility: 'auto',
            }}
            className={(showOverlay ? ' visible opacity-100' : ' invisible opacity-0 ') + ' absolute transition-opacity duration-500 select-none flex flex-col justify-around items-center top-0 right-0 overflow-hidden m-0 p-0 h-screen w-screen bg-black'}
        >
            {!props.isShutDown && (
                <>
                    <Image
                        width={400}
                        height={400}
                        className="md:w-1/4 w-1/2"
                        src="/themes/Yaru/status/cof_orange_hex.svg"
                        alt="Ubuntu Logo"
                        sizes="(max-width: 768px) 50vw, 25vw"
                        priority
                    />
                    <div className="w-10 h-10 flex justify-center items-center rounded-full outline-none">
                        <Image width={40} height={40} className={' w-10 ' + (props.visible ? ' animate-spin ' : '')} src="/themes/Yaru/status/process-working-symbolic.svg" alt="Ubuntu Process Symbol" sizes="40px" priority />
                    </div>
                    <Image
                        width={200}
                        height={100}
                        className="md:w-1/5 w-1/2"
                        src="/themes/Yaru/status/ubuntu_white_hex.svg"
                        alt="Kali Linux Name"
                        sizes="(max-width: 768px) 50vw, 20vw"
                    />
                    <div className="text-white mb-4">
                        <a className="underline" href="https://www.linkedin.com/in/unnippillil/" rel="noopener noreferrer" target="_blank">linkedin</a>
                        <span className="font-bold mx-1">|</span>
                        <a href="https://github.com/Alex-Unnippillil" rel="noopener noreferrer" target="_blank" className="underline">github</a>
                    </div>
                </>
            )}

            {props.isShutDown && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm px-6">
                    {powerState === 'menu' && (
                        <div
                            role="menu"
                            aria-label="Power options"
                            onKeyDown={handleGridKeyDown}
                            className={(menuActive ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none') + ' transform transition-all duration-300 ease-out w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-white shadow-2xl'}
                        >
                            <h2 className="text-2xl font-semibold text-center sm:text-left">Power Options</h2>
                            <p className="mt-2 text-sm text-slate-200 text-center sm:text-left">Select how you want to finish your Kali session.</p>
                            <div className="mt-8 grid gap-4 sm:grid-cols-2" role="none">
                                {menuOptions.map((option, index) => (
                                    <button
                                        key={option.id}
                                        ref={(el) => { optionRefs.current[index] = el }}
                                        type="button"
                                        role="menuitem"
                                        className={(focusedIndex === index ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900 ' : '') + ' flex items-start gap-4 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-5 text-left transition hover:border-blue-400/60 hover:bg-slate-800/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900'}
                                        onClick={option.onSelect}
                                        onFocus={() => setFocusedIndex(index)}
                                    >
                                        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-slate-800 text-blue-300">
                                            {option.icon}
                                        </span>
                                        <span className="flex flex-col">
                                            <span className="text-lg font-semibold">{option.label}</span>
                                            <span className="mt-1 text-sm text-slate-200">{option.description}</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {powerState === 'poweringDown' && (
                        <div className={(menuActive ? 'opacity-100 scale-100' : 'opacity-0 scale-95') + ' transform transition-all duration-300 ease-out flex flex-col items-center text-center text-white'}>
                            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-slate-900/70">
                                <PowerIcon className="h-12 w-12 text-red-400" />
                            </div>
                            <h2 className="mt-6 text-3xl font-semibold">See you soon</h2>
                            <p className="mt-3 max-w-md text-base text-slate-200">Kali Linux has been powered off. Press the button below when you&apos;re ready to boot back up.</p>
                            <button
                                ref={powerButtonRef}
                                type="button"
                                onClick={props.turnOn}
                                className="mt-8 inline-flex items-center gap-3 rounded-full bg-blue-500 px-6 py-3 text-lg font-semibold text-white transition hover:bg-blue-400 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
                            >
                                <PowerIcon className="h-6 w-6" />
                                Power On
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default BootingScreen
