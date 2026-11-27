import React, { useEffect } from 'react';
import { Confetti } from '../shared/Confetti';
import { getLatestGameResult, getUserProgressTracks } from '../../lib/gameSession';
import { gameSfx } from '../../lib/gameSoundEffects';

interface RewardModalProps {
  onContinue: () => void;
  xpEarned?: number;
  talentsEarned?: number;
  currentLevel?: string;
  nextLevel?: string;
  xpNeeded?: number;
  quote?: string;
}

export const RewardModal: React.FC<RewardModalProps> = ({
  onContinue,
  xpEarned: propXp,
  talentsEarned: propTalents,
  currentLevel: propLevel,
  nextLevel: propNextLevel,
  xpNeeded: propXpNeeded,
  quote: propQuote,
}) => {
  const latestResult = getLatestGameResult();
  const tracks = getUserProgressTracks();

  // Valores reais da sessão ou fallback zero
  const xpEarned = propXp ?? latestResult?.xpEarned ?? 0;
  const talentsEarned = propTalents ?? latestResult?.talentsEarned ?? 0;
  const starsEarned = latestResult?.starsEarned ?? 0;
  const currentLevel = propLevel ?? `Nível ${tracks.walkLevel}`;
  const nextLevel = propNextLevel ?? `Nível ${tracks.walkLevel + 1}`;
  const xpNeeded = propXpNeeded ?? Math.max(0, tracks.walkLevel * 250 - tracks.lifetimeXp);
  const quote = propQuote ?? 'Muito bem! Cada passo na Palavra ilumina a tua caminhada.';

  useEffect(() => {
    gameSfx.play('victory');
    const timer = setTimeout(() => {
      gameSfx.play('star');
    }, 450);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0f2d27] dark:bg-[#0d2722] text-white p-6 justify-between items-center text-center animate-fade-in font-display relative">
      {/* Real celebratory confetti */}
      <Confetti active={true} />

      {/* Ambient background glow & stars pattern */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[120%] h-[50%] bg-gradient-to-b from-sacred-brand/40 via-sacred-soft/20 to-transparent blur-3xl rounded-b-full opacity-60" />
      </div>

      {/* Top Action Bar */}
      <div className="relative z-10 w-full flex items-center justify-between">
        <button
          onClick={onContinue}
          className="flex items-center justify-center size-10 rounded-full hover:bg-white/10 transition-colors text-white/70"
          title="Fechar"
        >
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 border border-white/15 rounded-full backdrop-blur-md shadow-lg">
          <span className="material-symbols-outlined text-gold-radiant text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            bolt
          </span>
          <span className="text-xs font-bold text-gold-radiant tracking-wide">{tracks.lifetimeXp} XP</span>
        </div>

        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: 'BiblIA - Bênçãos Recebidas!',
                text: `Concluí mais um desafio na jornada bíblica e ganhei +${xpEarned} XP e +${talentsEarned} talentos!`,
              });
            }
          }}
          className="flex items-center justify-center size-10 rounded-full hover:bg-white/10 transition-colors text-white/70"
          title="Compartilhar"
        >
          <span className="material-symbols-outlined text-2xl">ios_share</span>
        </button>
      </div>

      {/* Main Body */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-2 w-full max-w-sm mx-auto my-auto">
        {/* Animated Trophy Hero */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="relative mb-3">
            <div className="absolute inset-0 bg-gold-radiant/25 blur-xl rounded-full" />
            <div className="relative flex items-center justify-center size-20 rounded-full bg-gradient-to-br from-sacred-dark to-sacred-deep border-2 border-gold-radiant/50 shadow-[0_0_30px_rgba(245,158,11,0.35)]">
              <span
                className="material-symbols-outlined text-gold-radiant text-4xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                emoji_events
              </span>
            </div>
            <span className="material-symbols-outlined text-gold-radiant absolute -top-1 -right-2 text-xl animate-bounce">
              auto_awesome
            </span>
            <span className="material-symbols-outlined text-sacred-neon absolute bottom-0 -left-2 text-lg animate-pulse">
              auto_awesome
            </span>
          </div>

          <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight drop-shadow-xl mb-1">
            Bênçãos<br />Recebidas!
          </h1>
          <p className="text-emerald-300 text-xs font-bold tracking-[0.15em] uppercase opacity-90">
            Desafio Concluído
          </p>
        </div>

        {/* 3 Trilhas Canónicas Card */}
        <div className="w-full bg-[#15453f] border border-[#23685e] rounded-2xl p-4 shadow-2xl relative overflow-hidden mb-4 space-y-3">
          {/* Grid de 3 Recompensas */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {/* XP da Caminhada */}
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 flex flex-col items-center">
              <span className="material-symbols-outlined text-sacred-neon text-lg mb-0.5">bolt</span>
              <span className="text-lg font-black text-white">+{xpEarned}</span>
              <span className="text-[10px] text-white/60 font-semibold">XP</span>
            </div>

            {/* Talentos da Semana */}
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 flex flex-col items-center">
              <span className="material-symbols-outlined text-gold-radiant text-lg mb-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                diamond
              </span>
              <span className="text-lg font-black text-gold-radiant">+{talentsEarned}</span>
              <span className="text-[10px] text-white/60 font-semibold">Talentos</span>
            </div>

            {/* Estrelas de Domínio */}
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 flex flex-col items-center">
              <span className="material-symbols-outlined text-amber-400 text-lg mb-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                star
              </span>
              <span className="text-lg font-black text-amber-300">+{starsEarned}</span>
              <span className="text-[10px] text-white/60 font-semibold">Estrelas</span>
            </div>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Progress to Next Level */}
          <div className="flex flex-col gap-1.5 relative z-10 text-left">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-white/60 text-[10px] font-medium">Nível de Caminhada</p>
                <p className="text-white text-xs font-bold">{currentLevel}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-sacred-neon bg-sacred-neon/15 px-2 py-0.5 rounded">
                  {tracks.streakDays} dias de sequência
                </span>
              </div>
            </div>

            <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-gold-talent to-gold-radiant rounded-full shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                style={{ width: `${Math.min(100, Math.round(((tracks.lifetimeXp % 250) / 250) * 100))}%` }}
              />
            </div>

            <div className="flex items-center justify-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-white/50 text-[13px]">
                trending_up
              </span>
              <p className="text-white/60 text-[10px] font-normal">
                {xpNeeded} XP para o {nextLevel}
              </p>
            </div>
          </div>
        </div>

        {/* Quote */}
        <p className="text-xs text-white/80 font-serif italic max-w-[90%] leading-relaxed">
          "{quote}"
        </p>
      </div>

      {/* Bottom 3D Duolingo Gold Button */}
      <div className="relative z-20 w-full max-w-sm pb-4 pt-2">
        <button
          onClick={onContinue}
          className="w-full btn-duo-reward py-4 text-base shadow-duo-gold flex items-center justify-center gap-2"
        >
          <span>Ver Resumo da Lição</span>
          <span className="material-symbols-outlined text-xl">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};
