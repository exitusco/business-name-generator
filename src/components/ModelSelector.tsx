'use client';

import { useState, useRef, useEffect } from 'react';
import { AI_MODELS } from '@/lib/features';
import type { AIModel } from '@/lib/features';
import { ProBadge } from './ProGate';

interface ModelSelectorProps {
  selectedModel: string;
  onSelect: (modelId: string) => void;
  availableModels: AIModel[];
}

export default function ModelSelector({ selectedModel, onSelect, availableModels }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const availableIds = new Set(availableModels.map(m => m.id));
  const current = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--accent-dim)] transition-colors"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
        <span className="text-[var(--text-primary)]">{current.name}</span>
        <span className="text-[var(--text-secondary)]/50">{current.provider}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-secondary)]">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-[var(--border)]">
            <span className="text-[10px] text-[var(--text-secondary)]/50 uppercase tracking-wider">Select AI Model</span>
          </div>
          <div className="py-1">
            {AI_MODELS.map(model => {
              const isAvailable = availableIds.has(model.id);
              const isSelected = model.id === selectedModel;

              return (
                <button
                  key={model.id}
                  onClick={() => {
                    if (isAvailable) {
                      onSelect(model.id);
                      setOpen(false);
                    }
                  }}
                  disabled={!isAvailable}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    isSelected
                      ? 'bg-[var(--accent)]/[0.08]'
                      : isAvailable
                        ? 'hover:bg-white/[0.03]'
                        : 'opacity-40 cursor-not-allowed'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-[var(--accent)]' : isAvailable ? 'bg-[var(--text-secondary)]/30' : 'bg-[var(--text-secondary)]/15'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${isAvailable ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]/50'}`}>
                        {model.name}
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)]/40">{model.provider}</span>
                      {model.tier === 'pro' && <ProBadge />}
                    </div>
                    <p className={`text-[10px] mt-0.5 ${isAvailable ? 'text-[var(--text-secondary)]/60' : 'text-[var(--text-secondary)]/30'}`}>
                      {model.description}
                    </p>
                  </div>
                  {isSelected && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
