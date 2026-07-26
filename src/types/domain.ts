export type TimeAccuracy = 'exact' | 'approximate' | 'unknown'

export interface BirthData {
  name: string
  /** ISO date string, e.g. "2000-10-13" */
  date: string
  /** 24h "HH:mm", ignored/defaulted when timeAccuracy is 'unknown' */
  time: string
  timeAccuracy: TimeAccuracy
  placeLabel: string
  lat: number
  lon: number
  /** IANA zone name, e.g. "Asia/Kolkata" */
  tzName: string
  /** Resolved historical UTC offset in minutes, e.g. 330 */
  utcOffsetMinutes: number
}

export interface UserProfile {
  id: string
  email: string
  displayName: string
  birthData: BirthData | null
  isPremium: boolean
  createdAt: string
}
