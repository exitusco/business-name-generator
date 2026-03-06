import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata: Metadata = {
  title: 'Poacher — AI Domain Name Generator',
  description: 'Find the perfect business name with AI-powered suggestions and real-time domain availability.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#c4a1ff',
          colorBackground: '#12121a',
          colorInputBackground: '#1a1a27',
          colorInputText: '#e8e6e3',
          colorText: '#e8e6e3',
          colorTextSecondary: '#8a8692',
          colorDanger: '#f87171',
          colorSuccess: '#22c55e',
        },
        elements: {
          card: 'bg-[#12121a] border border-[#2a2a3a] shadow-2xl',
          headerTitle: 'text-[#e8e6e3]',
          headerSubtitle: 'text-[#8a8692]',
          socialButtonsBlockButton: 'bg-[#1a1a27] border-[#2a2a3a] text-[#e8e6e3] hover:bg-[#2a2a3a]',
          formFieldInput: 'bg-[#1a1a27] border-[#2a2a3a] text-[#e8e6e3]',
          footerActionLink: 'text-[#c4a1ff] hover:text-[#c4a1ff]',
        },
      }}
    >
      <html lang="en">
        <body className="min-h-screen">{children}</body>
      </html>
    </ClerkProvider>
  )
}
