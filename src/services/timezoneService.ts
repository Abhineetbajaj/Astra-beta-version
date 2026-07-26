import tzLookup from 'tz-lookup'
import { DateTime } from 'luxon'

/** IANA zone name for a lat/lon, resolved entirely offline (no network call). */
export function resolveTimeZone(lat: number, lon: number): string {
  return tzLookup(lat, lon)
}

/**
 * Historical UTC offset in minutes for a given IANA zone at a specific local wall-clock
 * instant — uses the browser's own IANA/ICU tzdata via luxon, so no separate historical
 * offset dataset needs to be bundled. This correctly resolves pre-DST-change era offsets
 * rather than assuming today's offset.
 */
export function resolveHistoricalOffsetMinutes(
  tzName: string,
  localDateISO: string,
  localTime: string,
): number {
  const dt = DateTime.fromISO(`${localDateISO}T${localTime}`, { zone: tzName })
  return dt.isValid ? dt.offset : 0
}

/** Formats an offset in minutes as "+05:30" / "-04:00". */
export function formatOffsetMinutes(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const hours = String(Math.floor(abs / 60)).padStart(2, '0')
  const minutes = String(abs % 60).padStart(2, '0')
  return `${sign}${hours}:${minutes}`
}

/** Parses "+05:30" / "-04:00" style strings into minutes. Returns null if unparseable. */
export function parseOffsetString(offset: string): number | null {
  const match = /^([+-])(\d{1,2}):(\d{2})$/.exec(offset.trim())
  if (!match) return null
  const sign = match[1] === '-' ? -1 : 1
  return sign * (parseInt(match[2], 10) * 60 + parseInt(match[3], 10))
}
