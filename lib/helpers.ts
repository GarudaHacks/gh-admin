export function dateToStringTime(date: Date) {
    return date.toLocaleString('en-US', { timeStyle: 'short'})
}

export function epochToStringDate(epochSecond: number) {
    const startDate = new Date(epochSecond * 1000)
    const startDay = startDate.toLocaleDateString()
    const startTimestamp = startDate.toLocaleString('en-US', { timeStyle: 'short' })
    const start = `${startDay} ${startTimestamp}`
    return start
}

/**
 * Human-readable label for the viewer's local timezone, e.g. "GMT+7 · Asia/Jakarta".
 * All schedule times are rendered in this timezone.
 */
export function getTimeZoneLabel() {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(new Date())
    const short = parts.find((p) => p.type === 'timeZoneName')?.value
    return short ? `${short} · ${zone}` : zone
}