import { Routes, Route, Navigate } from 'react-router-dom'
import AuthGate from '@/components/layout/AuthGate'
import AppShell from '@/components/layout/AppShell'
import PremiumGate from '@/components/layout/PremiumGate'
import LandingPage from '@/pages/Landing/LandingPage'
import AuthPage from '@/pages/Auth/AuthPage'
import PricingPage from '@/pages/Pricing/PricingPage'
import OnboardingGate from '@/pages/Onboarding/OnboardingGate'
import OnboardingPage from '@/pages/Onboarding/OnboardingPage'
import DashboardPage from '@/pages/Dashboard/DashboardPage'
import NatalChartPage from '@/pages/NatalChart/NatalChartPage'
import CompatibilityPage from '@/pages/Compatibility/CompatibilityPage'
import ChatPage from '@/pages/Chat/ChatPage'
import AstrologerPage from '@/pages/Astrologer/AstrologerPage'
import FinancialPage from '@/pages/Financial/FinancialPage'
import HoroscopePage from '@/pages/Horoscope/HoroscopePage'
import SpiritualWellnessPage from '@/pages/SpiritualWellness/SpiritualWellnessPage'
import NumerologyPage from '@/pages/Numerology/NumerologyPage'
import WalletPage from '@/pages/Wallet/WalletPage'
import HistoryPage from '@/pages/History/HistoryPage'
import ProfilePage from '@/pages/Profile/ProfilePage'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/pricing" element={<PricingPage />} />

      <Route element={<OnboardingGate />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
      </Route>

      <Route element={<AuthGate />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/chart" element={<NatalChartPage />} />
          <Route path="/compatibility" element={<CompatibilityPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/horoscope" element={<HoroscopePage />} />
          <Route path="/wellness" element={<SpiritualWellnessPage />} />
          <Route path="/numerology" element={<NumerologyPage />} />
          <Route element={<PremiumGate />}>
            <Route path="/financial" element={<FinancialPage />} />
          </Route>
          {/* Astra AI is the astrologer experience. The sample-persona marketplace that used to
              live here is gone; these redirects keep old links and bookmarks working rather than
              dropping them on a blank route. */}
          <Route path="/astrologers" element={<AstrologerPage />} />
          <Route path="/astrologers/:id" element={<Navigate to="/astrologers" replace />} />
          <Route path="/consultations/:id" element={<Navigate to="/astrologers" replace />} />
          <Route path="/ai-astrologer" element={<Navigate to="/astrologers" replace />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
    </Routes>
  )
}
