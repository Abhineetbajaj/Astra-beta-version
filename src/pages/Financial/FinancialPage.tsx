import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Building2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabaseClient'
import { callEdgeFunction } from '@/lib/edgeFunctions'
import { resolveTimeZone, resolveHistoricalOffsetMinutes } from '@/services/timezoneService'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner'
import PlaceOfBirthField, { type PlaceOfBirthValue } from '@/components/forms/PlaceOfBirthField'
import BirthDateTimeFields from '@/components/forms/BirthDateTimeFields'
import type { CompanyProfileRow, FinancialReadingRow } from '@/types/db'

const DISCLAIMER = 'Not financial or investment advice — a traditional astrological perspective for reflection only.'

function ReadingResult({ reading }: { reading: FinancialReadingRow }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mt-5 border-t border-line pt-5">
      {reading.wealth_yogas.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {reading.wealth_yogas.map((y) => (
            <Badge key={y.key} variant="accent">
              {y.name}
            </Badge>
          ))}
        </div>
      )}
      <p className="text-ink">{reading.body}</p>
      <DisclaimerBanner text={reading.disclaimer} className="mt-4" />
    </motion.div>
  )
}

export default function FinancialPage() {
  const session = useAuthStore((s) => s.session)
  const selfBirthProfile = useAuthStore((s) => s.selfBirthProfile)

  const [personalReading, setPersonalReading] = useState<FinancialReadingRow | null>(null)
  const [personalLoading, setPersonalLoading] = useState(false)
  const [personalError, setPersonalError] = useState<string | null>(null)

  const [companies, setCompanies] = useState<CompanyProfileRow[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [showAddCompany, setShowAddCompany] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('12:00')
  const [timeUnknown, setTimeUnknown] = useState(false)
  const [place, setPlace] = useState<PlaceOfBirthValue | null>(null)
  const [addingCompany, setAddingCompany] = useState(false)
  const [addCompanyError, setAddCompanyError] = useState<string | null>(null)

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [companyReading, setCompanyReading] = useState<FinancialReadingRow | null>(null)
  const [companyReadingLoading, setCompanyReadingLoading] = useState(false)
  const [companyReadingError, setCompanyReadingError] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return
    supabase
      .from('company_profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCompanies((data as CompanyProfileRow[]) ?? [])
        setLoadingCompanies(false)
      })
  }, [session])

  async function generatePersonal() {
    if (!selfBirthProfile) return
    setPersonalLoading(true)
    setPersonalError(null)
    try {
      const { reading } = await callEdgeFunction<{ reading: FinancialReadingRow }>('financial-reading', {
        kind: 'personal',
        subjectId: selfBirthProfile.id,
      })
      setPersonalReading(reading)
    } catch (err) {
      setPersonalError(err instanceof Error ? err.message : 'Could not generate a reading.')
    } finally {
      setPersonalLoading(false)
    }
  }

  async function handleAddCompany(e: FormEvent) {
    e.preventDefault()
    setAddCompanyError(null)
    if (!session) return setAddCompanyError('Sign in again — your session expired.')
    if (!companyName.trim()) return setAddCompanyError('Enter the company name.')
    if (!date) return setAddCompanyError('Enter the incorporation date.')
    if (!place) return setAddCompanyError('Enter the incorporation place.')

    setAddingCompany(true)
    try {
      const tzName = resolveTimeZone(place.lat, place.lon)
      const effectiveTime = timeUnknown ? '12:00' : time
      const utcOffsetMinutes = resolveHistoricalOffsetMinutes(tzName, date, effectiveTime)

      const { data: company, error: insertError } = await supabase
        .from('company_profiles')
        .insert({
          user_id: session.user.id,
          company_name: companyName,
          incorporation_date: date,
          incorporation_time: timeUnknown ? null : time,
          time_known: !timeUnknown,
          place_name: place.label,
          lat: place.lat,
          lon: place.lon,
          utc_offset_minutes: utcOffsetMinutes,
        })
        .select()
        .single()
      if (insertError || !company) throw new Error(insertError?.message ?? 'Could not save company profile.')

      setCompanies((c) => [company as CompanyProfileRow, ...c])
      setCompanyName('')
      setDate('')
      setTime('12:00')
      setTimeUnknown(false)
      setPlace(null)
      setShowAddCompany(false)
      selectCompany(company.id)
    } catch (err) {
      setAddCompanyError(err instanceof Error ? err.message : 'Could not save company profile.')
    } finally {
      setAddingCompany(false)
    }
  }

  function selectCompany(companyId: string) {
    setSelectedCompanyId(companyId)
    setCompanyReading(null)
    setCompanyReadingError(null)
  }

  async function generateCompanyReading(companyId: string) {
    setCompanyReadingLoading(true)
    setCompanyReadingError(null)
    try {
      const { reading } = await callEdgeFunction<{ reading: FinancialReadingRow }>('financial-reading', {
        kind: 'company',
        subjectId: companyId,
      })
      setCompanyReading(reading)
    } catch (err) {
      setCompanyReadingError(err instanceof Error ? err.message : 'Could not generate a reading.')
    } finally {
      setCompanyReadingLoading(false)
    }
  }

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) ?? null

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div className="text-center">
        <TrendingUp className="mx-auto size-6 text-accent" strokeWidth={1.5} />
        <h1 className="mt-3 font-display text-4xl">Financial astrology</h1>
        <p className="mt-2 text-ink-muted">Wealth yogas, house strength, and dasha-based financial timing.</p>
      </div>

      <DisclaimerBanner text={DISCLAIMER} />

      <Card>
        <h2 className="font-display text-lg">Your personal wealth reading</h2>
        <p className="mt-1 text-sm text-ink-muted">Based on your existing birth chart.</p>
        <Button variant="accent" size="lg" className="mt-4" onClick={generatePersonal} disabled={personalLoading}>
          {personalLoading ? 'Reading your chart…' : 'Generate my wealth reading'}
        </Button>
        {personalError && <p className="mt-3 text-sm text-negative">{personalError}</p>}
        {personalLoading && !personalReading && (
          <div className="mt-5 space-y-2 border-t border-line pt-5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        )}
        {personalReading && <ReadingResult reading={personalReading} />}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg">Company / business charts</h2>
            <p className="mt-1 text-sm text-ink-muted">Incorporation date treated like a birth chart.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowAddCompany((s) => !s)}>
            {showAddCompany ? 'Cancel' : '+ Add company'}
          </Button>
        </div>

        {showAddCompany && (
          <form onSubmit={handleAddCompany} className="mt-5 space-y-5 border-t border-line pt-5">
            <Input placeholder="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            <BirthDateTimeFields
              date={date}
              onDateChange={setDate}
              time={time}
              onTimeChange={setTime}
              timeUnknown={timeUnknown}
              onTimeUnknownChange={setTimeUnknown}
              unknownLabel="Incorporation time unknown"
            />
            <PlaceOfBirthField value={place} onChange={setPlace} />

            {addCompanyError && <p className="text-sm text-negative">{addCompanyError}</p>}

            <Button type="submit" variant="accent" size="lg" className="w-full" disabled={addingCompany}>
              {addingCompany ? 'Saving…' : 'Save company →'}
            </Button>
          </form>
        )}

        <div className="mt-5 space-y-2">
          {loadingCompanies && <Skeleton className="h-12 w-full" />}
          {!loadingCompanies && companies.length === 0 && !showAddCompany && (
            <p className="text-sm text-ink-faint">No companies saved yet — add one to generate its reading.</p>
          )}
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => selectCompany(c.id)}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                selectedCompanyId === c.id ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong'
              }`}
            >
              <span className="flex items-center gap-2">
                <Building2 className="size-4 text-ink-muted" strokeWidth={1.75} />
                <span className="text-sm font-medium">{c.company_name}</span>
              </span>
              <span className="text-xs text-ink-faint">{c.incorporation_date}</span>
            </button>
          ))}
        </div>

        {selectedCompany && (
          <div className="mt-5 border-t border-line pt-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base">{selectedCompany.company_name}</h3>
              <Button variant="accent" size="sm" onClick={() => generateCompanyReading(selectedCompany.id)} disabled={companyReadingLoading}>
                {companyReadingLoading ? 'Computing…' : 'Generate reading'}
              </Button>
            </div>
            {companyReadingError && <p className="mt-3 text-sm text-negative">{companyReadingError}</p>}
            {companyReadingLoading && !companyReading && (
              <div className="mt-5 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            )}
            {companyReading && <ReadingResult reading={companyReading} />}
          </div>
        )}
      </Card>
    </div>
  )
}
