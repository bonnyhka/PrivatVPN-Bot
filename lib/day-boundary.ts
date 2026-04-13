export const APP_TIME_ZONE = 'Europe/Moscow'
export const APP_UTC_OFFSET_MINUTES = 180

const APP_OFFSET_MS = APP_UTC_OFFSET_MINUTES * 60 * 1000

function shiftToAppClock(date: Date) {
  return new Date(date.getTime() + APP_OFFSET_MS)
}

export function getAppDayKey(date = new Date()) {
  return shiftToAppClock(date).toISOString().slice(0, 10)
}

export function getStartOfAppDay(date = new Date()) {
  const shifted = shiftToAppClock(date)
  const year = shifted.getUTCFullYear()
  const month = shifted.getUTCMonth()
  const day = shifted.getUTCDate()
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - APP_OFFSET_MS)
}

export function getStartOfAppHour(date = new Date()) {
  const shifted = shiftToAppClock(date)
  const year = shifted.getUTCFullYear()
  const month = shifted.getUTCMonth()
  const day = shifted.getUTCDate()
  const hour = shifted.getUTCHours()
  return new Date(Date.UTC(year, month, day, hour, 0, 0, 0) - APP_OFFSET_MS)
}

export function getAppHourBucket(date = new Date()) {
  return getStartOfAppHour(date).toISOString()
}

