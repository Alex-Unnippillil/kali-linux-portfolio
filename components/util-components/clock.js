import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
]
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const startOfDay = (date) => {
    const result = new Date(date)
    result.setHours(0, 0, 0, 0)
    return result
}

const isSameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime()

const addDays = (date, amount) => {
    const result = new Date(date)
    result.setDate(result.getDate() + amount)
    return result
}

const addMonths = (date, amount) => {
    const result = new Date(date)
    result.setMonth(result.getMonth() + amount)
    return result
}

const addYears = (date, amount) => {
    const result = new Date(date)
    result.setFullYear(result.getFullYear() + amount)
    return result
}

const getIsoWeekNumber = (date) => {
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const day = utcDate.getUTCDay() || 7
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day)
    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
    const diff = (utcDate.getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000)
    return Math.floor(diff / 7) + 1
}

const buildCalendar = (viewDate) => {
    const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
    const startOffset = firstOfMonth.getDay()
    const firstVisibleDate = addDays(firstOfMonth, -startOffset)
    const lastOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0)

    let currentWeekStartDate = firstVisibleDate

    while (true) {
        const days = []
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
            const date = addDays(currentWeekStartDate, dayIndex)
            days.push({
                date,
                inCurrentMonth: date.getMonth() === viewDate.getMonth()
            })
        }
        weeks.push({
            weekNumber: getIsoWeekNumber(days[3].date),
            days
        })

        currentWeekStartDate = addDays(currentWeekStartDate, 7)
        if (currentWeekStartDate > lastOfMonth || weeks.length >= 6) {
            break
        }
    }
    return weeks
}

const usePrefersReducedMotion = () => {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return undefined
        const media = window.matchMedia('(prefers-reduced-motion: reduce)')
        const update = () => setPrefersReducedMotion(media.matches)
        update()
        if (media.addEventListener) {
            media.addEventListener('change', update)
        } else {
            media.addListener(update)
        }
        return () => {
            if (media.removeEventListener) {
                media.removeEventListener('change', update)
            } else {
                media.removeListener(update)
            }
        }
    }, [])

    return prefersReducedMotion
}

const formatDisplayTime = ({ currentTime, onlyDay, onlyTime, timeFormatter }) => {
    if (!currentTime) return ''
    const day = DAYS[currentTime.getDay()]
    const month = MONTHS[currentTime.getMonth()]
    const date = currentTime.getDate()
    const timeString = timeFormatter.format(currentTime)

    if (onlyTime) {
        return timeString
    }

    const dayString = `${day} ${month} ${date}`

    if (onlyDay) {
        return dayString
    }

    return `${dayString} ${timeString}`
}

