import type { Metadata } from 'next'
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
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
