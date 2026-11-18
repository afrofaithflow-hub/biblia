import React from 'react';
import { useAudio } from '../../context/AudioContext';

interface MiniAudioPlayerProps {
  onExpand: () => void;
}

export const MiniAudioPlayer: React.FC<MiniAudioPlayerProps> = ({ onExpand }) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    skip,
    sleepTimerRemainingSec,
  } = useAudio();

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const formatSleepTimer = (sec: number) => {
    const mins = Math.ceil(sec / 60);
    return `${mins}m`;
  };

  return (
    <div className="fixed bottom-[74px] left-0 right-0 max-w-[430px] mx-auto px-3 z-30 pointer-events-none animate-fade-in">
      <div className="pointer-events-auto relative rounded-2xl bg-white/95 dark:bg-dark-card-base/95 backdrop-blur-md border border-slate-200/80 dark:border-dark-border shadow-sacred-floating dark:shadow-card-dark flex items-center justify-between gap-3 p-2.5 overflow-hidden">
        {/* Scrubber progress line at the top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-sacred-brand to-sacred-neon transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Track thumbnail and info (click to expand) */}
        <div
          onClick={onExpand}
          className="flex items-center gap-3 flex-1 cursor-pointer overflow-hidden group"
          title="Toque para abrir o player completo"
        >
          <div className="relative size-10 rounded-xl bg-sacred-light dark:bg-sacred-deep/60 border border-sacred-brand/20 dark:border-sacred-neon/30 flex items-center justify-center text-sacred-brand dark:text-sacred-neon shrink-0 overflow-hidden shadow-xs">
            <span
              className={`material-symbols-outlined text-xl ${
                isPlaying ? 'text-sacred-brand dark:text-sacred-neon' : ''
              }`}
            >
              headphones
            </span>

            {/* Live equalizer animation overlay when playing */}
            {isPlaying && (
              <div className="absolute inset-x-0 bottom-1 flex items-end justify-center gap-[2px] h-3 pointer-events-none">
                <span className="w-0.5 bg-sacred-brand dark:bg-sacred-neon rounded-full animate-soundwave-1" />
                <span className="w-0.5 bg-sacred-brand dark:bg-sacred-neon rounded-full animate-soundwave-2" />
                <span className="w-0.5 bg-sacred-brand dark:bg-sacred-neon rounded-full animate-soundwave-3" />
              </div>
            )}
          </div>

          <div className="truncate">
            <div className="flex items-center gap-1.5 truncate">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {currentTrack.title || 'Áudio Bíblia'}
              </p>
              {isPlaying && (
                <span className="size-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
              )}
              {sleepTimerRemainingSec !== null && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[10px]">bedtime</span>
                  <span>{formatSleepTimer(sleepTimerRemainingSec)}</span>
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {currentTrack.subtitle || 'Narração Sagrada Meditativa'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Skip 10s */}
          <button
            onClick={() => skip(10)}
            className="size-8 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Avançar 10 segundos"
          >
            <span className="material-symbols-outlined text-lg">forward_10</span>
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={togglePlay}
            className="size-9 rounded-full bg-sacred-brand dark:bg-sacred-neon text-white dark:text-slate-950 flex items-center justify-center shadow-md active:scale-90 transition-all"
            title={isPlaying ? 'Pausar' : 'Reproduzir'}
          >
            <span
              className="material-symbols-outlined text-xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
