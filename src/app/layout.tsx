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
          colorNeutral: '#e8e6e3',
          colorTextOnPrimaryBackground: '#0a0a0f',
        },
        elements: {
          // Global
          card: 'bg-[#12121a] border border-[#2a2a3a] shadow-2xl',
          navbar: 'bg-[#12121a] border-r border-[#2a2a3a]',
          navbarButton: 'text-[#e8e6e3] hover:bg-[#1a1a27]',
          navbarButtonIcon: 'text-[#8a8692]',
          pageScrollBox: 'bg-[#12121a]',
          page: 'bg-[#12121a]',
          rootBox: '[color-scheme:dark]',

          // Headers
          headerTitle: 'text-[#e8e6e3]',
          headerSubtitle: 'text-[#8a8692]',

          // Forms
          formFieldInput: 'bg-[#1a1a27] border-[#2a2a3a] text-[#e8e6e3]',
          formFieldLabel: 'text-[#8a8692]',
          formFieldHintText: 'text-[#8a8692]',
          formButtonPrimary: 'bg-[#c4a1ff] text-[#0a0a0f] hover:bg-[#b48cff]',
          formButtonReset: 'text-[#c4a1ff] hover:text-[#b48cff]',

          // Buttons
          socialButtonsBlockButton: 'bg-[#1a1a27] border-[#2a2a3a] text-[#e8e6e3] hover:bg-[#2a2a3a]',

          // Profile / User
          profileSection: 'border-[#2a2a3a]',
          profileSectionTitle: 'text-[#e8e6e3] border-[#2a2a3a]',
          profileSectionTitleText: 'text-[#e8e6e3]',
          profileSectionContent: 'text-[#e8e6e3]',
          profileSectionPrimaryButton: 'text-[#c4a1ff] hover:text-[#b48cff]',
          profilePage: 'bg-[#12121a]',
          accordionTriggerButton: 'text-[#e8e6e3] hover:bg-[#1a1a27]',
          accordionContent: 'bg-[#12121a]',

          // Misc
          badge: 'bg-[#1a1a27] text-[#8a8692] border-[#2a2a3a]',
          menuButton: 'text-[#e8e6e3] hover:bg-[#1a1a27]',
          menuList: 'bg-[#12121a] border-[#2a2a3a]',
          menuItem: 'text-[#e8e6e3] hover:bg-[#1a1a27]',
          modalBackdrop: 'bg-black/60',
          modalContent: 'bg-[#12121a] border border-[#2a2a3a]',
          userButtonPopoverCard: 'bg-[#12121a] border border-[#2a2a3a]',
          userButtonPopoverActionButton: 'text-[#e8e6e3] hover:bg-[#1a1a27]',
          userButtonPopoverActionButtonText: 'text-[#e8e6e3]',
          userButtonPopoverActionButtonIcon: 'text-[#8a8692]',
          userButtonPopoverFooter: 'border-[#2a2a3a]',
          footerActionLink: 'text-[#c4a1ff] hover:text-[#c4a1ff]',
          footerActionText: 'text-[#8a8692]',

          // Active sections
          activeDevice: 'bg-[#1a1a27] border-[#2a2a3a]',
          activeDeviceListItem: 'text-[#e8e6e3]',
        },
      }}
    >
      <html lang="en">
        <body className="min-h-screen">{children}</body>
      </html>
    </ClerkProvider>
  )
}
