import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Clock from './clock'
import { useClockPreferences } from '../../hooks/useClockPreferences'

const BUTTON_BASE_CLASSES =
    'group flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-left text-sm font-medium text-white shadow-sm transition-colors duration-200 hover:border-white/20 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900'

const BUTTON_MINIMAL_CLASSES =
    'group flex items-center gap-1 rounded px-0 py-0 text-right text-sm font-semibold text-white/80 transition-colors duration-150 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-0'

const PREFS_TITLE = 'Clock preferences'

const ClockPreferencesButton = ({
    variant = 'minimal',
    clockProps = { onlyTime: true },
    align = 'right'
}) => {
    const { hour12, timeZone, locale, setHour12, setTimeZone, timeZoneOptions } = useClockPreferences()
    const [isOpen, setIsOpen] = useState(false)
    const [canUsePortal, setCanUsePortal] = useState(false)
    const buttonRef = useRef(null)
    const popoverRef = useRef(null)
    const popoverId = useId()
    const hour12Id = `${popoverId}-format-12`
    const hour24Id = `${popoverId}-format-24`
    const timeZoneSelectId = `${popoverId}-timezone`

    useEffect(() => {
        if (typeof window === 'undefined') return undefined
        setCanUsePortal(true)
        return undefined
    }, [])

    useEffect(() => {
        if (!isOpen) return undefined
        const handleClickOutside = (event) => {
            if (popoverRef.current?.contains(event.target)) return
            if (buttonRef.current?.contains(event.target)) return
            setIsOpen(false)
        }
        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false)
                buttonRef.current?.focus({ preventScroll: true })
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('touchstart', handleClickOutside)
        document.addEventListener('keydown', handleEscape)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('touchstart', handleClickOutside)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return undefined
        const { current } = popoverRef
        current?.focus({ preventScroll: true })
        return undefined
    }, [isOpen])

    const handleToggle = () => {
        setIsOpen((prev) => !prev)
    }

    const handleHourFormatChange = (event) => {
        setHour12(event.target.value)
    }

    const handleTimeZoneChange = (event) => {
        setTimeZone(event.target.value)
    }

    const popoverPosition = useMemo(() => {
        if (!isOpen || typeof window === 'undefined') return {}
        const button = buttonRef.current
        if (!button) return {}
        const rect = button.getBoundingClientRect()
        const width = 280
        const margin = 12
        const top = rect.bottom + margin
        const left = align === 'left' ? rect.left : rect.right - width
        return {
            position: 'fixed',
            top,
            left: Math.max(margin, left),
            width,
            zIndex: 60
        }
    }, [align, isOpen])

    const popover = (
        <div
            ref={popoverRef}
            role="dialog"
            aria-modal="false"
            tabIndex={-1}
            aria-label={PREFS_TITLE}
            id={popoverId}
            className="fixed rounded-2xl border border-white/10 bg-slate-950/95 p-4 text-sm text-white shadow-2xl ring-1 ring-cyan-300/20 backdrop-blur-2xl"
            style={popoverPosition}
        >
            <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/80">{PREFS_TITLE}</h2>
            <div className="mt-3 space-y-4">
                <fieldset className="space-y-2">
                    <legend className="text-[0.65rem] uppercase tracking-[0.2em] text-white/60">Hour format</legend>
                    <div className="flex items-center gap-2 text-sm text-white/90">
                        <input
                            id={hour12Id}
                            type="radio"
                            name={`${popoverId}-clock-hour-format`}
                            value="12"
                            checked={hour12 === true}
                            onChange={handleHourFormatChange}
                            aria-label="12-hour format"
                            className="h-3.5 w-3.5 rounded-full border-white/40 bg-slate-900 text-cyan-400 focus:ring-cyan-300"
                        />
                        <label htmlFor={hour12Id} className="cursor-pointer">
                            12-hour (AM/PM)
                        </label>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/90">
                        <input
                            id={hour24Id}
                            type="radio"
                            name={`${popoverId}-clock-hour-format`}
                            value="24"
                            checked={hour12 === false}
                            onChange={handleHourFormatChange}
                            aria-label="24-hour format"
                            className="h-3.5 w-3.5 rounded-full border-white/40 bg-slate-900 text-cyan-400 focus:ring-cyan-300"
                        />
                        <label htmlFor={hour24Id} className="cursor-pointer">
                            24-hour
                        </label>
                    </div>
                </fieldset>
                <label className="flex flex-col gap-2 text-sm text-white/90" htmlFor={timeZoneSelectId}>
                    <span className="text-[0.65rem] uppercase tracking-[0.2em] text-white/60">Time zone</span>
                    <select
                        id={timeZoneSelectId}
                        value={timeZone}
                        onChange={handleTimeZoneChange}
                        className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                    >
                        {timeZoneOptions.map((zone) => (
                            <option key={zone} value={zone}>
                                {zone}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
        </div>
    )

    const buttonClassName = variant === 'minimal' ? BUTTON_MINIMAL_CLASSES : BUTTON_BASE_CLASSES

    const renderedPopover = isOpen
        ? canUsePortal && typeof document !== 'undefined'
            ? createPortal(popover, document.body)
            : popover
        : null

    return (
        <div className="relative inline-flex items-center" suppressHydrationWarning>
            <button
                type="button"
                ref={buttonRef}
                onClick={handleToggle}
                className={buttonClassName}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                aria-controls={popoverId}
            >
                <Clock {...clockProps} hour12={hour12} timeZone={timeZone} locale={locale} variant={variant} />
            </button>
            {renderedPopover}
        </div>
    )
}

export default ClockPreferencesButton
