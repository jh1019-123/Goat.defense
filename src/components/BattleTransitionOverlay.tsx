import React, { useEffect, useState } from 'react';

interface BattleTransitionOverlayProps {
  active: boolean;
  onCurtainPeak: () => void;
  onFinished: () => void;
}

export const BattleTransitionOverlay: React.FC<BattleTransitionOverlayProps> = ({
  active,
  onCurtainPeak,
  onFinished,
}) => {
  const [phase, setPhase] = useState<'idle' | 'closing' | 'opening'>('idle');

  useEffect(() => {
    if (!active) {
      setPhase('idle');
      return;
    }

    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      onCurtainPeak();
      onFinished();
      return;
    }

    setPhase('closing');

    const peakTimer = window.setTimeout(() => {
      onCurtainPeak();
      setPhase('opening');
    }, 320);

    const endTimer = window.setTimeout(() => {
      setPhase('idle');
      onFinished();
    }, 920);

    return () => {
      clearTimeout(peakTimer);
      clearTimeout(endTimer);
    };
  }, [active, onCurtainPeak, onFinished]);

  if (!active && phase === 'idle') return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#070b18] transition-opacity ease-in-out ${
        phase === 'closing'
          ? 'pointer-events-auto opacity-100 duration-300'
          : 'pointer-events-none opacity-0 duration-500'
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            'radial-gradient(circle at 50% 50%, rgba(124, 58, 237, 0.24) 0%, rgba(7, 11, 24, 0.96) 65%)',
            'radial-gradient(ellipse at 30% 50%, rgba(56, 189, 248, 0.14) 0%, transparent 55%)',
            'radial-gradient(ellipse at 70% 50%, rgba(244, 63, 94, 0.14) 0%, transparent 55%)',
          ].join(', '),
        }}
      />
      <div
        className={`relative z-10 flex flex-col items-center text-center transition-transform duration-500 ease-out ${
          phase === 'closing' ? 'scale-100' : 'scale-110'
        }`}
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.38em] text-sky-300/90">
          TOP OF CHAOS
        </span>
        <div className="title-3d-sm mt-2 text-2xl sm:text-4xl">전장 진입</div>
        <div
          className="mt-3 h-[2px] w-48"
          style={{
            background:
              'linear-gradient(90deg, rgba(56,189,248,0) 0%, rgba(56,189,248,0.9) 30%, rgba(251,191,36,1) 50%, rgba(244,63,94,0.9) 70%, rgba(244,63,94,0) 100%)',
          }}
        />
      </div>
    </div>
  );
};
