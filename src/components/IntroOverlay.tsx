import React, { useCallback, useEffect, useRef, useState } from 'react';
import { soundEngine } from '../lib/audio';

interface IntroOverlayProps {
  onComplete: () => void;
}

const FLOATING_MOTES = [
  { left: '18%', bottom: '20%', color: '#38bdf8', delay: '0s', size: 6 },
  { left: '28%', bottom: '16%', color: '#f97316', delay: '1.1s', size: 5 },
  { left: '39%', bottom: '24%', color: '#a855f7', delay: '2.2s', size: 7 },
  { left: '52%', bottom: '14%', color: '#fbbf24', delay: '0.6s', size: 6 },
  { left: '64%', bottom: '22%', color: '#22d3ee', delay: '1.7s', size: 5 },
  { left: '75%', bottom: '18%', color: '#f43f5e', delay: '2.8s', size: 6 },
  { left: '84%', bottom: '26%', color: '#c084fc', delay: '1.4s', size: 5 },
];

export const IntroOverlay: React.FC<IntroOverlayProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<'fade_in' | 'hold' | 'fade_out'>('fade_in');
  const completedRef = useRef(false);

  const triggerExit = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    soundEngine.playUiConfirm();
    soundEngine.unlockAndSyncBgm('lobby');
    setStage('fade_out');
    window.setTimeout(() => {
      onComplete();
    }, 620);
  }, [onComplete]);

  useEffect(() => {
    const t1 = window.setTimeout(() => setStage('hold'), 90);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        triggerExit();
      }
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      clearTimeout(t1);
      window.removeEventListener('keydown', handleKey);
    };
  }, [triggerExit]);

  return (
    <div
      role="dialog"
      aria-label="탑 오브 카오스 인트로"
      onClick={triggerExit}
      className={`fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center overflow-hidden select-none transition-opacity duration-700 ease-out ${
        stage === 'fade_in'
          ? 'bg-[#070b18] opacity-100'
          : stage === 'hold'
            ? 'bg-[#070b18]/30 opacity-100'
            : 'pointer-events-none bg-[#070b18]/0 opacity-0'
      }`}
    >
      {/* Multi-tone elemental & abyssal framing so the 3D castle shines behind the title */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            'radial-gradient(circle at 50% 44%, rgba(124, 58, 237, 0.22) 0%, rgba(15, 23, 42, 0.12) 40%, rgba(5, 8, 20, 0.78) 100%)',
            'radial-gradient(ellipse at 25% 58%, rgba(56, 189, 248, 0.14) 0%, transparent 50%)',
            'radial-gradient(ellipse at 76% 58%, rgba(244, 63, 94, 0.15) 0%, transparent 50%)',
          ].join(', '),
        }}
      />

      {/* Subtle Rising Elemental Diamond Motes */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {FLOATING_MOTES.map((mote, i) => (
          <span
            key={i}
            className="animate-chaos-mote absolute rounded-[1px]"
            style={{
              left: mote.left,
              bottom: mote.bottom,
              width: `${mote.size}px`,
              height: `${mote.size}px`,
              backgroundColor: mote.color,
              boxShadow: `0 0 12px ${mote.color}`,
              animationDelay: mote.delay,
            }}
          />
        ))}
      </div>

      {/* Centered 3D Emblem & Title Lockup */}
      <div
        className={`relative z-10 flex flex-col items-center px-6 text-center transition-all duration-700 ease-out ${
          stage === 'fade_out' ? 'scale-105 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        <div className="animate-chaos-rise flex flex-col items-center">
          {/* Geometric 3D Chaos Crest */}
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            aria-hidden="true"
            className="mb-4 drop-shadow-[0_8px_18px_rgba(0,0,0,0.75)]"
          >
            <defs>
              <linearGradient id="crestGold" x1="32" y1="4" x2="32" y2="58" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#F8FAFC" />
                <stop offset="45%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#EA580C" />
              </linearGradient>
              <linearGradient id="crestCore" x1="32" y1="18" x2="32" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="50%" stopColor="#A855F7" />
                <stop offset="100%" stopColor="#F43F5E" />
              </linearGradient>
            </defs>
            <path
              d="M32 4L52 16V34C52 46 43 55 32 60C21 55 12 46 12 34V16L32 4Z"
              fill="#0F172A"
              fillOpacity="0.88"
              stroke="url(#crestGold)"
              strokeWidth="2.5"
            />
            <path
              d="M32 11L45 19V33C45 41 39 48 32 52C25 48 19 41 19 33V19L32 11Z"
              fill="#1E1B4B"
              fillOpacity="0.65"
              stroke="#64748B"
              strokeOpacity="0.5"
              strokeWidth="1.2"
            />
            <path d="M32 17L40 31L32 45L24 31L32 17Z" fill="url(#crestCore)" />
            <path d="M32 17L40 31L32 31V17Z" fill="#FFFFFF" fillOpacity="0.28" />
          </svg>

          <div className="mb-2.5 flex items-center gap-3 text-xs font-semibold tracking-[0.34em] text-sky-200/90">
            <span className="text-sky-400">must</span>
            <span className="text-slate-500">·</span>
            <span className="text-amber-300">have</span>
            <span className="text-slate-500">·</span>
            <span className="text-rose-400">run</span>
          </div>

          <h1 className="title-3d-chaos text-4xl leading-none sm:text-6xl md:text-7xl">
            TOP OF CHAOS
          </h1>

          {/* Elemental Tri-Tone Horizon Rule (Frost Cyan -> Gold -> Crimson) */}
          <div
            aria-hidden="true"
            className="animate-chaos-line mt-5 h-[2px] w-64 origin-center sm:w-96"
            style={{
              background:
                'linear-gradient(90deg, rgba(56,189,248,0) 0%, rgba(56,189,248,0.95) 28%, rgba(251,191,36,1) 50%, rgba(244,63,94,0.95) 72%, rgba(244,63,94,0) 100%)',
            }}
          />

          <p className="title-3d-sub mt-4 text-base font-bold text-slate-100 sm:text-xl">
            탑 오브 카오스
          </p>
        </div>

        <button
          type="button"
          data-sfx="none"
          onClick={(e) => {
            e.stopPropagation();
            triggerExit();
          }}
          className="mt-10 rounded-xl border border-sky-400/45 bg-gradient-to-r from-slate-900/95 via-indigo-950/90 to-slate-900/95 px-7 py-3 text-xs font-bold tracking-[0.18em] text-slate-100 shadow-[0_8px_24px_rgba(15,23,42,0.85)] transition-all hover:-translate-y-0.5 hover:border-amber-400/80 hover:text-amber-200"
        >
          화면을 클릭하여 전장 입장
        </button>
      </div>
    </div>
  );
};
