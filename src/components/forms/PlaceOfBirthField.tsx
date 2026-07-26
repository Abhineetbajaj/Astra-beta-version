import { useEffect, useRef, useState } from 'react'
import { Locate, MapPin, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { searchPlace, type GeocodeResult } from '@/services/geocodingService'

export interface PlaceOfBirthValue {
  label: string
  lat: number
  lon: number
}

interface PlaceOfBirthFieldProps {
  value: PlaceOfBirthValue | null
  onChange: (value: PlaceOfBirthValue | null) => void
}

export default function PlaceOfBirthField({ value, onChange }: PlaceOfBirthFieldProps) {
  const [query, setQuery] = useState(value?.label ?? '')
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [manualMode, setManualMode] = useState(false)
  const [manualLat, setManualLat] = useState(value ? String(value.lat) : '')
  const [manualLon, setManualLon] = useState(value ? String(value.lon) : '')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    setSearchError(null)
    setSearched(false)
    if (query.trim().length < 3 || (value && value.label === query)) {
      setResults([])
      return
    }
    timer.current = setTimeout(async () => {
      setSearching(true)
      try {
        setResults(await searchPlace(query))
      } catch (err) {
        setResults([])
        setSearchError(
          err instanceof Error
            ? err.message
            : 'Search failed — this can happen if your network blocks outside requests.',
        )
      } finally {
        setSearching(false)
        setSearched(true)
      }
    }, 500)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  function select(result: GeocodeResult) {
    setQuery(result.label)
    setResults([])
    onChange({ label: result.label, lat: result.lat, lon: result.lon })
  }

  function switchToManual() {
    setManualMode(true)
    setSearchError(null)
  }

  function detectLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude
      const lon = pos.coords.longitude
      setManualMode(true)
      setManualLat(lat.toFixed(4))
      setManualLon(lon.toFixed(4))
      onChange({ label: 'Detected location', lat, lon })
    })
  }

  function applyManual(lat: string, lon: string) {
    const latNum = parseFloat(lat)
    const lonNum = parseFloat(lon)
    if (!Number.isNaN(latNum) && !Number.isNaN(lonNum)) {
      onChange({ label: `${latNum.toFixed(4)}, ${lonNum.toFixed(4)}`, lat: latNum, lon: lonNum })
    } else {
      onChange(null)
    }
  }

  const showNoMatches =
    !searching && searched && !searchError && results.length === 0 && query.trim().length >= 3

  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-ink-faint">Place of birth</span>
        <button
          type="button"
          onClick={() => setManualMode((m) => !m)}
          className="text-xs text-accent hover:underline"
        >
          {manualMode ? 'Search instead' : 'Enter manually'}
        </button>
      </div>

      {!manualMode ? (
        <div className="relative mt-2">
          <div className="relative">
            <MapPin
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
              strokeWidth={1.75}
            />
            <Input
              className="pl-10"
              placeholder="City, country"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                onChange(null)
              }}
            />
            {searching && (
              <Loader2 className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-ink-faint" />
            )}
          </div>

          {results.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-line bg-paper shadow-lg">
              {results.map((r, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => select(r)}
                    className="w-full px-3.5 py-2.5 text-left text-sm hover:bg-paper-raised"
                  >
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {searchError && (
            <p className="mt-2 text-sm text-negative">
              {searchError}{' '}
              <button type="button" onClick={switchToManual} className="underline">
                Switch to manual entry
              </button>
              .
            </p>
          )}

          {showNoMatches && (
            <p className="mt-2 text-sm text-ink-muted">
              No matches for "{query}" —{' '}
              <button type="button" onClick={switchToManual} className="text-accent underline">
                enter coordinates manually
              </button>{' '}
              instead.
            </p>
          )}

          <button
            type="button"
            onClick={detectLocation}
            className="mt-3 flex items-center gap-1.5 text-xs text-accent hover:underline"
          >
            <Locate className="size-3.5" strokeWidth={1.75} />
            Use my current location
          </button>
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-3">
          <Input
            placeholder="Latitude, e.g. 19.0760"
            value={manualLat}
            onChange={(e) => {
              setManualLat(e.target.value)
              applyManual(e.target.value, manualLon)
            }}
          />
          <Input
            placeholder="Longitude, e.g. 72.8777"
            value={manualLon}
            onChange={(e) => {
              setManualLon(e.target.value)
              applyManual(manualLat, e.target.value)
            }}
          />
        </div>
      )}
    </div>
  )
}
