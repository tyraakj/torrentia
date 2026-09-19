import React from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './lib/wagmi'
import { Navbar } from './components/layout/Navbar'
import { Landing } from './pages/Landing'
import { ModelDetail } from './pages/ModelDetail'
import { Upload } from './pages/Upload'
import { Dashboard } from './pages/Dashboard'
import { Marketplace } from './pages/Marketplace'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
})

const AppShell: React.FC = () => {
  const location = useLocation()
  const isLanding = location.pathname === '/'

  if (isLanding) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
      </Routes>
    )
  }

  return (
    <div className="torrentia-app-shell">
      <Navbar />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/model/:id" element={<ModelDetail />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  )
}

export const App: React.FC = () => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
