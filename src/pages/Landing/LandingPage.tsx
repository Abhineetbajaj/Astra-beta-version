import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { Compass, Heart, MessageCircle, Users, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import ZodiacWheelSVG from '@/components/chart/ZodiacWheelSVG'
import { computeNatalChart } from '@/astro-engine'

const FEATURES = [
  {
    Icon: Compass,
    title: 'A real natal chart',
    body: 'Lahiri ayanamsa, whole-sign houses, Vimshottari dasha — computed from your actual birth data, not a template.',
  },
  {
    Icon: Heart,
    title: 'Compatibility, done properly',
    body: 'Synastry from two real charts — Moon-sign pacing, temperament, and vitality, explained plainly.',
  },
  {
    Icon: MessageCircle,
    title: 'Ask Astra anything',
    body: 'A chart-aware chat that answers from your actual placements, not generic horoscope copy.',
  },
  {
    Icon: Users,
    title: 'Talk to a person',
    body: 'When you want a human read instead of a computed one, connect with a live astrologer.',
  },
] as const

const STEPS = [
  { n: '01', title: 'Enter your birth details', body: 'Date, time, and place — exact or approximate.' },
  { n: '02', title: 'We compute your real chart', body: 'Sidereal positions, houses, nakshatras, dasha — done properly.' },
  { n: '03', title: 'Read, ask, revisit', body: 'A daily reading, a chat that knows your chart, and a full chart page whenever you want it.' },
] as const

const FAQS = [
  {
    q: 'What makes this "real" astrology?',
    a: 'Planetary positions are computed from actual astronomical data (not randomized), converted to the sidereal zodiac using the Lahiri ayanamsa, with whole-sign houses and a genuine Vimshottari dasha timeline.',
  },
  {
    q: "What if I don't know my exact birth time?",
    a: "You can mark your time as approximate. We'll still compute your planets and nakshatras correctly — we just won't show your ascendant or house placements, since those need an exact time to be meaningful.",
  },
  {
    q: 'Is this free?',
    a: 'Yes — your daily reading and chart are free. Premium adds weekly deep-dives and unlimited compatibility reads.',
  },
] as const

function useHeroChart() {
  return useMemo(
    () =>
      computeNatalChart({
        dateTimeUTC: new Date('2000-01-01T00:00:00Z'),
        lat: 28.6139,
        lon: 77.209,
        timeKnown: true,
      }),
    [],
  )
}

export default function LandingPage() {
  const heroChart = useHeroChart()

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="font-display text-xl">Astra</span>
          <nav className="hidden items-center gap-8 text-sm text-ink-muted md:flex">
            <a href="#how-it-works" className="hover:text-ink">
              How it works
            </a>
            <a href="#features" className="hover:text-ink">
              Features
            </a>
            <Link to="/pricing" className="hover:text-ink">
              Pricing
            </Link>
            <a href="#faq" className="hover:text-ink">
              FAQ
            </a>
          </nav>
          <Button asChild size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-faint">
            Vedic astrology, computed properly
          </p>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] lg:text-6xl">
            Your stars, <span className="italic text-accent">decoded daily.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-ink-muted">
            A calm, personal reading built from your real birth chart — delivered every
            morning. Vedic depth, plain language, no clutter.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button asChild variant="accent" size="lg">
              <Link to="/auth">
                Open your dashboard <ArrowRight className="size-4" strokeWidth={1.75} />
              </Link>
            </Button>
            <a href="#how-it-works" className="text-sm text-ink-muted hover:text-ink">
              See how it works
            </a>
          </div>
          <p className="mt-4 text-xs text-ink-faint">
            Free to start · No credit card · A real chart in under a minute
          </p>
        </div>
        <div className="flex justify-center">
          <ZodiacWheelSVG
            placements={heroChart.placements}
            ascendant={heroChart.ascendant}
            size={360}
            className="opacity-90"
          />
        </div>
      </section>

      <section id="how-it-works" className="border-t border-line bg-paper-raised/40 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-3xl">How it works</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n}>
                <p className="font-display text-2xl text-accent">{s.n}</p>
                <h3 className="mt-2 font-medium">{s.title}</h3>
                <p className="mt-1.5 text-sm text-ink-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-3xl">Everything built on your real chart</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {FEATURES.map(({ Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-line p-6">
                <Icon className="size-5 text-accent" strokeWidth={1.5} />
                <h3 className="mt-3 font-medium">{title}</h3>
                <p className="mt-1.5 text-sm text-ink-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-ink py-20 text-paper">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="font-display text-3xl italic">"The stars incline us, they do not bind us."</h2>
          <p className="mt-3 text-sm text-paper/60">— Ptolemy</p>
          <Button asChild variant="accent" size="lg" className="mt-8">
            <Link to="/auth">
              Get your reading <ArrowRight className="size-4" strokeWidth={1.75} />
            </Link>
          </Button>
        </div>
      </section>

      <section id="faq" className="py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="font-display text-3xl">Questions</h2>
          <div className="mt-8 divide-y divide-line">
            {FAQS.map((f) => (
              <div key={f.q} className="py-5">
                <h3 className="font-medium">{f.q}</h3>
                <p className="mt-2 text-sm text-ink-muted">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-line py-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-sm text-ink-faint">
          <span className="font-display text-ink">Astra</span>
          <span>Built on your real birth chart.</span>
        </div>
      </footer>
    </div>
  )
}
