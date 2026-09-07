import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Hash, Heart, Pencil, Share2, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabaseClient'
import { callEdgeFunction } from '@/lib/edgeFunctions'
import { computeCoreNumbers, computeNumerologyCompatibility, computePersonalCycles } from '@/numerology-engine'
import type { CoreNumbers, NumberResult, NumerologyCompatibility, NumerologySystem } from '@/numerology-engine'
import { chaldeanCompoundExpressionNumber, meaningForCompound } from '@/numerology-engine/chaldean'
import { bhagyankNumber, loShuGrid, missingNumbers, mulankNumber, namankNumber, noteForMissingNumber } from '@/numerology-engine/vedic'
import { meaningForNumber } from '@/data/numerologyMeanings'
import { NUMEROLOGY_SYSTEMS } from '@/data/numerologySystems'
import { planetForNumber } from '@/data/numerologyPlanets'
import { highlightGlossaryTerms } from '@/lib/highlightGlossaryTerms'
import GlossaryTerm from '@/components/GlossaryTerm'
import ShareCard from '@/components/share/ShareCard'
import { shareCardImage } from '@/lib/shareCardImage'
import LoShuGridDisplay from '@/components/numerology/LoShuGridDisplay'
import NumberOrb from '@/components/numerology/NumberOrb'
import Reveal from '@/components/motion/Reveal'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import CosmicLoader from '@/components/ui/CosmicLoader'
import { cn } from '@/lib/cn'
import type { NumerologyCompatibilityReadingRow, NumerologyDailyReadingRow, NumerologyReadingRow } from '@/types/db'

const CORE_NUMBER_ROWS: { key: keyof CoreNumbers; label: string; glossaryTerm: string }[] = [
  { key: 'lifePath', label: 'Life Path', glossaryTerm: 'life path number' },
  { key: 'expression', label: 'Expression', glossaryTerm: 'expression number' },
  { key: 'soulUrge', label: 'Soul Urge', glossaryTerm: 'soul urge number' },
  { key: 'personality', label: 'Personality', glossaryTerm: 'personality number' },
  { key: 'birthday', label: 'Birthday', glossaryTerm: 'birthday number' },
]

