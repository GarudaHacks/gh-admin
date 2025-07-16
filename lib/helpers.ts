export function epochToStringDate(epochSecond: number) {
    const startDate = new Date(epochSecond * 1000)
    const startDay = startDate.toLocaleDateString()
    const startTimestamp = startDate.toLocaleString('id-ID', { timeStyle: 'short' })
    const start = `${startDay} ${startTimestamp}`
    return start
}