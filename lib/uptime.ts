export function formatDurationSeconds(value?: number | null): string {
  const totalSeconds = Math.floor(Number(value || 0))
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return 'нет данных'

  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (days > 0) {
    return hours > 0 ? `${days} д ${hours} ч` : `${days} д`
  }

  if (hours > 0) {
    return minutes > 0 ? `${hours} ч ${minutes} м` : `${hours} ч`
  }

  if (minutes > 0) {
    return `${minutes} м`
  }

  return '<1 м'
}

export function formatDurationMs(value?: number | null): string {
  const totalMs = Number(value || 0)
  if (!Number.isFinite(totalMs) || totalMs <= 0) return 'нет данных'
  return formatDurationSeconds(Math.floor(totalMs / 1000))
}