// Life Path gets the primary/hero treatment in "Your core numbers" — not an arbitrary pick, it's
// the one number this page already treats as the reader's defining number (see the giant faint
// watermark numeral behind the page's own H1 below), and it's one of only three numbers real
// enough to numerology matching to appear in the compatibility engine's own dimension list
// (src/numerology-engine/compatibility.ts), alongside Expression and Soul Urge. Personality and
// Birthday are real, unhidden, but genuinely more supporting per that same existing structure.
const [PRIMARY_NUMBER_ROW, ...SECONDARY_NUMBER_ROWS] = CORE_NUMBER_ROWS

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

  const [system, setSystem] = useState<NumerologySystem>('pythagorean')

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
  const [compatCardStatus, setCompatCardStatus] = useState<'idle' | 'working' | 'downloaded'>('idle')
  const [dailyCardStatus, setDailyCardStatus] = useState<'idle' | 'working' | 'downloaded'>('idle')
  const compatCardRef = useRef<HTMLDivElement>(null)
  const dailyCardRef = useRef<HTMLDivElement>(null)

  const coreNumbers = useMemo(() => {
    if (!selfBirthProfile) return null
    return computeCoreNumbers({
      fullName: selfBirthProfile.name,
      dateOfBirth: selfBirthProfile.date_of_birth,
      system,
    })
  }, [selfBirthProfile, system])

  // Chaldean-only: the compound (10-52) Expression total, never discarded in favor of just the
  // reduced root. Vedic-only: Mulank/Bhagyank/Namank plus the Lo Shu grid and its missing numbers.
  const chaldeanExtra = useMemo(() => {
    if (!selfBirthProfile || system !== 'chaldean') return null
    const expression = chaldeanCompoundExpressionNumber(selfBirthProfile.name)
    return { expression, meaning: meaningForCompound(expression.compound) }
  }, [selfBirthProfile, system])

  const vedicExtra = useMemo(() => {
    if (!selfBirthProfile || system !== 'vedic') return null
    const mulank = mulankNumber(selfBirthProfile.date_of_birth)
    const bhagyank = bhagyankNumber(selfBirthProfile.date_of_birth)
    const namank = namankNumber(selfBirthProfile.name)
    const grid = loShuGrid(selfBirthProfile.date_of_birth)
    return { mulank, bhagyank, namank, grid, missing: missingNumbers(grid) }
  }, [selfBirthProfile, system])

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

  // Read the most recent already-generated reading for the currently-selected system rather than
  // always demanding a fresh Gemini call — the AI budget is shared across every feature and user,
  // same pattern as FinancialPage. Re-runs (and clears the stale reading) whenever the system tab changes.
  useEffect(() => {
    setReading(null)
    if (!session || !selfBirthProfile) return setLoadingExisting(false)
    setLoadingExisting(true)
    let cancelled = false
    supabase
      .from('numerology_readings')
      .select('*')
      .eq('birth_profile_id', selfBirthProfile.id)
      .eq('system', system)
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
  }, [session, selfBirthProfile, system])

  async function generateReading() {
    if (!selfBirthProfile) return
    setGenerating(true)
    setReadingError(null)
    try {
      const { reading } = await callEdgeFunction<{ reading: NumerologyReadingRow }>('numerology-reading', {
        birthProfileId: selfBirthProfile.id,
        system,
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
    if (!compatPreview || !compatCardRef.current) return
    setCompatCardStatus('working')
    const result = await shareCardImage(compatCardRef.current, {
      fileName: `astra-compatibility-${selfBirthProfile?.name}-${partnerName}.png`,
      shareText: `${selfBirthProfile?.name} & ${partnerName}'s numerology compatibility — check yours on Astra.`,
    })
    setCompatCardStatus(result === 'downloaded' ? 'downloaded' : 'idle')
    if (result === 'downloaded') setTimeout(() => setCompatCardStatus('idle'), 2000)
  }

  async function shareDailyCard() {
    if (!dailyCardRef.current) return
    setDailyCardStatus('working')
    const result = await shareCardImage(dailyCardRef.current, {
      fileName: 'astra-personal-day.png',
      shareText: "My Astra numerology Personal Day — check yours.",
    })
    setDailyCardStatus(result === 'downloaded' ? 'downloaded' : 'idle')
    if (result === 'downloaded') setTimeout(() => setDailyCardStatus('idle'), 2000)
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

  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div className="relative text-center">
        {/* The reader's own Life Path number, huge and barely there — atmosphere that is
            specific to them rather than generic decoration. */}
        <span
          aria-hidden="true"
          className="nums-tabular pointer-events-none absolute -top-10 left-1/2 -z-10 -translate-x-1/2 select-none font-display text-[13rem] leading-none text-ink opacity-[0.045]"
        >
          {coreNumbers.lifePath.value}
        </span>
        <Hash className="mx-auto size-6 text-accent" strokeWidth={1.5} />
        <h1 className="mt-3 font-display text-4xl">Numerology</h1>
        <p className="mt-2 text-ink-muted">
          Your core numbers, computed the {NUMEROLOGY_SYSTEMS.find((s) => s.id === system)?.label} way, from{' '}
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

      <div className="flex justify-center gap-1.5 rounded-full border border-line bg-paper-raised p-1">
        {NUMEROLOGY_SYSTEMS.map((s) => (
          <button
            key={s.id}
            type="button"
            title={s.blurb}
            aria-pressed={system === s.id}
            onClick={() => setSystem(s.id)}
            className={cn(
              // isolate is load-bearing, not decorative: without its own stacking context this
              // button's -z-10 pill span paints behind the track div's own bg-paper-raised
              // background and is invisible (the active tab then reads only as a text-colour
              // change). AppShell's nav pill avoids this only because its sticky/z-30 header
              // already establishes a stacking context with no opaque layer in between.
              'isolate relative flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
              system === s.id ? 'text-ink' : 'text-ink-muted hover:text-ink',
            )}
          >
            {/* Same shared-layout sliding-pill technique as AppShell's nav (layoutId), kept in
                this control's own quieter skin (flat bg-paper lift, no accent ring/glow) rather
                than borrowing the nav's glow treatment — this is a secondary toggle, not primary
                navigation. */}
            {system === s.id && (
              <motion.span
                layoutId="numerology-system-pill"
                className="absolute inset-0 -z-10 rounded-full bg-paper shadow-sm"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            {s.label}
          </button>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-ink-muted">
            <Sparkles className="size-4" strokeWidth={1.75} />
            <span className="text-xs font-medium uppercase tracking-wide">
              Today's <GlossaryTerm term="personal day">Personal Day</GlossaryTerm>
            </span>
          </div>
          <span className="text-xs text-ink-faint">{todayLabel}</span>
        </div>

        <div className="mt-6 flex flex-col items-center gap-4">
          <NumberOrb
            value={personalCycles.personalDay.value}
            isMaster={personalCycles.personalDay.isMaster}
            size="lg"
          />
          {/* Personal Year/Month grouped right under the day number as its immediate context —
              previously a footer afterthought competing with the Share button for space. */}
          <div className="flex items-center gap-3 text-xs text-ink-faint">
            <span>
              <GlossaryTerm term="personal year">Personal Year</GlossaryTerm>{' '}
              <span className="nums-tabular text-ink-muted">{personalCycles.personalYear.value}</span>
            </span>
            <span aria-hidden="true" className="h-3 w-px bg-line" />
            <span>
              <GlossaryTerm term="personal month">Personal Month</GlossaryTerm>{' '}
              <span className="nums-tabular text-ink-muted">{personalCycles.personalMonth.value}</span>
            </span>
          </div>
        </div>

        {loadingDaily && (
          <div className="mx-auto mt-6 max-w-md space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}
        {dailyError && <p className="mt-4 text-center text-sm text-negative">{dailyError}</p>}
        {dailyReading && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mx-auto mt-6 max-w-md text-center font-display text-lg leading-snug text-ink"
          >
            {highlightGlossaryTerms(dailyReading.body)}
          </motion.p>
        )}

        <div className="mt-6 flex justify-center border-t border-line pt-5">
          <Button type="button" variant="outline" size="sm" onClick={shareDailyCard} disabled={dailyCardStatus === 'working'}>
            <Share2 className="size-3.5" strokeWidth={1.75} />
            {dailyCardStatus === 'working' ? 'Preparing…' : dailyCardStatus === 'downloaded' ? 'Downloaded!' : 'Share'}
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-lg">Your core numbers</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {NUMEROLOGY_SYSTEMS.find((s) => s.id === system)?.label} system.
        </p>
        {/* Life Path as a primary hero area, the remaining four as a plain 2x2 of supporting
            numbers — not five identical bordered boxes. Removing the per-item card border/bg
            here matters as much as the split itself: this whole section already lives inside
            one Card, and five smaller cards nested inside it was the literal "card inside a
            card" pattern the brief calls out. Spacing and typography carry the hierarchy now,
            and four items always tile evenly in a 2-col grid, which also resolves the leftover
            empty cell the old 3-col/5-item grid left on wider screens. */}
        <div className="mt-6 grid gap-8 sm:grid-cols-[auto_1fr] sm:items-center">
          <Reveal>
            <div className="flex flex-col items-center gap-3 text-center sm:border-r sm:border-line sm:pr-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                <GlossaryTerm term={PRIMARY_NUMBER_ROW.glossaryTerm}>{PRIMARY_NUMBER_ROW.label}</GlossaryTerm>
              </p>
              <NumberOrb
                value={(coreNumbers[PRIMARY_NUMBER_ROW.key] as NumberResult).value}
                isMaster={(coreNumbers[PRIMARY_NUMBER_ROW.key] as NumberResult).isMaster}
                size="lg"
              />
              <p className="max-w-[11rem] text-sm text-ink-muted">
                {meaningForNumber((coreNumbers[PRIMARY_NUMBER_ROW.key] as NumberResult).value).title}
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 gap-x-6 gap-y-6">
            {SECONDARY_NUMBER_ROWS.map(({ key, label, glossaryTerm }, i) => {
              const result = coreNumbers[key] as NumberResult
              return (
                <Reveal key={key} delay={0.08 + i * 0.06}>
                  <div className="group flex flex-col items-center gap-2 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                      <GlossaryTerm term={glossaryTerm}>{label}</GlossaryTerm>
                    </p>
                    <NumberOrb value={result.value} isMaster={result.isMaster} />
                    <p className="text-xs text-ink-muted transition-colors duration-200 group-hover:text-ink">
                      {meaningForNumber(result.value).title}
                    </p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>

        {chaldeanExtra && (
          <div className="mt-5 border-t border-line pt-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-muted">Compound Expression</span>
              <span className="nums-tabular text-lg text-ink">
                {chaldeanExtra.expression.root.value}{' '}
                <span className="text-ink-faint">(compound {chaldeanExtra.expression.compound})</span>
              </span>
            </div>
            {chaldeanExtra.meaning && (
              <div className="mt-2">
                <p className="font-medium text-ink">{chaldeanExtra.meaning.title}</p>
                <p className="text-sm text-ink-muted">{chaldeanExtra.meaning.summary}</p>
              </div>
            )}
            <p className="mt-3 text-xs text-ink-faint">
              Chaldean never discards the compound (10-52) total in favor of just its reduced root — both are read together.
            </p>
          </div>
        )}

        {vedicExtra && (
          <div className="mt-5 space-y-4 border-t border-line pt-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-muted">Mulank (Psychic/Driver)</span>
              <span className="nums-tabular text-ink">
                {vedicExtra.mulank} <span className="text-ink-faint">· ruled by {planetForNumber(vedicExtra.mulank)?.planet}</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-muted">Bhagyank (Destiny/Conductor)</span>
              <span className="nums-tabular text-ink">
                {vedicExtra.bhagyank} <span className="text-ink-faint">· ruled by {planetForNumber(vedicExtra.bhagyank)?.planet}</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-muted">Namank (Name Number)</span>
              <NumberBadge result={vedicExtra.namank} />
            </div>
            <div>
              <p className="mb-2 text-sm text-ink-muted">Lo Shu grid</p>
              <div className="max-w-[220px]">
                <LoShuGridDisplay grid={vedicExtra.grid} />
              </div>
              {vedicExtra.missing.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {vedicExtra.missing.map((n) => (
                    <p key={n} className="text-xs text-ink-faint">
                      <span className="font-medium text-ink-muted">Missing {n}:</span> {noteForMissingNumber(n)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      <div className="space-y-4">
        {CORE_NUMBER_ROWS.map(({ key, label }) => {
          const result = coreNumbers[key] as NumberResult
          const meaning = meaningForNumber(result.value)
          return (
            <Card key={key}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">{label}</p>
                  <h3 className="mt-1 font-display text-xl">
                    <span className="nums-tabular text-accent">{result.value}</span>{' '}
                    <span className="text-ink-faint">·</span> {meaning.title}
                  </h3>
                </div>
                {result.isMaster && <Badge variant="accent">Master Number</Badge>}
              </div>

              <div className="mt-5 max-w-2xl border-t border-line pt-5">
                {/* Strengths and Growth Edge are given genuinely different list treatments rather
                    than two identical plain columns: Strengths reads as a curated, numbered
                    editorial list (quick to scan, quietly confident); Growth Edge sits behind a
                    single quiet vertical guide with more open spacing, reading as a reflective
                    aside rather than a mirrored second list. The 3:2 column split matches the
                    real, consistent shape of this data (every entry in numerologyMeanings.ts has
                    more positiveTraits than shadowTraits) rather than an arbitrary ratio, and the
                    guide line doubles as the fix for the empty space a shorter Growth Edge column
                    used to leave — a real compositional element, not a stretch or filler. */}
                <div className="grid gap-6 sm:grid-cols-[3fr_2fr]">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-positive">Strengths</p>
                    <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink">
                      {meaning.positiveTraits.map((t, i) => (
                        <li key={t} className="flex items-baseline gap-3">
                          <span className="nums-tabular w-4 shrink-0 text-xs text-accent/60">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="border-t border-line pt-5 sm:border-t-0 sm:border-l sm:pl-6 sm:pt-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Growth edge</p>
                    <ul className="mt-3 space-y-3 text-sm leading-relaxed text-ink-muted">
                      {meaning.shadowTraits.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Real, already-existing copy (meaning.lifeLesson) given the same pull-quote
                    treatment as the Dashboard's Weekly Deep-Dive highlight — not a new or
                    fabricated line, just the existing "Life lesson" sentence given the visual
                    weight it already has conceptually. */}
                <p className="mt-6 text-xs font-medium uppercase tracking-wide text-ink-faint">Life lesson</p>
                <p className="mt-2 border-l-2 border-accent/40 pl-4 font-display text-lg italic leading-snug text-ink">
                  {meaning.lifeLesson}
                </p>
              </div>
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
        {generating && !reading && (
          <div className="mt-5 border-t border-line pt-5">
            <CosmicLoader label="Reading your numbers…" />
          </div>
        )}
        {loadingExisting && !generating && !reading && (
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
            <p className="max-w-xl text-[15px] leading-relaxed text-ink-muted">
              {highlightGlossaryTerms(reading.body)}
            </p>
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
              <Button type="button" variant="outline" onClick={shareCompatibility} disabled={compatCardStatus === 'working'}>
                <Share2 className="size-4" strokeWidth={1.75} />
                {compatCardStatus === 'working' ? 'Preparing…' : compatCardStatus === 'downloaded' ? 'Downloaded!' : 'Share'}
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

      {/* Off-screen — rendered only so shareCardImage() can capture them, never shown in layout. */}
      <div className="pointer-events-none fixed left-[-9999px] top-0" aria-hidden="true">
        {compatPreview && (
          <ShareCard
            ref={compatCardRef}
            variant="compatibility"
            data={{ selfName: selfBirthProfile.name, partnerName, compatibility: compatPreview }}
          />
        )}
        <ShareCard
          ref={dailyCardRef}
          variant="personalDay"
          data={{
            dateLabel: new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }),
            value: personalCycles.personalDay.value,
            isMaster: personalCycles.personalDay.isMaster,
            title: meaningForNumber(personalCycles.personalDay.value).title,
            blurb: meaningForNumber(personalCycles.personalDay.value).positiveTraits[0] ?? '',
          }}
        />
      </div>
    </div>
  )
}
