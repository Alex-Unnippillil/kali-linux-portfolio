import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const SAME_DAY = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

const startOfWeek = (date) => {
    const result = new Date(date)
    const day = result.getDay()
    result.setDate(result.getDate() - day)
    result.setHours(0, 0, 0, 0)
    return result
}

const endOfWeek = (date) => {
    const result = startOfWeek(date)
    result.setDate(result.getDate() + 6)
    return result
}

const getISOWeekNumber = (date) => {
    const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNumber = tempDate.getUTCDay() || 7
    tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNumber)
    const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1))
    const diff = tempDate - yearStart
    return Math.ceil(((diff / 86400000) + 1) / 7)
}

const getMotionDuration = () => {
    if (typeof window === 'undefined') return 300
    const value = getComputedStyle(document.documentElement).getPropertyValue('--motion-medium').trim()
    if (!value) return 300
    if (value.endsWith('ms')) return parseFloat(value)
    if (value.endsWith('s')) return parseFloat(value) * 1000
    const parsed = parseFloat(value)
    return Number.isNaN(parsed) ? 300 : parsed
}

const buildCalendar = (visibleMonth) => {
    const firstOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
    const lastOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0)
    const start = startOfWeek(firstOfMonth)
    const end = endOfWeek(lastOfMonth)

    const weeks = []
    let cursor = new Date(start)
    while (cursor <= end) {
        const weekStart = new Date(cursor)
        const days = []
        for (let i = 0; i < 7; i++) {
            days.push({
                date: new Date(cursor),
                inCurrentMonth: cursor.getMonth() === visibleMonth.getMonth(),
            })
            cursor.setDate(cursor.getDate() + 1)
        }
        const midWeek = days[3]?.date ?? weekStart
        weeks.push({
            weekNumber: getISOWeekNumber(midWeek),
            days,
        })
    }
    return weeks
}

