import { Routes, Route } from 'react-router-dom'
import AuthGate from '@/components/layout/AuthGate'
import AppShell from '@/components/layout/AppShell'
import LandingPage from '@/pages/Landing/LandingPage'
import AuthPage from '@/pages/Auth/AuthPage'
import PricingPage from '@/pages/Pricing/PricingPage'
import OnboardingGate from '@/pages/Onboarding/OnboardingGate'
import OnboardingPage from '@/pages/Onboarding/OnboardingPage'
import DashboardPage from '@/pages/Dashboard/DashboardPage'
import NatalChartPage from '@/pages/NatalChart/NatalChartPage'
import CompatibilityPage from '@/pages/Compatibility/CompatibilityPage'
import ChatPage from '@/pages/Chat/ChatPage'
import AstrologersPage from '@/pages/Astrologers/AstrologersPage'
import AstrologerDetailPage from '@/pages/Astrologers/AstrologerDetailPage'
import ConsultationPage from '@/pages/Astrologers/ConsultationPage'
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
          <Route path="/astrologers" element={<AstrologersPage />} />
          <Route path="/astrologers/:id" element={<AstrologerDetailPage />} />
          <Route path="/consultations/:id" element={<ConsultationPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
    </Routes>
  )
}
