import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  LogIn,
  MessageSquare,
  Send,
} from 'lucide-react';
import { CoopChatMessage, CoopSide, LobbyChatMessage } from '../types/game';

interface ChatPanelProps {
  variant: 'lobby' | 'coop';
  title: string;
  messages: Array<LobbyChatMessage | CoopChatMessage>;
  currentUid: string;
  isSignedIn: boolean;
  errorText?: string | null;
  defaultOpen?: boolean;
  onSendMessage: (text: string) => Promise<void>;
  onRequireSignIn?: () => void;
}

function isCoopMsg(msg: LobbyChatMessage | CoopChatMessage): msg is CoopChatMessage {
  return 'side' in msg;
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  variant,
  title,
  messages,
  currentUid,
  isSignedIn,
  errorText,
  defaultOpen = true,
  onSendMessage,
  onRequireSignIn,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastSeenCountRef = useRef(messages.length);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setUnreadCount(0);
      lastSeenCountRef.current = messages.length;
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    } else if (messages.length > lastSeenCountRef.current) {
      setUnreadCount((c) => c + (messages.length - lastSeenCountRef.current));
      lastSeenCountRef.current = messages.length;
    }
  }, [messages.length, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || sending || !isSignedIn) return;
    setSending(true);
    try {
      await onSendMessage(trimmed);
      setDraft('');
    } catch {
      // Logged in storage layer
    } finally {
      setSending(false);
    }
  };

  const containerWidth = variant === 'lobby' ? 'w-80 sm:w-96' : 'w-72 sm:w-80';
  const listHeight = variant === 'lobby' ? 'h-48' : 'h-40';

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pointer-events-auto flex items-center gap-2 rounded-xl border border-slate-700/80 bg-[#0b0f17]/95 px-3.5 py-2 text-xs font-semibold text-slate-200 shadow-xl hover:border-amber-400/60 hover:text-amber-300 transition-colors"
      >
        <MessageSquare className="h-4 w-4 text-amber-400" />
        <span>{title}</span>
        {unreadCount > 0 && (
          <span className="rounded-full bg-rose-500 px-1.5 py-0.5 font-mono-num text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
      </button>
    );
  }

  return (
    <div
      className={`pointer-events-auto flex flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0b0f17]/95 shadow-2xl ${containerWidth}`}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="flex items-center justify-between border-b border-slate-800 px-3.5 py-2.5 text-left hover:bg-slate-900/70 transition-colors"
      >
        <span className="flex items-center gap-2 text-xs font-bold text-slate-100">
          <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
          <span>{title}</span>
          <span className="font-mono-num text-[11px] font-normal text-slate-400">
            ({messages.length})
          </span>
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {/* Message Stream */}
      <div
        ref={listRef}
        className={`overflow-y-auto px-3 py-2.5 space-y-2 text-xs ${listHeight}`}
      >
        {errorText ? (
          <div className="py-6 text-center text-[11px] text-rose-300">{errorText}</div>
        ) : messages.length === 0 ? (
          <div className="py-8 text-center text-[11px] text-slate-500">
            아직 대화가 없습니다. 첫 인사를 남겨보세요!
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = isSignedIn && msg.uid === currentUid;
            const side: CoopSide | null = isCoopMsg(msg) ? msg.side : null;
            return (
              <div key={msg.id} className="leading-relaxed break-words">
                <div className="flex items-baseline gap-1.5">
                  {side && (
                    <span
                      className={`rounded px-1 py-0.5 text-[10px] font-bold ${
                        side === 'left'
                          ? 'bg-sky-500/20 text-sky-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {side === 'left' ? '왼쪽' : '오른쪽'}
                    </span>
                  )}
                  <span
                    className={`font-semibold ${
                      isMine ? 'text-amber-300' : 'text-cyan-300'
                    }`}
                  >
                    {msg.displayName}
                  </span>
                  <span className="font-mono-num text-[10px] text-slate-500">
                    {formatTime(msg.createdAtMs)}
                  </span>
                </div>
                <div className="mt-0.5 text-slate-200">{msg.text}</div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      {isSignedIn ? (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex items-center gap-1.5 border-t border-slate-800 bg-slate-950/90 p-2"
        >
          <input
            type="text"
            value={draft}
            maxLength={200}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="메시지 입력..."
            className="min-w-0 flex-1 rounded-lg border border-slate-700/80 bg-slate-900 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            disabled={sending || draft.trim().length === 0}
            aria-label="전송"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-40 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-2 border-t border-slate-800 bg-slate-950/90 px-3 py-2">
          <span className="text-[11px] text-slate-400">
            로그인 후 채팅에 참여할 수 있습니다
          </span>
          {onRequireSignIn && (
            <button
              type="button"
              onClick={onRequireSignIn}
              className="flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-slate-950 hover:bg-amber-400"
            >
              <LogIn className="h-3 w-3" />
              <span>로그인</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
