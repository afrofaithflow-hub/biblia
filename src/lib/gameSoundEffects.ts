/**
 * ==============================================================================
 * BiblIA — Motor de Efeitos Sonoros do Jogo (Game Sound FX Procedural)
 * Síntese em tempo real com Web Audio API: Latência Zero (0ms), 100% Offline,
 * timbres nobres e meditativos (harpa, carrilhão, sino sagrado, cordas).
 * ==============================================================================
 */

export type GameSfxType =
  | 'tap'
  | 'correct'
  | 'wrong'
  | 'star'
  | 'victory'
  | 'heart_lost'
  | 'heart_recovered'
  | 'flame';

const SFX_MUTED_KEY = 'biblia:sfx-muted';

class GameSoundEffectsEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    try {
      this.isMuted = localStorage.getItem(SFX_MUTED_KEY) === 'true';
    } catch {
      this.isMuted = false;
    }
  }

  /** Inicializa o AudioContext de forma preguiçosa no primeiro toque para respeitar a política de autoplay */
  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    try {
      localStorage.setItem(SFX_MUTED_KEY, String(muted));
    } catch {
      // Silencioso
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  /** Vibração tátil sutil em dispositivos móveis compatíveis */
  private triggerHaptic(pattern: number | number[]): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Silencioso
      }
    }
  }

  /**
   * Toca um efeito sonoro procedural
   */
  public play(type: GameSfxType): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      switch (type) {
        /* ── Toque tátil / clique amadeirado suave ── */
        case 'tap': {
          this.triggerHaptic(12);
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(420, now);
          osc.frequency.exponentialRampToValueAtTime(140, now + 0.04);

          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.045);
          break;
        }

        /* ── Resposta Correta: Acorde triunfante e harmonioso (Dó Maior / Harpa) ── */
        case 'correct': {
          this.triggerHaptic([25, 40, 30]);
          // Notas: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz) com arpejo rápido
          const notes = [523.25, 659.25, 783.99, 1046.5];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.type = 'triangle'; // Timbre quente e orgânico
            osc.frequency.setValueAtTime(freq, now + idx * 0.06);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2400, now + idx * 0.06);

            gain.gain.setValueAtTime(0.001, now + idx * 0.06);
            gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.06 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.45);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.46);
          });
          break;
        }

        /* ── Resposta Incorreta: Tom suave menor, não punitivo mas claro ── */
        case 'wrong': {
          this.triggerHaptic(70);
          // Duas notas descendentes macias: Eb4 -> C4
          const notes = [311.13, 261.63];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.1);

            gain.gain.setValueAtTime(0.001, now + idx * 0.1);
            gain.gain.linearRampToValueAtTime(0.09, now + idx * 0.1 + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.28);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + idx * 0.1);
            osc.stop(now + idx * 0.1 + 0.3);
          });
          break;
        }

        /* ── Estrela Conquistada: Brilho angelical / Carrilhão cintilante ── */
        case 'star': {
          this.triggerHaptic([20, 30, 40]);
          const freqs = [880, 1318.51, 1760]; // La5 -> Mi6 -> La6
          freqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);

            gain.gain.setValueAtTime(0.001, now + idx * 0.08);
            gain.gain.linearRampToValueAtTime(0.14, now + idx * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.6);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.62);
          });
          break;
        }

        /* ── Vitória / Conclusão de Fase: Fanfarra sagrada radiante ── */
        case 'victory': {
          this.triggerHaptic([40, 60, 40, 80]);
          // Acorde maior brilhante com cauda rica: C - G - C - E - G (harmônicos triunfantes)
          const chord = [261.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
          chord.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.05);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(3200, now);

            gain.gain.setValueAtTime(0.001, now + idx * 0.05);
            gain.gain.linearRampToValueAtTime(0.15 / (idx + 1), now + idx * 0.05 + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 1.2);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + idx * 0.05);
            osc.stop(now + idx * 0.05 + 1.25);
          });
          break;
        }

        /* ── Perda de Coração: Ressonância suave de sino ── */
        case 'heart_lost': {
          this.triggerHaptic(50);
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(110, now + 0.35);

          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.36);
          break;
        }

        /* ── Coração Recuperado pela Leitura: Brisa ascendente de esperança ── */
        case 'heart_recovered': {
          this.triggerHaptic([30, 50]);
          const notes = [349.23, 440.0, 523.25, 698.46]; // F - A - C - F
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.07);

            gain.gain.setValueAtTime(0.001, now + idx * 0.07);
            gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.07 + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.5);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + idx * 0.07);
            osc.stop(now + idx * 0.07 + 0.52);
          });
          break;
        }

        /* ── Chama / Sequência diária: Whoosh caloroso ── */
        case 'flame': {
          this.triggerHaptic([20, 40]);
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(180, now);
          osc.frequency.exponentialRampToValueAtTime(540, now + 0.25);

          gain.gain.setValueAtTime(0.01, now);
          gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.29);
          break;
        }
      }
    } catch (err) {
      console.warn('[gameSoundEffects] Erro ao reproduzir SFX:', err);
    }
  }
}

export const gameSfx = new GameSoundEffectsEngine();

