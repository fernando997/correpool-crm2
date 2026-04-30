import type { Metadata } from 'next'
import './globals.css'
import { AppProvider } from '@/contexts/AppContext'

// CRM autenticado — desabilita pre-render estático em todas as páginas
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'CorrePool CRM - Gestao de Leads',
  description: 'Sistema de gestao de leads com analise de performance de marketing',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  )
}