const useNow = () => {
    const [now, setNow] = useState(null)
    useEffect(() => {
        const update = () => setNow(new Date())
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
    return now
}

export default function Clock(props) {
    const now = useNow()

    const [isOpen, setIsOpen] = useState(false)
    const [isVisible, setIsVisible] = useState(false)
    const [visibleMonth, setVisibleMonth] = useState(() => new Date())
    const [focusedDate, setFocusedDate] = useState(() => new Date())

    const buttonRef = useRef(null)
    const popoverRef = useRef(null)
    const focusedCellRef = useRef(null)
    const hideTimer = useRef(null)

    const displayTime = useMemo(() => {
        if (!now) return null
        let day = DAYS[now.getDay()]
        let hour = now.getHours()
        let minute = now.getMinutes()
        let month = MONTHS[now.getMonth()]
        let date = now.getDate().toLocaleString()
        const meridiem = hour < 12 ? 'AM' : 'PM'

        const minuteText = minute.toLocaleString().length === 1 ? `0${minute}` : minute
        const hourValue = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour

        if (props.onlyTime) {
            return `${hourValue}:${minuteText} ${meridiem}`
        }
        if (props.onlyDay) {
            return `${day} ${month} ${date}`
        }
        return `${day} ${month} ${date} ${hourValue}:${minuteText} ${meridiem}`
    }, [now, props.onlyDay, props.onlyTime])

    useEffect(() => {
        if (props.onlyTime || props.onlyDay || !now) return
        setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1))
        setFocusedDate(new Date(now))
    }, [now, props.onlyDay, props.onlyTime])

    const calendarWeeks = useMemo(() => buildCalendar(visibleMonth), [visibleMonth])

    const openPopover = useCallback(() => {
        if (props.onlyTime || props.onlyDay) return
        setIsVisible(true)
        requestAnimationFrame(() => setIsOpen(true))
    }, [props.onlyDay, props.onlyTime])

    const closePopover = useCallback(() => {
        setIsOpen(false)
        const duration = getMotionDuration()
        if (hideTimer.current) clearTimeout(hideTimer.current)
        if (duration === 0) {
            setIsVisible(false)
        } else {
            hideTimer.current = setTimeout(() => {
                setIsVisible(false)
            }, duration)
        }
    }, [])

    const togglePopover = useCallback(() => {
        if (props.onlyTime || props.onlyDay) return
        if (isVisible && isOpen) {
            closePopover()
        } else {
            openPopover()
        }
    }, [closePopover, isOpen, isVisible, openPopover, props.onlyDay, props.onlyTime])

    useEffect(() => {
        if (!(isOpen && isVisible)) return
        const handlePointerDown = (event) => {
            const target = event.target
            if (
                popoverRef.current?.contains(target) ||
                buttonRef.current?.contains(target)
            ) {
                return
            }
            closePopover()
        }
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                closePopover()
                buttonRef.current?.focus()
            }
        }
        document.addEventListener('pointerdown', handlePointerDown)
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [closePopover, isOpen, isVisible])

    useEffect(() => {
        if (isOpen && focusedCellRef.current) {
            focusedCellRef.current.focus()
        }
        if (!isOpen && isVisible === false && buttonRef.current) {
            buttonRef.current.focus()
        }
    }, [isOpen, isVisible])

    useEffect(() => {
        return () => {
            if (hideTimer.current) clearTimeout(hideTimer.current)
        }
    }, [])

    const ensureVisibleMonth = useCallback((date) => {
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
        setVisibleMonth(monthStart)
    }, [])

    const updateFocusDate = useCallback((date) => {
        setFocusedDate(date)
        ensureVisibleMonth(date)
    }, [ensureVisibleMonth])

    const handleGridKeyDown = useCallback((event) => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
        event.preventDefault()
        const delta = {
            ArrowLeft: -1,
            ArrowRight: 1,
            ArrowUp: -7,
            ArrowDown: 7,
        }[event.key]
        const next = new Date(focusedDate)
        next.setDate(focusedDate.getDate() + delta)
        updateFocusDate(next)
    }, [focusedDate, updateFocusDate])

    const handleDayFocus = useCallback((date) => {
        setFocusedDate(date)
    }, [])

    const handleToday = useCallback(() => {
        const today = new Date()
        updateFocusDate(today)
        if (popoverRef.current) {
            requestAnimationFrame(() => {
                focusedCellRef.current?.focus()
            })
        }
    }, [updateFocusDate])

    const monthLabel = useMemo(() => {
        return `${MONTHS[visibleMonth.getMonth()]} ${visibleMonth.getFullYear()}`
    }, [visibleMonth])

    if (!displayTime) {
        return <span suppressHydrationWarning></span>
    }

    if (props.onlyTime || props.onlyDay) {
        return <span suppressHydrationWarning>{displayTime}</span>
    }

    const popoverId = 'clock-popover'

    return (
        <div className="clock-container">
            <button
                type="button"
                ref={buttonRef}
                className="clock-button"
                aria-haspopup="dialog"
                aria-expanded={isOpen && isVisible}
                aria-controls={isOpen ? popoverId : undefined}
                onClick={togglePopover}
            >
                <span suppressHydrationWarning>{displayTime}</span>
            </button>
            {isVisible && (
                <div
                    ref={popoverRef}
                    id={popoverId}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Calendar"
                    className={`clock-popover ${isOpen ? 'open' : ''}`}
                >
                    <div className="calendar-header" id="clock-calendar-label">
                        <span>{monthLabel}</span>
                    </div>
                    <div
                        role="grid"
                        aria-labelledby="clock-calendar-label"
                        className="calendar-grid"
                        onKeyDown={handleGridKeyDown}
                    >
                        <div role="row" className="calendar-row calendar-headings">
                            <div role="columnheader" className="calendar-week">Wk</div>
                            {DAYS.map((day) => (
                                <div role="columnheader" key={day} className="calendar-heading">
                                    {day}
                                </div>
                            ))}
                        </div>
                        {calendarWeeks.map((week, index) => (
                            <div role="row" className="calendar-row" key={`${week.weekNumber}-${index}`}>
                                <div role="rowheader" className="calendar-week" aria-label={`Week ${week.weekNumber}`}>
                                    {week.weekNumber}
                                </div>
                                {week.days.map(({ date, inCurrentMonth }) => {
                                    const isFocused = SAME_DAY(date, focusedDate)
                                    const isToday = now ? SAME_DAY(date, now) : false
                                    return (
                                        <div
                                            key={date.toISOString()}
                                            role="gridcell"
                                            tabIndex={isFocused ? 0 : -1}
                                            aria-selected={isFocused}
                                            aria-current={isToday ? 'date' : undefined}
                                            className={`calendar-cell${inCurrentMonth ? '' : ' outside-month'}${isFocused ? ' focused' : ''}${isToday ? ' today' : ''}`}
                                            ref={isFocused ? focusedCellRef : null}
                                            onFocus={() => handleDayFocus(date)}
                                            onClick={() => updateFocusDate(date)}
                                        >
                                            {date.getDate()}
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                    <div className="calendar-footer">
                        <button type="button" className="today-button" onClick={handleToday}>
                            Today
                        </button>
                    </div>
                </div>
            )}
            <style jsx>{`
                .clock-container {
                    position: relative;
                    display: inline-block;
                }
                .clock-button {
                    padding: 0.25rem 0.5rem;
                    background: transparent;
                    color: inherit;
                    border: 2px solid transparent;
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    transition: border-color var(--motion-fast) ease;
                }
                .clock-button:focus-visible {
                    outline: none;
                    border-color: var(--focus-outline-color);
                }
                .clock-button:hover {
                    border-color: var(--kali-panel-border);
                }
                .clock-popover {
                    position: absolute;
                    top: calc(100% + 0.5rem);
                    right: 0;
                    min-width: 16rem;
                    padding: 0.75rem;
                    background: var(--kali-panel);
                    border: 1px solid var(--kali-panel-border);
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-2);
                    opacity: 0;
                    transform: translateY(-0.5rem);
                    transition: opacity var(--motion-medium) ease, transform var(--motion-medium) ease;
                    z-index: 100;
                }
                .clock-popover.open {
                    opacity: 1;
                    transform: translateY(0);
                }
                .calendar-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.5rem;
                    font-weight: 600;
                }
                .calendar-grid {
                    display: grid;
                    gap: 0.25rem;
                }
                .calendar-row {
                    display: grid;
                    grid-template-columns: repeat(8, minmax(0, 1fr));
                    gap: 0.25rem;
                    align-items: center;
                }
                .calendar-headings {
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .calendar-heading {
                    text-align: center;
                }
                .calendar-week {
                    text-align: center;
                    font-size: 0.75rem;
                    color: var(--color-ubt-warm-grey);
                }
                .calendar-cell {
                    text-align: center;
                    padding: 0.5rem 0;
                    border-radius: var(--radius-md);
                    outline: none;
                    cursor: pointer;
                    transition: background-color var(--motion-fast) ease, color var(--motion-fast) ease;
                }
                .calendar-cell:focus-visible {
                    outline: 2px solid var(--focus-outline-color);
                    outline-offset: 2px;
                }
                .calendar-cell:hover {
                    background-color: var(--kali-panel-highlight);
                }
                .calendar-cell.outside-month {
                    color: var(--color-ubt-warm-grey);
                    opacity: 0.7;
                }
                .calendar-cell.focused {
                    background-color: rgba(23, 147, 209, 0.15);
                }
                .calendar-cell.today {
                    border: 1px solid var(--kali-blue);
                }
                .calendar-footer {
                    margin-top: 0.5rem;
                    display: flex;
                    justify-content: flex-end;
                }
                .today-button {
                    padding: 0.25rem 0.75rem;
                    background: var(--kali-blue);
                    color: #0f1317;
                    border: none;
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    transition: background-color var(--motion-fast) ease;
                }
                .today-button:hover {
                    background: var(--kali-blue-dark);
                }
                .today-button:focus-visible {
                    outline: 2px solid var(--focus-outline-color);
                    outline-offset: 2px;
                }
            `}</style>
        </div>
    )
}
