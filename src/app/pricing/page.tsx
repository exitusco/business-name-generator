import { PricingTable } from '@clerk/nextjs';
import AppShell from '@/components/AppShell';

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <AppShell />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-semibold text-center mb-2 text-[var(--text-primary)]">Choose your plan</h1>
        <p className="text-center text-[var(--text-secondary)] mb-10 text-sm">Unlock advanced AI models, chat assistance, and verified domain checks.</p>
        <PricingTable />
      </main>
    </div>
  );
}
