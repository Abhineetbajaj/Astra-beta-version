import type { UserProfile } from '@/types/domain'

interface StoredAccount {
  email: string
  password: string
  profile: UserProfile
}

const STORAGE_KEY = 'astra-accounts'

function readAccounts(): StoredAccount[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function writeAccounts(accounts: StoredAccount[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
}

function newProfile(email: string, displayName: string): UserProfile {
  return {
    id: crypto.randomUUID(),
    email,
    displayName,
    birthData: null,
    isPremium: false,
    createdAt: new Date().toISOString(),
  }
}

export function signUpWithEmail(email: string, password: string, displayName: string): UserProfile {
  const accounts = readAccounts()
  if (accounts.some((a) => a.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('An account with this email already exists — try signing in instead.')
  }
  const profile = newProfile(email, displayName)
  accounts.push({ email, password, profile })
  writeAccounts(accounts)
  return profile
}

export function signInWithEmail(email: string, password: string): UserProfile {
  const accounts = readAccounts()
  const account = accounts.find((a) => a.email.toLowerCase() === email.toLowerCase())
  if (!account || account.password !== password) {
    throw new Error('That email and password don’t match an account.')
  }
  return account.profile
}

/** No real OAuth here — a deterministic fake identity standing in for "Continue with Google". */
export function signInWithGoogleMock(): UserProfile {
  const email = 'you@gmail.com'
  const accounts = readAccounts()
  const existing = accounts.find((a) => a.email === email)
  if (existing) return existing.profile

  const profile = newProfile(email, 'You')
  accounts.push({ email, password: '', profile })
  writeAccounts(accounts)
  return profile
}

export function persistProfileUpdate(profile: UserProfile) {
  const accounts = readAccounts()
  const idx = accounts.findIndex((a) => a.email === profile.email)
  if (idx >= 0) {
    accounts[idx].profile = profile
    writeAccounts(accounts)
  }
}
