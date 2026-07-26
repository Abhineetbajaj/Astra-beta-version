import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/store/authStore'
import { signInWithEmail, signUpWithEmail, signInWithGoogleMock } from '@/services/authService'

export default function AuthPage() {
  const navigate = useNavigate()
  const signIn = useAuthStore((s) => s.signIn)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  function afterAuth(profile: Parameters<typeof signIn>[0]) {
    signIn(profile)
    navigate(profile.birthData ? '/dashboard' : '/onboarding')
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const profile =
        mode === 'signin'
          ? signInWithEmail(email, password)
          : signUpWithEmail(email, password, name || email.split('@')[0])
      afterAuth(profile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  function handleGoogle() {
    afterAuth(signInWithGoogleMock())
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-fixed-dark p-12 text-fixed-dark-ink lg:flex">
        <Link to="/" className="font-display text-2xl">
          Astra
        </Link>
        <div className="max-w-sm">
          <p className="font-display text-3xl italic leading-snug">
            "The chart is not fate — it's the terrain. You still choose the route."
          </p>
        </div>
        <p className="text-sm text-fixed-dark-ink/50">A calm, precise Vedic practice.</p>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <Sparkles className="size-5 text-accent" strokeWidth={1.75} />
            <span className="font-display text-xl">Astra</span>
          </div>

          <h1 className="font-display text-3xl">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            {mode === 'signin'
              ? 'Sign in to see today’s reading.'
              : 'A minute of setup, then your real chart.'}
          </p>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="mt-8 w-full"
            onClick={handleGoogle}
          >
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-ink-faint">
            <div className="h-px flex-1 bg-line" />
            or with email
            <div className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <Input
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            )}
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={4}
            />

            {error && <p className="text-sm text-negative">{error}</p>}

            <Button type="submit" size="lg" className="w-full">
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-muted">
            {mode === 'signin' ? (
              <>
                New to Astra?{' '}
                <button className="text-accent hover:underline" onClick={() => setMode('signup')}>
                  Create account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button className="text-accent hover:underline" onClick={() => setMode('signin')}>
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
