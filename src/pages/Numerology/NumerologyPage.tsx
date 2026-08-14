import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Hash, Heart, Pencil, Share2, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabaseClient'
import { callEdgeFunction } from '@/lib/edgeFunctions'
import { computeCoreNumbers, computeNumerologyCompatibility, computePersonalCycles } from '@/numerology-engine'
import type { CoreNumbers, NumberResult, NumerologyCompatibility } from '@/numerology-engine'
import { meaningForNumber } from '@/data/numerologyMeanings'
import { highlightGlossaryTerms } from '@/lib/highlightGlossaryTerms'
import GlossaryTerm from '@/components/GlossaryTerm'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import type { NumerologyCompatibilityReadingRow, NumerologyDailyReadingRow, NumerologyReadingRow } from '@/types/db'

const CORE_NUMBER_ROWS: { key: keyof CoreNumbers; label: string; glossaryTerm: string }[] = [
  { key: 'lifePath', label: 'Life Path', glossaryTerm: 'life path number' },
  { key: 'expression', label: 'Expression', glossaryTerm: 'expression number' },
  { key: 'soulUrge', label: 'Soul Urge', glossaryTerm: 'soul urge number' },
  { key: 'personality', label: 'Personality', glossaryTerm: 'personality number' },
  { key: 'birthday', label: 'Birthday', glossaryTerm: 'birthday number' },
]

function NumberBadge({ result }: { result: NumberResult }) {
  return (
    <span className="flex items-center gap-2">
      <span className="nums-tabular text-lg text-ink">{result.value}</span>
      {result.isMaster && (
        <GlossaryTerm term="master number" underline={false}>
          <Badge variant="accent">Master Number</Badge>
        </GlossaryTerm>
      )}
    </span>
  )
}

