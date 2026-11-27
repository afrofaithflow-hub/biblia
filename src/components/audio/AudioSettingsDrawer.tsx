import React from 'react';
import { useAudio } from '../../context/AudioContext';
import { AmbientSoundType } from '../../lib/audioEngine';

interface AudioSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, icon?: string) => void;
}

export const AudioSettingsDrawer: React.FC<AudioSettingsDrawerProps> = ({
  isOpen,
  onClose,
  showToast,
}) => {
  const {
    availableVoices,
    selectedVoice,
    setVoice,
    installedSystemVoices,
    selectedSystemVoiceURI,
    setSystemVoice,
    selectedAmbient,
    ambientVolume,
    speechVolume,
    setAmbient,
    setAmbientVolume,
    setSpeechVolume,
  } = useAudio();

  if (!isOpen) return null;

  const selectedSystemVoice = installedSystemVoices.find((voice) => voice.voiceURI === selectedSystemVoiceURI);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-surface-light dark:bg-dark-card-base w-full max-w-md rounded-t-3xl border-t border-gray-200 dark:border-dark-border p-5 shadow-2xl animate-slide-up space-y-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle & Header */}
        <div className="flex flex-col items-center">
          <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mb-3" />
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sacred-brand dark:text-sacred-neon">
                tune
              </span>
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                Vozes e Paisagens Sonoras
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* ── VOZES NEURAIS MICROSOFT EDGE ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Voz de Leitura Bíblica (Microsoft Edge Neural)
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sacred-brand/10 text-sacred-brand dark:bg-sacred-neon/15 dark:text-sacred-neon">
              {availableVoices.find((v) => v.id === selectedVoice)?.name || 'Duarte'}
            </span>
          </div>

          <div className="space-y-1.5 mt-2">
            {availableVoices.map((voice) => {
              const isSelected = voice.id === selectedVoice;
              const isDefault = voice.id === 'pt-PT-DuarteNeural';
              return (
                <div
                  key={voice.id}
                  onClick={() => {
                    setVoice(voice.id);
                    showToast(`Voz ativada: ${voice.name}`, 'record_voice_over');
                  }}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-sacred-brand bg-sacred-brand/8 dark:border-sacred-neon dark:bg-sacred-neon/10'
                      : 'border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {voice.name}
                      </span>
                      {isDefault ? (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-gradient-to-r from-amber-500 to-gold-radiant text-slate-950 shadow-xs">
                          ★ OFICIAL
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-teal-500/20 text-teal-700 dark:text-sacred-neon border border-teal-500/30">
                          EDGE NEURAL
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {voice.description}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="material-symbols-outlined text-sacred-brand dark:text-sacred-neon text-lg ml-2 shrink-0">
                      check_circle
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100 dark:border-dark-border">
          <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-300 mb-1.5 font-medium">
            <span>Volume da Voz</span>
            <span className="font-mono font-bold text-sacred-brand dark:text-sacred-neon">
              {Math.round(speechVolume * 100)}%
            </span>
          </div>
          <input
            aria-label="Volume da voz"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={speechVolume}
            onChange={(e) => setSpeechVolume(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-sacred-brand dark:accent-sacred-neon"
          />
          <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">Ajuste a narração sem alterar o volume da paisagem.</p>
        </div>

        {/* ── PAISAGEM SONORA ── */}
        <div className="pt-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
            Paisagem sonora ambiente (síntese local)
          </span>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'strings', label: 'Ambiente suave', icon: 'graphic_eq' },
              { id: 'harp', label: 'Notas leves', icon: 'music_note' },
              { id: 'celestial', label: 'Pad sereno', icon: 'auto_awesome' },
              { id: 'rain', label: 'Chuva', icon: 'water_drop' },
              { id: 'nature', label: 'Brisa', icon: 'air' },
              { id: 'none', label: 'Sem Trilha', icon: 'volume_off' },
            ].map((ambient) => {
              const isSelected = selectedAmbient === ambient.id;
              return (
                <button
                  key={ambient.id}
                  onClick={() => {
                    setAmbient(ambient.id as AmbientSoundType);
                    showToast(`Trilha: ${ambient.label}`, 'music_note');
                  }}
                  className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    isSelected
                      ? 'border-sacred-brand bg-sacred-light text-sacred-brand dark:bg-sacred-neon/20 dark:text-sacred-neon font-bold shadow-xs'
                      : 'border-gray-200 dark:border-dark-border bg-white dark:bg-surface-dark-alt hover:border-sacred-brand/40 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{ambient.icon}</span>
                  <span className="text-[10px] font-bold leading-tight">{ambient.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── SEÇÃO 4: SLIDER DE VOLUME DA TRILHA ── */}
        {selectedAmbient !== 'none' && (
          <div className="pt-2 border-t border-gray-100 dark:border-dark-border">
            <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-300 mb-1.5 font-medium">
              <span>Volume da Trilha de Fundo</span>
              <span className="font-mono font-bold text-sacred-brand dark:text-sacred-neon">
                {Math.round(ambientVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={ambientVolume}
              onChange={(e) => setAmbientVolume(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-sacred-brand dark:accent-sacred-neon"
            />
          </div>
        )}
      </div>
    </div>
  );
};
