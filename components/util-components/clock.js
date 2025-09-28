import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
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
    const weeks = []
    for (let weekIndex = 0; weekIndex < 6; weekIndex++) {
        const days = []
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
            const date = addDays(firstVisibleDate, weekIndex * 7 + dayIndex)
            days.push({
                date,
                inCurrentMonth: date.getMonth() === viewDate.getMonth()
            })
        }
        weeks.push({
            weekNumber: getIsoWeekNumber(days[3].date),
            days
        })
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

const formatDisplayTime = ({ currentTime, onlyDay, onlyTime, hour12 }) => {
    if (!currentTime) return ''
    let day = DAYS[currentTime.getDay()]
    let hour = currentTime.getHours()
    let minute = currentTime.getMinutes()
    let month = MONTHS[currentTime.getMonth()]
    let date = currentTime.getDate().toLocaleString()
    let meridiem = hour < 12 ? 'AM' : 'PM'

    if (minute.toLocaleString().length === 1) {
        minute = '0' + minute
    }

    if (hour12 && hour > 12) hour -= 12

    if (onlyTime) {
        return `${hour}:${minute} ${meridiem}`
    }
    if (onlyDay) {
        return `${day} ${month} ${date}`
    }
    return `${day} ${month} ${date} ${hour}:${minute} ${meridiem}`
}

const Clock = ({ onlyDay = false, onlyTime = false }) => {
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

    const weeks = useMemo(() => buildCalendar(viewDate), [viewDate])

    const handleToggle = useCallback(() => {
        setIsOpen((open) => !open)
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

    const displayTime = useMemo(() => formatDisplayTime({
        currentTime,
        onlyDay,
        onlyTime,
        hour12: true
    }), [currentTime, onlyDay, onlyTime])

    if (!currentTime) {
        return <span suppressHydrationWarning></span>
    }

    if (onlyDay || onlyTime) {
        return <span suppressHydrationWarning>{displayTime}</span>
    }

    return (
        <div className="relative inline-block text-left" suppressHydrationWarning>
            <button
                type="button"
                ref={buttonRef}
                onClick={handleToggle}
                className="flex items-center gap-1 rounded px-2 py-1 text-left text-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                aria-controls={popoverId}
            >
                <span>{displayTime}</span>
            </button>
            {isOpen ? (
                <div
                    ref={popoverRef}
                    id={popoverId}
                    role="dialog"
                    aria-modal="false"
                    aria-label="Calendar"
                    className="absolute right-0 z-50 mt-2 min-w-[18rem] rounded border border-white/20 bg-black/90 p-3 text-sm text-white shadow-lg backdrop-blur"
                >
                    <div className="mb-2 flex items-center justify-between">
                        <div className="font-semibold" aria-live="polite" id={headingId}>
                            {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                                className="rounded px-2 py-1 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
                                aria-label="Previous month"
                            >
                                ‹
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                                className="rounded px-2 py-1 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
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
                                <th scope="col" className="w-12 pb-1 text-xs font-medium uppercase text-white/60" aria-label="Week">
                                    Wk
                                </th>
                                {DAYS.map((day) => (
                                    <th key={day} scope="col" className="pb-1 text-xs font-medium uppercase text-white/60">
                                        {day}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {weeks.map((week) => (
                                <tr key={`week-${week.days[0].date.toISOString()}`} role="row">
                                    <th
                                        scope="row"
                                        className="py-1 text-xs font-medium text-white/60"
                                        aria-label={`Week ${week.weekNumber}`}
                                    >
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
                                                    className={`flex h-8 w-8 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-white ${inCurrentMonth ? '' : 'text-white/40'} ${isFocused ? 'bg-white/20' : ''} ${isToday ? 'border border-white' : ''}`}
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
                    <div className="mt-3 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={handleToday}
                            className="rounded px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="rounded px-3 py-1 text-xs text-white/70 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
                        >
                            Close
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    )
}

export default Clock