const Clock = ({
    onlyDay = false,
    onlyTime = false,
    showCalendar = false,
    hour12 = true,
    variant = 'default'
}) => {
    const [currentTime, setCurrentTime] = useState(null)
    const [isOpen, setIsOpen] = useState(false)
    const [viewDate, setViewDate] = useState(() => new Date())
    const [focusedDate, setFocusedDate] = useState(() => new Date())
    const prefersReducedMotion = usePrefersReducedMotion()
    const buttonRef = useRef(null)
    const popoverRef = useRef(null)
    const activeCellRef = useRef(null)
    const previouslyOpenRef = useRef(false)
    const headingId = useId()
    const popoverId = `${headingId}-popover`
    const [canUsePortal, setCanUsePortal] = useState(false)
    const [popoverStyles, setPopoverStyles] = useState({})

    useEffect(() => {
        const update = () => setCurrentTime(new Date())
        update()
        let worker
        let interval
        if (typeof window !== 'undefined' && typeof Worker === 'function') {
            worker = new Worker(new URL('../../workers/timer.worker.ts', import.meta.url))
            worker.onmessage = update
            worker.postMessage({ action: 'start', interval: 10 * 1000 })
        } else {
            interval = setInterval(update, 10 * 1000)
        }
        return () => {
            if (worker) {
                worker.postMessage({ action: 'stop' })
                worker.terminate()
            }
            if (interval) clearInterval(interval)
        }
    }, [])

    useEffect(() => {
        if (!isOpen || !currentTime) return
        setViewDate(new Date(currentTime.getFullYear(), currentTime.getMonth(), 1))
        setFocusedDate(currentTime)
    }, [isOpen, currentTime])

    useEffect(() => {
        if (!isOpen) return undefined
        const handleClick = (event) => {
            if (popoverRef.current?.contains(event.target)) return
            if (buttonRef.current?.contains(event.target)) return
            setIsOpen(false)
        }
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false)
                if (buttonRef.current) {
                    buttonRef.current.focus({ preventScroll: prefersReducedMotion })
                }
            }
        }
        document.addEventListener('mousedown', handleClick)
        document.addEventListener('touchstart', handleClick)
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('mousedown', handleClick)
            document.removeEventListener('touchstart', handleClick)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, prefersReducedMotion])

    useEffect(() => {
        if (!isOpen) return
        if (activeCellRef.current) {
            activeCellRef.current.focus({ preventScroll: prefersReducedMotion })
        }
    }, [isOpen, viewDate, focusedDate, prefersReducedMotion])

    useEffect(() => {
        if (previouslyOpenRef.current && !isOpen && buttonRef.current) {
            buttonRef.current.focus({ preventScroll: prefersReducedMotion })
        }
        previouslyOpenRef.current = isOpen
    }, [isOpen, prefersReducedMotion])

    useEffect(() => {
        if (typeof window === 'undefined') return undefined
        setCanUsePortal(true)
        return undefined
    }, [])

    useEffect(() => {
        if (!isOpen) {
            setPopoverStyles({})
            return undefined
        }
        if (typeof window === 'undefined') {
            return undefined
        }
        const margin = 12

        const updatePosition = () => {
            const button = buttonRef.current
            const popover = popoverRef.current
            if (!button || !popover) return

            const buttonRect = button.getBoundingClientRect()
            const popoverRect = popover.getBoundingClientRect()

            const viewportWidth = window.innerWidth
            const viewportHeight = window.innerHeight

            let top = buttonRect.bottom + margin
            let left = buttonRect.right - popoverRect.width

            const horizontalMargin = margin
            if (left < horizontalMargin) {
                left = horizontalMargin
            }
            if (left + popoverRect.width > viewportWidth - horizontalMargin) {
                left = Math.max(horizontalMargin, viewportWidth - horizontalMargin - popoverRect.width)
            }

            if (top + popoverRect.height > viewportHeight - margin) {
                const aboveTop = buttonRect.top - margin - popoverRect.height
                if (aboveTop >= margin) {
                    top = aboveTop
                } else {
                    top = Math.max(margin, viewportHeight - margin - popoverRect.height)
                }
            }

            setPopoverStyles({
                position: 'fixed',
                top,
                left,
                zIndex: 60
            })
        }

        const animationFrame = window.requestAnimationFrame(updatePosition)
        window.addEventListener('resize', updatePosition)
        window.addEventListener('scroll', updatePosition, true)

        return () => {
            window.cancelAnimationFrame(animationFrame)
            window.removeEventListener('resize', updatePosition)
            window.removeEventListener('scroll', updatePosition, true)
        }
    }, [isOpen, viewDate, focusedDate])

    const headingFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat(undefined, {
                month: 'long',
                year: 'numeric'
            }),
        []
    )

    const headingLabel = useMemo(() => headingFormatter.format(viewDate), [headingFormatter, viewDate])

    const weeks = useMemo(() => (isOpen ? buildCalendar(viewDate) : []), [isOpen, viewDate])

    const friendlyDateFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
            }),
        []
    )

    const friendlyTimeFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                hour12
            }),
        [hour12]
    )

    const timeFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                hour12
            }),
        [hour12]
    )

    const handleToggle = useCallback(() => {
        setIsOpen((open) => !open)
    }, [])

    const handleClose = useCallback(() => {
        setIsOpen(false)
    }, [])

    const handleMonthChange = useCallback((offset) => {
        setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
    }, [])

    const handleToday = useCallback(() => {
        if (!currentTime) return
        const today = new Date(currentTime)
        setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))
        setFocusedDate(today)
    }, [currentTime])

    const handleDayKeyDown = useCallback((event, date) => {
        let nextDate = null
        switch (event.key) {
            case 'ArrowRight':
                nextDate = addDays(date, 1)
                break
            case 'ArrowLeft':
                nextDate = addDays(date, -1)
                break
            case 'ArrowDown':
                nextDate = addDays(date, 7)
                break
            case 'ArrowUp':
                nextDate = addDays(date, -7)
                break
            case 'Home':
                nextDate = addDays(date, -date.getDay())
                break
            case 'End':
                nextDate = addDays(date, 6 - date.getDay())
                break
            case 'PageUp':
                nextDate = event.shiftKey ? addYears(date, -1) : addMonths(date, -1)
                break
            case 'PageDown':
                nextDate = event.shiftKey ? addYears(date, 1) : addMonths(date, 1)
                break
            case 'Enter':
            case ' ': // modern browsers use a single space
            case 'Spacebar': { // fallback for older browsers
                event.preventDefault()
                setIsOpen(false)
                if (buttonRef.current) {
                    buttonRef.current.focus({ preventScroll: prefersReducedMotion })
                }
                return
            }
            default:
                return
        }
        if (nextDate) {
            event.preventDefault()
            setFocusedDate(nextDate)
            if (nextDate.getMonth() !== viewDate.getMonth() || nextDate.getFullYear() !== viewDate.getFullYear()) {
                setViewDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1))
            }
        }
    }, [prefersReducedMotion, viewDate])

    const handleDayClick = useCallback(() => {
        setIsOpen(false)
    }, [])

    const displayTime = useMemo(
        () =>
            formatDisplayTime({
                currentTime,
                onlyDay,
                onlyTime,
                timeFormatter
            }),
        [currentTime, onlyDay, onlyTime, timeFormatter]
    )

    const friendlyDateLabel = useMemo(() => (currentTime ? friendlyDateFormatter.format(currentTime) : ''), [currentTime, friendlyDateFormatter])

    const friendlyTimeLabel = useMemo(() => (currentTime ? friendlyTimeFormatter.format(currentTime) : ''), [currentTime, friendlyTimeFormatter])

    const popoverStyle = isOpen
        ? {
            ...popoverStyles,
            visibility: typeof popoverStyles.top === 'number' ? 'visible' : 'hidden'
        }
        : popoverStyles

    const popoverNode = (
        <div
            ref={popoverRef}
            id={popoverId}
            role="dialog"
            aria-modal="false"
            aria-label="Calendar"
            className="fixed z-50 w-[20rem] origin-top-right overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/95 via-slate-950/90 to-slate-950/95 p-4 text-sm text-white shadow-2xl ring-1 ring-cyan-300/20 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200"
            style={popoverStyle}
        >
            <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-3 py-2 shadow-inner">
                <div className="flex flex-col" aria-live="polite" id={headingId}>
                    <span className="text-[0.65rem] uppercase tracking-[0.22em] text-cyan-200/70">{friendlyDateLabel}</span>
                    <span className="text-base font-semibold tracking-tight text-white">{headingLabel}</span>
                    <span className="text-xs font-medium tracking-tight text-white/60">{friendlyTimeLabel}</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => handleMonthChange(-1)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-900/60 text-lg text-white/80 transition-colors hover:border-white/30 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                        aria-label="Previous month"
                    >
                        ‹
                    </button>
                    <button
                        type="button"
                        onClick={() => handleMonthChange(1)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-900/60 text-lg text-white/80 transition-colors hover:border-white/30 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                        aria-label="Next month"
                    >
                        ›
                    </button>
                </div>
            </div>
            <table
                role="grid"
                aria-labelledby={headingId}
                className="w-full border-collapse text-center"
            >
                <thead>
                    <tr role="row">
                        <th scope="col" className="w-12 pb-2 text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-white/30" aria-label="Week">
                            Wk
                        </th>
                        {DAYS.map((day) => (
                            <th key={day} scope="col" className="pb-2 text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-white/60">
                                {day}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {weeks.map((week) => (
                        <tr key={`week-${week.days[0].date.toISOString()}`} role="row">
                            <th scope="row" className="py-1 text-[0.65rem] font-semibold text-white/35" aria-label={`Week ${week.weekNumber}`}>
                                {week.weekNumber}
                            </th>
                            {week.days.map(({ date, inCurrentMonth }) => {
                                const isToday = currentTime && isSameDay(date, currentTime)
                                const isFocused = isSameDay(date, focusedDate)
                                return (
                                    <td
                                        key={date.toISOString()}
                                        role="gridcell"
                                        aria-selected={isFocused}
                                        className="p-1"
                                    >
                                        <button
                                            type="button"
                                            onClick={handleDayClick}
                                            onKeyDown={(event) => handleDayKeyDown(event, date)}
                                            className={`flex h-9 w-9 items-center justify-center rounded-2xl text-sm font-medium transition duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${inCurrentMonth ? 'text-white' : 'text-white/35'
                                                } ${isToday
                                                    ? 'bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 text-slate-950 shadow-lg ring-1 ring-white/60'
                                                    : isFocused
                                                        ? 'bg-white/20 text-white shadow-inner'
                                                        : 'hover:bg-white/10'
                                                }`}
                                            tabIndex={isFocused ? 0 : -1}
                                            ref={isFocused ? activeCellRef : null}
                                        >
                                            {date.getDate()}
                                        </button>
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="mt-4 flex items-center justify-between">
                <button
                    type="button"
                    onClick={handleToday}
                    className="rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 px-4 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-slate-950 shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                >
                    Today
                </button>
                <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-full border border-white/20 px-3 py-1.5 text-[0.65rem] font-medium uppercase tracking-[0.3em] text-white/70 transition hover:border-white/40 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                    Close
                </button>
            </div>
        </div>
    )

    if (!currentTime) {
        return <span suppressHydrationWarning></span>
    }

    const shouldRenderButton = showCalendar || (!onlyDay && !onlyTime)

    if (!shouldRenderButton) {
        return <span suppressHydrationWarning>{displayTime}</span>
    }

    const isMinimal = variant === 'minimal'

    const buttonClassName = isMinimal
        ? 'group flex items-center gap-1 rounded px-0 py-0 text-right text-sm font-semibold text-white/80 transition-colors duration-150 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-0'
        : 'group flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-left text-sm font-medium text-white shadow-sm transition-colors duration-200 hover:border-white/20 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900'

    const textClassName = isMinimal
        ? 'font-mono text-sm md:text-base tracking-tight'
        : 'truncate text-xs md:text-sm tracking-tight'

    return (
        <div className={`relative inline-flex items-center ${isMinimal ? 'justify-end' : ''}`} suppressHydrationWarning>
            <button
                type="button"
                ref={buttonRef}
                onClick={handleToggle}
                className={buttonClassName}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                aria-controls={popoverId}
            >
                <span className={textClassName} aria-live="polite">
                    {displayTime}
                </span>
                {showCalendar && !isMinimal ? (
                    <span
                        aria-hidden
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500/80 text-[0.6rem] font-semibold text-slate-950 shadow ring-1 ring-white/40 transition-transform duration-200 group-hover:scale-105"
                    >
                        ☰
                    </span>
                ) : null}
            </button>
            {isOpen
                ? canUsePortal && typeof document !== 'undefined'
                    ? createPortal(popoverNode, document.body)
                    : popoverNode
                : null}
        </div>
    )
}

export default Clock
