import { useCallback, useEffect, useMemo, useState } from 'react'
import { safeLocalStorage } from '../utils/safeStorage'

const HOUR_FORMAT_KEY = 'clock-hour-format'
const TIME_ZONE_KEY = 'clock-time-zone'

const resolveDefaultTimeZone = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    } catch (error) {
        return 'UTC'
    }
}

const normalizeLocale = (value) => {
    if (!value) return undefined
    const normalized = value.replace(/_/g, '-').split('@')[0]
    try {
        // Validate locale support
        new Intl.DateTimeFormat(normalized)
        return normalized
    } catch (error) {
        return undefined
    }
}

const resolveDefaultLocale = () => {
    const fallback = 'en-US'
    if (typeof navigator !== 'undefined' && navigator.language) {
        const normalized = normalizeLocale(navigator.language)
        if (normalized) {
            return normalized
        }
    }
    try {
        const resolved = normalizeLocale(Intl.DateTimeFormat().resolvedOptions().locale)
        return resolved || fallback
    } catch (error) {
        return fallback
    }
}

const parseStoredHourFormat = (value) => {
    if (value === '12') return true
    if (value === '24') return false
    return undefined
}

export const useClockPreferences = () => {
    const [hour12, setHour12State] = useState(() => {
        const stored = safeLocalStorage?.getItem(HOUR_FORMAT_KEY)
        const parsed = parseStoredHourFormat(stored)
        return typeof parsed === 'boolean' ? parsed : false
    })

    const [timeZone, setTimeZoneState] = useState(() => {
        const stored = safeLocalStorage?.getItem(TIME_ZONE_KEY)
        return stored || resolveDefaultTimeZone()
    })

    const [locale, setLocale] = useState(() => resolveDefaultLocale())

    useEffect(() => {
        if (typeof navigator === 'undefined') return
        if (!navigator.language) return
        const normalized = normalizeLocale(navigator.language)
        if (normalized) {
            setLocale(normalized)
        }
    }, [])

    useEffect(() => {
        if (!safeLocalStorage) return
        safeLocalStorage.setItem(HOUR_FORMAT_KEY, hour12 ? '12' : '24')
    }, [hour12])

    useEffect(() => {
        if (!safeLocalStorage) return
        if (!timeZone) return
        safeLocalStorage.setItem(TIME_ZONE_KEY, timeZone)
    }, [timeZone])

    const setHour12 = useCallback((value) => {
        if (typeof value === 'string') {
            setHour12State(value === '12')
            return
        }
        setHour12State(Boolean(value))
    }, [])

    const setTimeZone = useCallback((value) => {
        if (!value) return
        setTimeZoneState(value)
    }, [])

    const timeZoneOptions = useMemo(() => {
        const options = new Set()
        if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
            try {
                Intl.supportedValuesOf('timeZone').forEach((zone) => options.add(zone))
            } catch (error) {
                // noop
            }
        }
        options.add(resolveDefaultTimeZone())
        if (timeZone) options.add(timeZone)
        options.add('UTC')
        let comparer
        try {
            comparer = new Intl.Collator(locale || undefined).compare
        } catch (error) {
            comparer = undefined
        }
        return Array.from(options).sort((a, b) => {
            if (comparer) return comparer(a, b)
            return a.localeCompare(b)
        })
    }, [locale, timeZone])

    return {
        hour12,
        timeZone,
        locale,
        setHour12,
        setTimeZone,
        timeZoneOptions
    }
}

export default useClockPreferences
