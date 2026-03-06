import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[#6b4d8a] flex items-center justify-center">
            <span className="text-[#0a0a0f] font-bold text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>P</span>
          </div>
          <span className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
            Poacher
          </span>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'bg-[var(--bg-secondary)] border border-[var(--border)]',
            },
          }}
        />
      </div>
    </div>
  )
}
