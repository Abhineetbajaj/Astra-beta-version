// Deno copy of src/astro-engine/houses.ts — keep in sync; do not diverge silently.

import { greenwichSiderealTimeDeg } from './ephemeris.ts'
import { meanObliquityDeg } from './obliquity.ts'

const DEG2RAD = Math.PI / 180
const RAD2DEG = 180 / Math.PI

export function ramcDeg(date: Date, lonDeg: number): number {
  const ramc = greenwichSiderealTimeDeg(date) + lonDeg
  return ((ramc % 360) + 360) % 360
}

export function ascendantTropicalLongitude(date: Date, latDeg: number, lonDeg: number): number {
  const ramc = ramcDeg(date, lonDeg) * DEG2RAD
  const eps = meanObliquityDeg(date) * DEG2RAD
  const lat = latDeg * DEG2RAD

  const y = -Math.cos(ramc)
  const x = Math.sin(eps) * Math.tan(lat) + Math.cos(eps) * Math.sin(ramc)

  const asc = Math.atan2(y, x) * RAD2DEG
  return ((asc % 360) + 360) % 360
}

export function wholeSignHouse(planetRashiIndex: number, ascendantRashiIndex: number): number {
  return ((planetRashiIndex - ascendantRashiIndex + 12) % 12) + 1
}
