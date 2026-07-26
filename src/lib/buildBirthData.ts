import { resolveTimeZone, resolveHistoricalOffsetMinutes } from '@/services/timezoneService'
import type { BirthData, TimeAccuracy } from '@/types/domain'

export function buildBirthData(params: {
  name: string
  date: string
  time: string
  timeAccuracy: TimeAccuracy
  placeLabel: string
  lat: number
  lon: number
}): BirthData {
  const tzName = resolveTimeZone(params.lat, params.lon)
  const effectiveTime = params.timeAccuracy === 'unknown' ? '12:00' : params.time
  const utcOffsetMinutes = resolveHistoricalOffsetMinutes(tzName, params.date, effectiveTime)

  return {
    name: params.name,
    date: params.date,
    time: effectiveTime,
    timeAccuracy: params.timeAccuracy,
    placeLabel: params.placeLabel,
    lat: params.lat,
    lon: params.lon,
    tzName,
    utcOffsetMinutes,
  }
}
