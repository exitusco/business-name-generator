'use client';

import { useState, useEffect, useRef } from 'react';

export interface SuggestedChangeUI {
  field: string;
  label: string;
  value: any;
  displayValue: string;
  action: 'set' | 'append';
  status: 'pending' | 'accepted' | 'rejected';
}

export interface ChatMsg {
  id: string;
  role: 'user' | 'assistant' | 'system-event';
  content: string;
  timestamp: number;
  suggestedChanges?: SuggestedChangeUI[];
}

interface ChatSidebarProps {
  messages: ChatMsg[];
  onSend: (text: string) => void;
  onAcceptChange: (msgId: string, changeIndex: number) => void;
  onRejectChange: (msgId: string, changeIndex: number) => void;
  isLoading: boolean;
  isOpen: boolean;
  onToggle: () => void;
  unreadCount: number;
}

export default function ChatSidebar({ messages, onSend, onAcceptChange, onRejectChange, isLoading, isOpen, onToggle, unreadCount }: ChatSidebarProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    onSend(text);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  // Shared message list JSX
  const messageListContent = (
    <>
      {messages.length === 0 && (
        <div className="text-center py-8">
          <p className="text-xs text-[var(--text-secondary)]/60">Chat with your naming assistant...</p>
          <p className="text-[10px] text-[var(--text-secondary)]/40 mt-1">Tell me what you like, what you don&apos;t, or ask for a new direction.</p>
        </div>
      )}
      {messages.map((msg) => (
        <div key={msg.id}>
          {msg.role === 'system-event' ? (
            <div className="flex items-center gap-2 py-1">
              <div className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-[10px] text-[var(--text-secondary)]/50 shrink-0">{msg.content}</span>
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>
          ) : msg.role === 'user' ? (
            <div className="flex justify-end">
              <div className="max-w-[85%] bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-2xl rounded-br-md px-3 py-2">
                <p className="text-sm text-[var(--text-primary)]">{msg.content}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-start">
              <div className="max-w-[90%] space-y-2">
                {msg.content && (
                  <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl rounded-bl-md px-3 py-2">
                    <p className="text-sm text-[var(--text-primary)]">{msg.content}</p>
                  </div>
                )}
                {msg.suggestedChanges && msg.suggestedChanges.length > 0 && (
                  <div className="space-y-1.5">
                    {msg.suggestedChanges.map((sc, idx) => (
                      <div key={idx} className={`rounded-xl border px-3 py-2 text-xs ${
                        sc.status === 'accepted' ? 'bg-[#22c55e]/8 border-[#22c55e]/20' :
                        sc.status === 'rejected' ? 'bg-white/[0.02] border-[var(--border)] opacity-50' :
                        'bg-[var(--accent)]/5 border-[var(--accent)]/20'
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[var(--text-secondary)]">{sc.action === 'append' ? 'Add to' : 'Update'} </span>
                            <span className="text-[var(--text-primary)] font-medium">{sc.label}</span>
                            <span className="text-[var(--text-secondary)]"> → </span>
                            <span className="text-[var(--accent)]">{sc.displayValue}</span>
                          </div>
                          {sc.status === 'pending' ? (
                            <div className="flex gap-1.5 shrink-0">
                              <button onClick={() => onAcceptChange(msg.id, idx)}
                                className="px-2.5 py-1 rounded-lg bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e]/20 transition-colors font-medium">
                                Accept
                              </button>
                              <button onClick={() => onRejectChange(msg.id, idx)}
                                className="px-2.5 py-1 rounded-lg bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 transition-colors">
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className={`shrink-0 text-[10px] uppercase tracking-wider ${
                              sc.status === 'accepted' ? 'text-[#22c55e]' : 'text-[var(--text-secondary)]/50'
                            }`}>
                              {sc.status === 'accepted' ? '✓ Applied' : 'Dismissed'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl rounded-bl-md px-3 py-2">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-white/30 rounded-full pulse" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-white/30 rounded-full pulse" style={{ animationDelay: '200ms' }} />
              <span className="w-1.5 h-1.5 bg-white/30 rounded-full pulse" style={{ animationDelay: '400ms' }} />
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Shared input bar JSX
  const inputBar = (
    <div className="shrink-0 border-t border-[var(--border)] p-3">
      <div className="flex gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tell me what you're looking for..."
          rows={1}
          className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/40 resize-none"
          style={{ minHeight: '36px', maxHeight: '80px' }}
        />
        <button onClick={handleSubmit} disabled={!input.trim() || isLoading}
          className="px-3 py-2 bg-[var(--accent)] text-[#0a0a0f] rounded-xl text-sm font-medium hover:opacity-90 transition-all disabled:opacity-30 shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ===== MOBILE ===== */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-[90] bg-[var(--bg-secondary)] border-t border-[var(--border)]">
        {isOpen ? (
          <div className="h-[60vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Naming Assistant</span>
              <button onClick={onToggle} className="p-1 rounded text-[var(--text-secondary)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
              </button>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messageListContent}
            </div>
            {inputBar}
          </div>
        ) : (
          <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3">
            <div className="relative">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[var(--accent)] text-[#0a0a0f] text-[9px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>
              )}
            </div>
            <span className="text-sm text-[var(--text-secondary)] truncate flex-1 text-left">
              {messages.length > 0
                ? messages[messages.length - 1].content.slice(0, 60) + (messages[messages.length - 1].content.length > 60 ? '…' : '')
                : 'Chat with your naming assistant...'}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
          </button>
        )}
      </div>

      {/* ===== DESKTOP ===== */}
      <div className="hidden sm:block">
        {isOpen ? (
          <div className="fixed top-14 right-0 bottom-0 w-[340px] bg-[var(--bg-secondary)] border-l border-[var(--border)] z-[80] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
              <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Naming Assistant</span>
              <button onClick={onToggle} className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]" title="Hide chat">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 17l5-5-5-5M6 17l5-5-5-5"/></svg>
              </button>
            </div>
            <div ref={!isOpen ? undefined : scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messageListContent}
            </div>
            {inputBar}
          </div>
        ) : (
          <button onClick={onToggle}
            className="fixed top-1/2 -translate-y-1/2 right-0 z-[80] bg-[var(--bg-secondary)] border border-[var(--border)] border-r-0 rounded-l-xl px-2 py-4 hover:bg-[var(--bg-elevated)] transition-colors"
            title="Open chat">
            <div className="relative">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-2 -left-2 w-5 h-5 bg-[var(--accent)] text-[#0a0a0f] text-[9px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>
              )}
            </div>
          </button>
        )}
      </div>
    </>
  );
}
