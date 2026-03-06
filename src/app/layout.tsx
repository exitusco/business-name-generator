import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
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
        baseTheme: dark,
        variables: {
          colorPrimary: '#c4a1ff',
          colorBackground: '#12121a',
          colorInputBackground: '#1a1a27',
          colorInputText: '#e8e6e3',
        },
      }}
    >
      <html lang="en">
        <body className="min-h-screen">{children}</body>
      </html>
    </ClerkProvider>
  )
}
