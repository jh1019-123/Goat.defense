import React, { useEffect, useState } from 'react';

interface BattleTransitionOverlayProps {
  active: boolean;
  isCoop?: boolean;
  onCurtainPeak: () => void;
  onFinished: () => void;
}

type TransitionPhase = 'idle' | 'loading' | 'chaos_in' | 'chaos_out';

export const BattleTransitionOverlay: React.FC<BattleTransitionOverlayProps> = ({
  active,
  isCoop = false,
  onCurtainPeak,
  onFinished,
}) => {
  const [phase, setPhase] = useState<TransitionPhase>('idle');
  const [barFull, setBarFull] = useState(false);

  useEffect(() => {
    if (!active) {
      setPhase('idle');
      setBarFull(false);
      return;
    }

    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      onCurtainPeak();
      onFinished();
      return;
    }

    setPhase('loading');
    setBarFull(false);

    const barTimer = window.setTimeout(() => {
      setBarFull(true);
    }, 40);

    // Mount the battle engine right before the loading screen hands off to "chaos starts"
    const peakTimer = window.setTimeout(() => {
      onCurtainPeak();
    }, 1850);

    // ~2.0s loading screen completes -> fade in "chaos starts"
    const chaosInTimer = window.setTimeout(() => {
      setPhase('chaos_in');
    }, 2000);

    // Hold "chaos starts" briefly then smoothly fade out overlay & text together
    const chaosOutTimer = window.setTimeout(() => {
      setPhase('chaos_out');
    }, 3050);

    const endTimer = window.setTimeout(() => {
      setPhase('idle');
      onFinished();
    }, 3650);

    return () => {
      clearTimeout(barTimer);
      clearTimeout(peakTimer);
      clearTimeout(chaosInTimer);
      clearTimeout(chaosOutTimer);
      clearTimeout(endTimer);
    };
  }, [active, onCurtainPeak, onFinished]);

  if (!active && phase === 'idle') return null;

  const isOverlayVisible = phase === 'loading' || phase === 'chaos_in';
  const showLoadingBox = phase === 'loading';
  const showChaosText = phase === 'chaos_in' || phase === 'chaos_out';

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#060913] transition-opacity duration-600 ease-in-out ${
        isOverlayVisible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      {/* Atmospheric multi-stop glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            'radial-gradient(circle at 50% 50%, rgba(124, 58, 237, 0.22) 0%, rgba(6, 9, 19, 0.96) 66%)',
            'radial-gradient(ellipse at 28% 50%, rgba(56, 189, 248, 0.14) 0%, transparent 55%)',
            'radial-gradient(ellipse at 72% 50%, rgba(244, 63, 94, 0.16) 0%, transparent 55%)',
          ].join(', '),
        }}
      />

      {/* Stage 1: ~2s Loading Screen */}
      <div
        className={`relative z-10 flex w-full max-w-sm flex-col items-center px-6 text-center transition-all duration-300 ease-out ${
          showLoadingBox ? 'opacity-100 scale-100' : 'pointer-events-none absolute opacity-0 scale-95'
        }`}
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.38em] text-sky-300/90">
          TOP OF CHAOS
        </span>
        <div className="mt-2 text-xl font-bold tracking-wide text-slate-100">
          {isCoop ? '실시간 협동 전장 동기화 중...' : '전장 진입 준비 중...'}
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          {isCoop
            ? '좌측·우측 방어 격자와 공용 코인 금고를 연결하고 있습니다'
            : '성벽 방어선과 몬스터 침공 통로를 구축하고 있습니다'}
        </p>

        {/* Smooth ~2s Loading Bar */}
        <div className="mt-5 h-2 w-full overflow-hidden rounded-full border border-slate-700/80 bg-slate-900">
          <div
            className="h-full rounded-full transition-all ease-out"
            style={{
              width: barFull ? '100%' : '6%',
              transitionDuration: '1900ms',
              background:
                'linear-gradient(90deg, #38bdf8 0%, #fbbf24 52%, #f43f5e 100%)',
            }}
          />
        </div>
      </div>

      {/* Stage 2: "chaos starts" Smooth Fade-In & Fade-Out */}
      <div
        className={`relative z-10 flex flex-col items-center px-6 text-center transition-all duration-500 ease-in-out ${
          phase === 'chaos_in'
            ? 'opacity-100 scale-100'
            : showChaosText
              ? 'opacity-0 scale-105'
              : 'pointer-events-none absolute opacity-0 scale-95'
        }`}
      >
        <div className="title-3d-chaos text-4xl uppercase tracking-[0.14em] sm:text-6xl">
          chaos starts
        </div>
        <div
          className="mt-4 h-[2px] w-60"
          style={{
            background:
              'linear-gradient(90deg, rgba(56,189,248,0) 0%, rgba(56,189,248,0.95) 28%, rgba(251,191,36,1) 50%, rgba(244,63,94,0.95) 72%, rgba(244,63,94,0) 100%)',
          }}
        />
      </div>
    </div>
  );
};