export default function NumerologyPage() {
  const session = useAuthStore((s) => s.session)
  const selfBirthProfile = useAuthStore((s) => s.selfBirthProfile)
  const refreshUserData = useAuthStore((s) => s.refreshUserData)

  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(selfBirthProfile?.name ?? '')
  const [savingName, setSavingName] = useState(false)

  const [dailyReading, setDailyReading] = useState<NumerologyDailyReadingRow | null>(null)
  const [loadingDaily, setLoadingDaily] = useState(true)
  const [dailyError, setDailyError] = useState<string | null>(null)

  const [reading, setReading] = useState<NumerologyReadingRow | null>(null)
  const [loadingExisting, setLoadingExisting] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [readingError, setReadingError] = useState<string | null>(null)

  const [partnerName, setPartnerName] = useState('')
  const [partnerDob, setPartnerDob] = useState('')
  const [compatReading, setCompatReading] = useState<NumerologyCompatibilityReadingRow | null>(null)
  const [compatLoading, setCompatLoading] = useState(false)
  const [compatError, setCompatError] = useState<string | null>(null)
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle')

  const coreNumbers = useMemo(() => {
    if (!selfBirthProfile) return null
    return computeCoreNumbers({
      fullName: selfBirthProfile.name,
      dateOfBirth: selfBirthProfile.date_of_birth,
      system: 'pythagorean',
    })
  }, [selfBirthProfile])

  const personalCycles = useMemo(() => {
    if (!selfBirthProfile) return null
    return computePersonalCycles(selfBirthProfile.date_of_birth, new Date())
  }, [selfBirthProfile])

  // Instant client-side preview as the partner's details are filled in — no network call, same
  // "compute it, don't source it" numbers as the rest of this page. The AI-narrated reading below
  // is a separate, explicit action so it doesn't fire on every keystroke.
  const compatPreview = useMemo((): NumerologyCompatibility | null => {
    if (!coreNumbers || !partnerName.trim() || !partnerDob) return null
    const partnerCore = computeCoreNumbers({ fullName: partnerName, dateOfBirth: partnerDob })
    return computeNumerologyCompatibility(coreNumbers, partnerCore)
  }, [coreNumbers, partnerName, partnerDob])

  useEffect(() => {
    if (!selfBirthProfile) return
    setLoadingDaily(true)
    setDailyError(null)
    callEdgeFunction<{ reading: NumerologyDailyReadingRow }>('numerology-daily-reading', {
      birthProfileId: selfBirthProfile.id,
    })
      .then(({ reading }) => setDailyReading(reading))
      .catch((err) => setDailyError(err instanceof Error ? err.message : "Could not load today's Personal Day reading."))
      .finally(() => setLoadingDaily(false))
  }, [selfBirthProfile])

  // Read the most recent already-generated reading rather than always demanding a fresh Gemini
  // call — the AI budget is shared across every feature and user, same pattern as FinancialPage.
  useEffect(() => {
    if (!session || !selfBirthProfile) return setLoadingExisting(false)
    let cancelled = false
    supabase
      .from('numerology_readings')
      .select('*')
      .eq('birth_profile_id', selfBirthProfile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        if (data) setReading(data as NumerologyReadingRow)
        setLoadingExisting(false)
      })
    return () => {
      cancelled = true
    }
  }, [session, selfBirthProfile])

  async function generateReading() {
    if (!selfBirthProfile) return
    setGenerating(true)
    setReadingError(null)
    try {
      const { reading } = await callEdgeFunction<{ reading: NumerologyReadingRow }>('numerology-reading', {
        birthProfileId: selfBirthProfile.id,
      })
      setReading(reading)
    } catch (err) {
      setReadingError(err instanceof Error ? err.message : 'Could not generate a reading.')
    } finally {
      setGenerating(false)
    }
  }

  async function generateCompatibility(e: FormEvent) {
    e.preventDefault()
    if (!partnerName.trim() || !partnerDob) return
    setCompatLoading(true)
    setCompatError(null)
    try {
      const { reading } = await callEdgeFunction<{ reading: NumerologyCompatibilityReadingRow }>(
        'numerology-compatibility',
        { partnerName: partnerName.trim(), partnerDateOfBirth: partnerDob },
      )
      setCompatReading(reading)
    } catch (err) {
      setCompatError(err instanceof Error ? err.message : 'Could not compute compatibility.')
    } finally {
      setCompatLoading(false)
    }
  }

  async function shareCompatibility() {
    if (!compatPreview) return
    const text =
      `${selfBirthProfile?.name} & ${partnerName} numerology match: ${compatPreview.total}/${compatPreview.max} — ` +
      compatPreview.dimensions.map((d) => `${d.label} ${d.valueA}+${d.valueB} (${d.verdict})`).join(', ') +
      '. Check yours on Astra.'
    if (navigator.share) {
      try {
        await navigator.share({ text })
      } catch {
        // user cancelled the native share sheet — not an error
      }
      return
    }
    await navigator.clipboard.writeText(text)
    setShareStatus('copied')
    setTimeout(() => setShareStatus('idle'), 2000)
  }

  async function handleSaveName(e: FormEvent) {
    e.preventDefault()
    if (!selfBirthProfile || !nameInput.trim()) return
    setSavingName(true)
    try {
      await supabase.from('birth_profiles').update({ name: nameInput.trim() }).eq('id', selfBirthProfile.id)
      await refreshUserData()
      setEditingName(false)
    } finally {
      setSavingName(false)
    }
  }

  if (!selfBirthProfile || !coreNumbers || !personalCycles) return null

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div className="text-center">
        <Hash className="mx-auto size-6 text-accent" strokeWidth={1.5} />
        <h1 className="mt-3 font-display text-4xl">Numerology</h1>
        <p className="mt-2 text-ink-muted">
          Your core numbers, computed the Pythagorean way, from{' '}
          {editingName ? (
            <span className="text-ink">the name below</span>
          ) : (
            <span className="text-ink">{selfBirthProfile.name}</span>
          )}{' '}
          and {new Date(selfBirthProfile.date_of_birth).toLocaleDateString('en-US', { dateStyle: 'long' })}.
        </p>
        {!editingName ? (
          <button
            onClick={() => {
              setNameInput(selfBirthProfile.name)
              setEditingName(true)
            }}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink"
          >
            <Pencil className="size-3" strokeWidth={1.75} />
            Name numbers most accurate with your full birth name — edit it
          </button>
        ) : (
          <form onSubmit={handleSaveName} className="mx-auto mt-3 flex max-w-sm items-center gap-2">
            <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Full name (as on birth certificate)" />
            <Button type="submit" size="sm" variant="accent" disabled={savingName}>
              {savingName ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditingName(false)}>
              Cancel
            </Button>
          </form>
        )}
      </div>

      <Card>
        <div className="flex items-center gap-2 text-ink-muted">
          <Sparkles className="size-4" strokeWidth={1.75} />
          <span className="text-xs font-medium uppercase tracking-wide">
            Today's <GlossaryTerm term="personal day">Personal Day</GlossaryTerm>
          </span>
        </div>
        <div className="mt-3">
          <NumberBadge result={personalCycles.personalDay} />
        </div>
        {loadingDaily && (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}
        {dailyError && <p className="mt-3 text-sm text-negative">{dailyError}</p>}
        {dailyReading && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-ink">
            {highlightGlossaryTerms(dailyReading.body)}
          </motion.p>
        )}
        <div className="mt-4 flex gap-4 text-xs text-ink-faint">
          <span>
            <GlossaryTerm term="personal year">Personal Year</GlossaryTerm> {personalCycles.personalYear.value}
          </span>
          <span>
            <GlossaryTerm term="personal month">Personal Month</GlossaryTerm> {personalCycles.personalMonth.value}
          </span>
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-lg">Your core numbers</h2>
        <p className="mt-1 text-sm text-ink-muted">Pythagorean system.</p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[360px] text-sm">
            <tbody className="divide-y divide-line">
              {CORE_NUMBER_ROWS.map(({ key, label, glossaryTerm }) => (
                <tr key={key}>
                  <td className="py-3 pr-4 text-ink-muted">
                    <GlossaryTerm term={glossaryTerm}>{label}</GlossaryTerm>
                  </td>
                  <td className="py-3">
                    <NumberBadge result={coreNumbers[key] as NumberResult} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="space-y-4">
        {CORE_NUMBER_ROWS.map(({ key, label }) => {
          const result = coreNumbers[key] as NumberResult
          const meaning = meaningForNumber(result.value)
          return (
            <Card key={key}>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base">
                  {label} {result.value} — {meaning.title}
                </h3>
                {result.isMaster && <Badge variant="accent">Master Number</Badge>}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-positive">Strengths</p>
                  <ul className="mt-2 space-y-1 text-sm text-ink">
                    {meaning.positiveTraits.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Growth edge</p>
                  <ul className="mt-2 space-y-1 text-sm text-ink-muted">
                    {meaning.shadowTraits.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="mt-4 text-sm text-ink-muted">
                <span className="font-medium text-ink">Life lesson: </span>
                {meaning.lifeLesson}
              </p>
            </Card>
          )
        })}
      </div>

      <Card>
        <h2 className="font-display text-lg">Your numbers, explained</h2>
        <p className="mt-1 text-sm text-ink-muted">A synthesized reading pulling all 5 numbers together.</p>
        <Button
          variant={reading ? 'outline' : 'accent'}
          size="lg"
          className="mt-4"
          onClick={generateReading}
          disabled={generating || loadingExisting}
        >
          {generating ? 'Reading your numbers…' : reading ? 'Generate a fresh reading' : 'Generate my numerology reading'}
        </Button>
        {readingError && (
          <div className="mt-3 rounded-xl border border-negative/30 bg-negative/5 px-4 py-3">
            <p className="text-sm text-negative">{readingError}</p>
            <button onClick={generateReading} className="mt-2 text-sm text-ink-muted underline hover:text-ink">
              Try again
            </button>
          </div>
        )}
        {(generating || loadingExisting) && !reading && (
          <div className="mt-5 space-y-2 border-t border-line pt-5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        )}
        {reading && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-5 border-t border-line pt-5"
          >
            <p className="text-ink">{highlightGlossaryTerms(reading.body)}</p>
          </motion.div>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-2 text-ink-muted">
          <Heart className="size-4" strokeWidth={1.75} />
          <span className="text-xs font-medium uppercase tracking-wide">Compatibility</span>
        </div>
        <h2 className="mt-2 font-display text-lg">Check a match</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Life Path, Expression, and Soul Urge — 3 of the numbers most commonly used for matching.
        </p>

        <form onSubmit={generateCompatibility} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Their name"
            value={partnerName}
            onChange={(e) => {
              setPartnerName(e.target.value)
              setCompatReading(null)
            }}
          />
          <Input
            type="date"
            value={partnerDob}
            onChange={(e) => {
              setPartnerDob(e.target.value)
              setCompatReading(null)
            }}
          />
        </form>

        {compatPreview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5 border-t border-line pt-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-muted">
                {selfBirthProfile.name} & {partnerName}
              </span>
              <span className="nums-tabular font-display text-2xl text-accent">
                {compatPreview.total}/{compatPreview.max}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {compatPreview.dimensions.map((d) => (
                <div key={d.key}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{d.label}</span>
                    <span className="nums-tabular text-ink-muted">
                      {d.valueA} & {d.valueB} — {d.verdict}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-paper-sunken">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(d.points / d.max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button type="button" variant="accent" onClick={generateCompatibility} disabled={compatLoading}>
                {compatLoading ? 'Reading the match…' : compatReading ? 'Regenerate reading' : 'Get the full reading'}
              </Button>
              <Button type="button" variant="outline" onClick={shareCompatibility}>
                <Share2 className="size-4" strokeWidth={1.75} />
                {shareStatus === 'copied' ? 'Copied!' : 'Share'}
              </Button>
            </div>

            {compatError && <p className="mt-3 text-sm text-negative">{compatError}</p>}

            {compatReading && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 border-t border-line pt-5 text-ink"
              >
                {highlightGlossaryTerms(compatReading.body)}
              </motion.p>
            )}
          </motion.div>
        )}
      </Card>
    </div>
  )
}
