/**
 * BiblIA — Motor de Áudio Real (Web Audio API & Web SpeechSynthesis API)
 * Sincronização em tempo real de versículos, síntese ambiente local e vozes nativas do dispositivo,
 * suporte à Media Session API, 4 vozes calibradas com contraste acústico real,
 * cancelamento assíncrono anti-bloqueio, watchdog de recuperação e suporte a vozes nativas do SO.
 */

import {
  getBibleChapter,
  BibleChapterData,
  DEFAULT_BIBLE_TRANSLATION_ID,
  getBibleTranslationLabel,
} from '../data/bibleData';
import { fetchEdgeNeuralAudio, EDGE_VOICES } from './edgeTtsService';

export type AmbientSoundType = 'strings' | 'harp' | 'celestial' | 'rain' | 'nature' | 'none';

export type VoiceProfileId =
  | 'pt-PT-DuarteNeural'
  | 'pt-BR-AntonioNeural'
  | 'pt-BR-FranciscaNeural'
  | 'pt-PT-RaquelNeural'
  // Chaves legadas mantidas para retrocompatibilidade sem quebrar o estado salvo
  | 'edge_davi'
  | 'edge_ester'
  | 'edge_paulo'
  | 'edge_timoteo'
  | 'eleven_davi'
  | 'eleven_ester'
  | 'eleven_paulo'
  | 'eleven_timoteo';

export interface VoiceProfile {
  id: VoiceProfileId;
  name: string;
  role: string;
  description: string;
  rate: number;
  isNeural?: boolean;
  tier?: 'free';
  systemVoiceHint?: string[];
}

export const AVAILABLE_VOICES: VoiceProfile[] = [
  {
    id: 'pt-PT-DuarteNeural',
    name: 'Duarte (Padrão Oficial)',
    role: 'Microsoft Edge Neural (Portugal)',
    description: 'Voz masculina solene, firme e reverente. Modelo de estúdio oficial para leitura bíblica.',
    rate: 1.0,
    isNeural: true,
    tier: 'free',
    systemVoiceHint: ['duarte', 'natural', 'pt-pt'],
  },
  {
    id: 'pt-BR-AntonioNeural',
    name: 'Antônio',
    role: 'Microsoft Edge Neural (Brasil)',
    description: 'Narrador masculino solene, nobre e compassado para passagens das Escrituras.',
    rate: 1.0,
    isNeural: true,
    tier: 'free',
    systemVoiceHint: ['antonio', 'natural', 'pt-br'],
  },
  {
    id: 'pt-BR-FranciscaNeural',
    name: 'Francisca',
    role: 'Microsoft Edge Neural (Brasil)',
    description: 'Voz feminina suave, clara e acolhedora para oração e Salmos.',
    rate: 0.98,
    isNeural: true,
    tier: 'free',
    systemVoiceHint: ['francisca', 'natural', 'pt-br'],
  },
  {
    id: 'pt-PT-RaquelNeural',
    name: 'Raquel',
    role: 'Microsoft Edge Neural (Portugal)',
    description: 'Dicção límpida, cadência pausada e expressiva para meditação diária.',
    rate: 0.95,
    isNeural: true,
    tier: 'free',
    systemVoiceHint: ['raquel', 'natural', 'pt-pt'],
  },
];

export interface AudioEngineCallbacks {
  onTimeUpdate: (currentSec: number, totalSec: number) => void;
  onVerseChange: (verseIndex: number, verseText: string) => void;
  onVerseCompleted: (verseIndex: number, verseText: string) => void;
  onStateChange: (isPlaying: boolean) => void;
  onEnded: () => void;
  onSleepTimerTick?: (remainingSec: number | null) => void;
}

export interface ChapterAudioData {
  book: string;
  chapter: number;
  translation: string;
  title: string;
  subtitle: string;
  verses: string[];
}

class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private ambientGain: GainNode | null = null;
  private ambientNodes: (OscillatorNode | AudioNode)[] = [];
  private ambientVolume: number = 0.25;
  private activeAmbient: AmbientSoundType = 'strings';
  private stopAmbientTimeout: ReturnType<typeof setTimeout> | null = null;
  private ambientSequenceInterval: ReturnType<typeof setInterval> | null = null;

  private isSpeaking: boolean = false;
  private isPaused: boolean = false;
  private currentSpeed: number = 1.0;
  private currentVoiceId: VoiceProfileId = 'pt-PT-DuarteNeural';
  private currentSystemVoiceURI = '';
  private speechVolume: number = 1.0;
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private neuralAudio: HTMLAudioElement | null = null;

  // Controle de segurança assíncrona anti-congelamento (Watchdog e Timers)
  private cancelSafetyTimeout: ReturnType<typeof setTimeout> | null = null;
  private speechWatchdogTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  private currentBook: string = 'Salmos';
  private currentChapter: number = 23;
  private chapterData: ChapterAudioData = {
    book: 'Salmos',
    chapter: 23,
    translation: DEFAULT_BIBLE_TRANSLATION_ID,
    title: 'Salmos 23',
    subtitle: 'O Senhor é o meu pastor',
    verses: [
      'O Senhor é o meu pastor; de nada terei falta.',
      'Deita-me em verdes pastos, guia-me mansamente a águas tranquilas.',
      'Refrigera a minha alma; guia-me pelas veredas da justiça por amor do seu nome.',
      'Ainda que eu ande pelo vale da sombra da morte, não temerei mal algum, porque tu estás comigo; a tua vara e o teu cajado me consolam.',
      'Preparas uma mesa perante mim na presença dos meus inimigos, unges a minha cabeça com óleo, o meu cálice transborda.',
      'Certamente que a bondade e a misericórdia me seguirão todos os dias da minha vida; e habitarei na casa do Senhor por longos dias.',
    ],
  };

  private currentVerseIndex: number = 0;
  private verseTimeEstimates: number[] = [];
  private totalDurationSec: number = 130;
  private currentPlaybackTime: number = 0;
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // Modo Loop no Versículo Atual
  private isLoopingVerse: boolean = false;

  // Sleep Timer com fade-out gradual
  private sleepTimerRemainingSec: number | null = null;
  private sleepTimerMode: 'minutes' | 'end_of_chapter' | null = null;
  private sleepTimerInterval: ReturnType<typeof setInterval> | null = null;

  private callbacks: Partial<AudioEngineCallbacks> = {};

  constructor() {
    this.initVoicesListener();
    this.loadChapter('Salmos', 23);
  }

  /** Inicialização assíncrona da lista de vozes do sistema operacional */
  private initVoicesListener() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const load = () => {
        try {
          this.cachedVoices = window.speechSynthesis.getVoices();
        } catch {
          // ignore
        }
      };
      load();
      window.speechSynthesis.onvoiceschanged = load;
    }
  }

  /** Retorna todas as vozes em Português instaladas no SO do usuário */
  public getInstalledPortugueseVoices(): SpeechSynthesisVoice[] {
    if (this.cachedVoices.length === 0 && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.cachedVoices = window.speechSynthesis.getVoices();
    }
    return this.cachedVoices.filter(
      (v) => v.lang.startsWith('pt') || v.lang.includes('PT') || v.lang.includes('por')
    );
  }

  public isSpeechSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public setCallbacks(cb: Partial<AudioEngineCallbacks>) {
    this.callbacks = { ...this.callbacks, ...cb };
  }

  private initAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /* ── Local ambient synthesis (Web Audio API) ── */
  public setAmbient(type: AmbientSoundType) {
    this.activeAmbient = type;
    if (this.isSpeaking && !this.isPaused) {
      this.startAmbient();
    }
  }

  public setAmbientVolume(vol: number) {
    this.ambientVolume = Math.max(0, Math.min(1, vol));
    if (this.ambientGain && this.audioCtx) {
      this.ambientGain.gain.setTargetAtTime(this.ambientVolume * 0.48, this.audioCtx.currentTime, 0.08);
    }
  }

  public startAmbient() {
    if (this.stopAmbientTimeout) {
      clearTimeout(this.stopAmbientTimeout);
      this.stopAmbientTimeout = null;
    }
    this.killCurrentAmbientNodes();
    if (this.activeAmbient === 'none' || this.ambientVolume <= 0) return;

    try {
      const ctx = this.initAudioContext();
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(this.ambientVolume * 0.48, ctx.currentTime + 1.2);
      masterGain.connect(ctx.destination);
      this.ambientGain = masterGain;

      const filter = ctx.createBiquadFilter();
      filter.type = this.activeAmbient === 'rain' ? 'lowpass' : 'lowpass';
      filter.frequency.setValueAtTime(this.activeAmbient === 'rain' ? 1750 : this.activeAmbient === 'nature' ? 520 : 980, ctx.currentTime);
      filter.Q.setValueAtTime(0.55, ctx.currentTime);
      filter.connect(masterGain);
      this.ambientNodes.push(filter, masterGain);

      if (this.activeAmbient === 'rain' || this.activeAmbient === 'nature') {
        // Soft filtered pink noise creates a low-level texture without the harsh hiss of white noise.
        const length = ctx.sampleRate * 4;
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }
        const source = ctx.createBufferSource();
        const textureGain = ctx.createGain();
        source.buffer = buffer;
        source.loop = true;
        textureGain.gain.setValueAtTime(this.activeAmbient === 'rain' ? 0.42 : 0.24, ctx.currentTime);
        source.connect(textureGain);
        textureGain.connect(filter);
        source.start();
        this.ambientNodes.push(source, textureGain);

        if (this.activeAmbient === 'nature') {
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          lfo.frequency.setValueAtTime(0.08, ctx.currentTime);
          lfoGain.gain.setValueAtTime(0.09, ctx.currentTime);
          lfo.connect(lfoGain);
          lfoGain.connect(textureGain.gain);
          lfo.start();
          this.ambientNodes.push(lfo, lfoGain);
        }
        return;
      }

      if (this.activeAmbient === 'harp') {
        const notes = [261.63, 329.63, 392, 523.25, 392, 329.63];
        let noteIndex = 0;
        const pluck = () => {
          if (!this.audioCtx || this.ambientGain !== masterGain) return;
          const now = ctx.currentTime;
          const osc = ctx.createOscillator();
          const envelope = ctx.createGain();
          const tone = ctx.createBiquadFilter();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(notes[noteIndex++ % notes.length], now);
          tone.type = 'lowpass';
          tone.frequency.setValueAtTime(1600, now);
          envelope.gain.setValueAtTime(0.001, now);
          envelope.gain.exponentialRampToValueAtTime(0.12, now + 0.025);
          envelope.gain.exponentialRampToValueAtTime(0.001, now + 2.1);
          osc.connect(tone);
          tone.connect(envelope);
          envelope.connect(filter);
          osc.start(now);
          osc.stop(now + 2.2);
          this.ambientNodes.push(osc, tone, envelope);
        };
        pluck();
        this.ambientSequenceInterval = setInterval(pluck, 1750);
        return;
      }

      // Gentle, low-volume pad. It is an ambient synthesis, not a recording or a claimed tuning standard.
      const notes = this.activeAmbient === 'strings'
        ? [130.81, 164.81, 196, 261.63]
        : [146.83, 196, 220, 293.66, 349.23];
      notes.forEach((frequency, index) => {
        const osc = ctx.createOscillator();
        const voiceGain = ctx.createGain();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        osc.type = index % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);
        osc.detune.setValueAtTime(index % 2 === 0 ? -3 : 3, ctx.currentTime);
        voiceGain.gain.setValueAtTime(0.11 / notes.length, ctx.currentTime);
        lfo.frequency.setValueAtTime(0.07 + index * 0.015, ctx.currentTime);
        lfoGain.gain.setValueAtTime(0.025 / notes.length, ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(voiceGain.gain);
        osc.connect(voiceGain);
        voiceGain.connect(filter);
        osc.start();
        lfo.start();
        this.ambientNodes.push(osc, voiceGain, lfo, lfoGain);
      });
    } catch (e) {
      console.warn('Web Audio Ambient init failed:', e);
    }
  }
  private killCurrentAmbientNodes() {
    if (this.ambientSequenceInterval) {
      clearInterval(this.ambientSequenceInterval);
      this.ambientSequenceInterval = null;
    }
    this.ambientNodes.forEach((node) => {
      try {
        if ('stop' in node && typeof (node as any).stop === 'function') {
          (node as any).stop();
        }
        node.disconnect();
      } catch {
        // ignore
      }
    });
    this.ambientNodes = [];
    this.ambientGain = null;
  }

  public stopAmbient() {
    if (this.ambientGain && this.audioCtx) {
      try {
        this.ambientGain.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.4);
      } catch {
        // ignore
      }
    }
    this.stopAmbientTimeout = setTimeout(() => {
      this.killCurrentAmbientNodes();
      this.stopAmbientTimeout = null;
    }, 450);
  }

  /* ── Spoken Bible Reading (Web SpeechSynthesis) ── */
  public loadChapter(book: string, chapter: number, translationId = DEFAULT_BIBLE_TRANSLATION_ID): boolean {
    const canonical = getBibleChapter(book, chapter, translationId);
    if (canonical.verses.length === 0) return false;

    // Encerra o capítulo anterior antes de trocar a fila de versículos, evitando fala duplicada
    // ou que uma voz antiga continue após a seleção de outro livro/edição.
    this.stop();

    this.currentBook = book;
    this.currentChapter = chapter;
    this.chapterData = {
      book: canonical.book,
      chapter: canonical.chapter,
      translation: translationId,
      title: canonical.title,
      subtitle: canonical.subtitle,
      verses: canonical.verses.map((v) => v.text),
    };

    this.currentVerseIndex = 0;
    this.currentPlaybackTime = 0;
    this.computeEstimates();
    this.updateMediaSessionMetadata();
    return true;
  }

  private computeEstimates() {
    this.verseTimeEstimates = this.chapterData.verses.map((v) => {
      const words = v.split(/\s+/).length;
      return Math.max(3.5, words * 0.45);
    });
    this.totalDurationSec = Math.round(
      this.verseTimeEstimates.reduce((acc, t) => acc + t, 0)
    );
  }

  public getCurrentChapterData(): ChapterAudioData {
    return this.chapterData;
  }

  public getAllVerses(): string[] {
    return this.chapterData.verses;
  }

  private getNeuralAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    if (!this.neuralAudio) {
      this.neuralAudio = new Audio();
      this.neuralAudio.volume = this.speechVolume;
      this.neuralAudio.playbackRate = this.currentSpeed;
    }
    return this.neuralAudio;
  }

  /** Cancelamento assíncrono seguro que não bloqueia a fila do navegador */
  private safeCancelSpeech(onDone?: () => void) {
    if (this.cancelSafetyTimeout) {
      clearTimeout(this.cancelSafetyTimeout);
      this.cancelSafetyTimeout = null;
    }
    if (this.speechWatchdogTimeout) {
      clearTimeout(this.speechWatchdogTimeout);
      this.speechWatchdogTimeout = null;
    }

    if (this.neuralAudio) {
      try {
        this.neuralAudio.pause();
        this.neuralAudio.currentTime = 0;
        this.neuralAudio.onended = null;
        this.neuralAudio.onerror = null;
      } catch {
        // ignore
      }
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }

    // Intervalo de respiro indispensável no Chromium Windows
    this.cancelSafetyTimeout = setTimeout(() => {
      this.cancelSafetyTimeout = null;
      onDone?.();
    }, 45);
  }

  public play() {
    this.initAudioContext();

    if (this.isPaused) {
      if (this.neuralAudio && this.neuralAudio.src && !this.neuralAudio.ended) {
        try {
          void this.neuralAudio.play();
          this.isPaused = false;
          this.isSpeaking = true;
          this.startTimer();
          this.startAmbient();
          this.startSleepTimerCountdown();
          this.updateMediaSessionPlaybackState(true);
          this.callbacks.onStateChange?.(true);
          return;
        } catch {
          // ignore
        }
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
        try {
          window.speechSynthesis.resume();
          this.isPaused = false;
          this.isSpeaking = true;
          this.startTimer();
          this.startAmbient();
          this.startSleepTimerCountdown();
          this.updateMediaSessionPlaybackState(true);
          this.callbacks.onStateChange?.(true);
          return;
        } catch {
          // Fallback caso resume falhe
        }
      }
    }

    this.isSpeaking = true;
    this.isPaused = false;
    this.startAmbient();
    this.startTimer();
    this.startSleepTimerCountdown();
    this.updateMediaSessionPlaybackState(true);

    this.safeCancelSpeech(() => {
      if (this.isSpeaking && !this.isPaused) {
        void this.speakVerse(this.currentVerseIndex);
      }
    });

    this.callbacks.onStateChange?.(true);
  }

  public pause() {
    this.isPaused = true;
    this.isSpeaking = false;
    if (this.neuralAudio) {
      try {
        this.neuralAudio.pause();
      } catch {
        // ignore
      }
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.pause();
      } catch {
        // ignore
      }
    }
    this.stopAmbient();
    this.stopTimer();
    this.updateMediaSessionPlaybackState(false);
    this.callbacks.onStateChange?.(false);
  }

  public resume() {
    this.play();
  }

  public togglePlay() {
    if (this.isSpeaking && !this.isPaused) {
      this.pause();
    } else {
      this.play();
    }
  }

  public stop() {
    this.safeCancelSpeech();
    this.stopAmbient();
    this.stopTimer();
    this.currentPlaybackTime = 0;
    this.currentVerseIndex = 0;
    this.isSpeaking = false;
    this.isPaused = false;
    this.updateMediaSessionPlaybackState(false);
    this.callbacks.onStateChange?.(false);
    this.callbacks.onTimeUpdate?.(0, this.totalDurationSec);
  }

  public setSpeed(speed: number) {
    this.currentSpeed = speed;
    if (this.neuralAudio) {
      this.neuralAudio.playbackRate = speed;
    }
    if (this.isSpeaking && !this.isPaused) {
      this.safeCancelSpeech(() => {
        if (this.isSpeaking && !this.isPaused) {
          void this.speakVerse(this.currentVerseIndex);
        }
      });
    }
  }

  public setVoice(voiceId: VoiceProfileId) {
    this.currentVoiceId = voiceId;
    if (this.isSpeaking && !this.isPaused) {
      this.safeCancelSpeech(() => {
        if (this.isSpeaking && !this.isPaused) {
          void this.speakVerse(this.currentVerseIndex);
        }
      });
    }
  }

  public setSpeechVolume(volume: number) {
    this.speechVolume = Math.max(0, Math.min(1, volume));
    if (this.neuralAudio) {
      this.neuralAudio.volume = this.speechVolume;
    }
  }

  public setSystemVoiceURI(uri: string) {
    this.currentSystemVoiceURI = uri;
  }

  public toggleLoopVerse(): boolean {
    this.isLoopingVerse = !this.isLoopingVerse;
    return this.isLoopingVerse;
  }

  public getIsLoopingVerse(): boolean {
    return this.isLoopingVerse;
  }

  public nextVerse() {
    if (this.currentVerseIndex + 1 < this.chapterData.verses.length) {
      this.seekToVerse(this.currentVerseIndex + 1);
    }
  }

  public prevVerse() {
    if (this.currentVerseIndex > 0) {
      this.seekToVerse(this.currentVerseIndex - 1);
    }
  }

  public seekToVerse(targetIndex: number) {
    const clamped = Math.max(0, Math.min(this.chapterData.verses.length - 1, targetIndex));
    this.currentVerseIndex = clamped;

    let cumulative = 0;
    for (let i = 0; i < clamped; i++) {
      cumulative += this.verseTimeEstimates[i] || 4;
    }
    this.currentPlaybackTime = cumulative;

    this.callbacks.onTimeUpdate?.(this.currentPlaybackTime, this.totalDurationSec);
    this.callbacks.onVerseChange?.(
      this.currentVerseIndex,
      this.chapterData.verses[this.currentVerseIndex] || ''
    );

    if (this.isSpeaking && !this.isPaused) {
      this.safeCancelSpeech(() => {
        if (this.isSpeaking && !this.isPaused) {
          this.speakVerse(this.currentVerseIndex);
        }
      });
    }
  }

  public seek(seconds: number) {
    const clamped = Math.max(0, Math.min(this.totalDurationSec, seconds));
    this.currentPlaybackTime = clamped;

    let cumulative = 0;
    let targetIndex = 0;
    for (let i = 0; i < this.verseTimeEstimates.length; i++) {
      if (cumulative + this.verseTimeEstimates[i] >= clamped) {
        targetIndex = i;
        break;
      }
      cumulative += this.verseTimeEstimates[i];
    }

    this.currentVerseIndex = targetIndex;
    this.callbacks.onTimeUpdate?.(this.currentPlaybackTime, this.totalDurationSec);
    this.callbacks.onVerseChange?.(
      this.currentVerseIndex,
      this.chapterData.verses[this.currentVerseIndex] || ''
    );

    if (this.isSpeaking && !this.isPaused) {
      this.safeCancelSpeech(() => {
        if (this.isSpeaking && !this.isPaused) {
          this.speakVerse(this.currentVerseIndex);
        }
      });
    }
  }

  public skip(deltaSeconds: number) {
    this.seek(this.currentPlaybackTime + deltaSeconds);
  }

  /* ── Sleep Timer com Fade-out Suave ── */
  public setSleepTimer(minutes: number | 'end_of_chapter' | null) {
    if (minutes === null) {
      this.sleepTimerRemainingSec = null;
      this.sleepTimerMode = null;
      if (this.sleepTimerInterval) {
        clearInterval(this.sleepTimerInterval);
        this.sleepTimerInterval = null;
      }
      this.callbacks.onSleepTimerTick?.(null);
      return;
    }

    if (minutes === 'end_of_chapter') {
      this.sleepTimerMode = 'end_of_chapter';
      this.sleepTimerRemainingSec = Math.max(0, this.totalDurationSec - this.currentPlaybackTime);
      this.callbacks.onSleepTimerTick?.(this.sleepTimerRemainingSec);
      return;
    }

    this.sleepTimerMode = 'minutes';
    this.sleepTimerRemainingSec = minutes * 60;
    this.callbacks.onSleepTimerTick?.(this.sleepTimerRemainingSec);
    this.startSleepTimerCountdown();
  }

  private startSleepTimerCountdown() {
    if (this.sleepTimerInterval) {
      clearInterval(this.sleepTimerInterval);
      this.sleepTimerInterval = null;
    }

    if (this.sleepTimerMode === 'minutes' && this.sleepTimerRemainingSec !== null) {
      this.sleepTimerInterval = setInterval(() => {
        if (!this.isSpeaking || this.isPaused) return;

        if (this.sleepTimerRemainingSec !== null && this.sleepTimerRemainingSec > 0) {
          this.sleepTimerRemainingSec -= 1;
          this.callbacks.onSleepTimerTick?.(this.sleepTimerRemainingSec);

          if (this.sleepTimerRemainingSec <= 4 && this.ambientGain && this.audioCtx) {
            try {
              this.ambientGain.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + 3.8);
            } catch {
              // ignore
            }
          }

          if (this.sleepTimerRemainingSec <= 0) {
            this.setSleepTimer(null);
            this.pause();
          }
        }
      }, 1000);
    }
  }

  private async speakVerse(index: number) {
    if (index >= this.chapterData.verses.length) {
      if (this.isLoopingVerse) {
        void this.speakVerse(this.currentVerseIndex);
        return;
      }
      if (this.sleepTimerMode === 'end_of_chapter') {
        this.setSleepTimer(null);
      }
      this.stop();
      this.callbacks.onEnded?.();
      return;
    }

    const targetIndex = this.isLoopingVerse ? this.currentVerseIndex : index;
    const verseText = this.chapterData.verses[targetIndex];
    this.currentVerseIndex = targetIndex;
    this.callbacks.onVerseChange?.(targetIndex, verseText);

    // ── 1. Reprodução Neural de Alta Fidelidade com Edge TTS (Duarte, Francisca, etc.) ──
    const audioEl = this.getNeuralAudio();
    if (audioEl) {
      try {
        const { url } = await fetchEdgeNeuralAudio(verseText, {
          translation: this.chapterData.translation || DEFAULT_BIBLE_TRANSLATION_ID,
          book: this.chapterData.book,
          chapter: this.chapterData.chapter,
          verse: targetIndex + 1,
          voiceId: this.currentVoiceId,
        });

        if (!this.isSpeaking || this.isPaused) return;

        // Limpa handlers prévios antes de associar novo áudio
        audioEl.onended = null;
        audioEl.onerror = null;

        audioEl.src = url;
        audioEl.playbackRate = this.currentSpeed;
        audioEl.volume = this.speechVolume;

        audioEl.onended = () => {
          if (this.isSpeaking && !this.isPaused) {
            this.callbacks.onVerseCompleted?.(targetIndex, verseText);
            if (this.isLoopingVerse) {
              setTimeout(() => {
                if (this.isSpeaking && !this.isPaused) {
                  void this.speakVerse(this.currentVerseIndex);
                }
              }, 700);
            } else {
              void this.speakVerse(this.currentVerseIndex + 1);
            }
          }
        };

        audioEl.onerror = (e) => {
          console.warn('[audioEngine] Erro no áudio neural, usando fallback local:', e);
          this.speakVerseFallbackLocal(targetIndex, verseText);
        };

        await audioEl.play();

        // Pré-carrega o próximo versículo em segundo plano no cache IndexedDB
        const nextIndex = targetIndex + 1;
        if (nextIndex < this.chapterData.verses.length) {
          const nextText = this.chapterData.verses[nextIndex];
          void fetchEdgeNeuralAudio(nextText, {
            translation: this.chapterData.translation || DEFAULT_BIBLE_TRANSLATION_ID,
            book: this.chapterData.book,
            chapter: this.chapterData.chapter,
            verse: nextIndex + 1,
            voiceId: this.currentVoiceId,
          }).catch(() => {});
        }

        return;
      } catch (err) {
        console.warn('[audioEngine] Falha ao carregar áudio neural Edge TTS, usando fallback local:', err);
      }
    }

    // ── 2. Fallback Transparente se estiver offline e sem cache ──
    this.speakVerseFallbackLocal(targetIndex, verseText);
  }

  private speakVerseFallbackLocal(targetIndex: number, verseText: string) {
    if (!this.isSpeechSupported()) return;

    const utterance = new SpeechSynthesisUtterance(verseText);
    const ptVoices = this.getInstalledPortugueseVoices();
    const profile = AVAILABLE_VOICES.find((voice) => voice.id === this.currentVoiceId) || AVAILABLE_VOICES[0];

    // Tenta encontrar uma voz correspondente aos hints do perfil (ex: Edge Natural Antonio, Francisca, etc.)
    let chosenVoice: SpeechSynthesisVoice | undefined;
    if (this.currentSystemVoiceURI) {
      chosenVoice = ptVoices.find((v) => v.voiceURI === this.currentSystemVoiceURI);
    }
    if (!chosenVoice && profile.systemVoiceHint && profile.systemVoiceHint.length > 0) {
      for (const hint of profile.systemVoiceHint) {
        const found = ptVoices.find((v) => v.name.toLowerCase().includes(hint.toLowerCase()) || v.voiceURI.toLowerCase().includes(hint.toLowerCase()));
        if (found) {
          chosenVoice = found;
          break;
        }
      }
    }
    if (!chosenVoice) {
      chosenVoice =
        ptVoices.find((voice) => voice.name.toLowerCase().includes('natural') || voice.name.toLowerCase().includes('online')) ||
        ptVoices.find((voice) => voice.lang.toLowerCase().startsWith('pt-br')) ||
        ptVoices[0];
    }

    utterance.lang = chosenVoice?.lang || 'pt-BR';
    if (chosenVoice) utterance.voice = chosenVoice;
    utterance.volume = this.speechVolume;

    utterance.pitch = 1;
    utterance.rate = Math.max(0.65, Math.min(2.0, this.currentSpeed * profile.rate));

    // Watchdog anti-bloqueio: se em 2 segundos não iniciar a fala, recupera
    if (this.speechWatchdogTimeout) {
      clearTimeout(this.speechWatchdogTimeout);
    }
    this.speechWatchdogTimeout = setTimeout(() => {
      if (this.isSpeaking && !this.isPaused && window.speechSynthesis.speaking === false) {
        try {
          window.speechSynthesis.resume();
        } catch {
          // ignore
        }
      }
    }, 2000);

    utterance.onstart = () => {
      if (this.speechWatchdogTimeout) {
        clearTimeout(this.speechWatchdogTimeout);
        this.speechWatchdogTimeout = null;
      }
    };

    utterance.onend = () => {
      if (this.isSpeaking && !this.isPaused) {
        this.callbacks.onVerseCompleted?.(targetIndex, verseText);
        if (this.isLoopingVerse) {
          setTimeout(() => {
            if (this.isSpeaking && !this.isPaused) {
              void this.speakVerse(this.currentVerseIndex);
            }
          }, 700);
        } else {
          void this.speakVerse(this.currentVerseIndex + 1);
        }
      }
    };

    utterance.onerror = (e) => {
      if ((e as any).error === 'canceled' || (e as any).error === 'interrupted') {
        return;
      }
      console.warn('SpeechSynthesis utterance error:', (e as any).error);
      if (this.isSpeaking && !this.isPaused) {
        setTimeout(() => void this.speakVerse(this.currentVerseIndex + 1), 1000);
      }
    };

    this.currentUtterance = utterance;

    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('SpeechSynthesis speak failed:', err);
    }
  }

  private startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      this.currentPlaybackTime += 1;
      if (this.currentPlaybackTime >= this.totalDurationSec) {
        this.currentPlaybackTime = this.totalDurationSec;
        this.stopTimer();
      }
      this.callbacks.onTimeUpdate?.(this.currentPlaybackTime, this.totalDurationSec);
    }, 1000 / this.currentSpeed);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /* ── Media Session API ── */
  private updateMediaSessionMetadata() {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: `${this.chapterData.book} ${this.chapterData.chapter} — ${this.chapterData.title}`,
          artist: 'BiblIA • A Palavra Sagrada Narrada',
          album: `${getBibleTranslationLabel(this.chapterData.translation)} • ${this.chapterData.subtitle}`,
          artwork: [
            {
              src: `${window.location.origin}/pwa-512x512.png`,
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        });

        navigator.mediaSession.setActionHandler('play', () => this.play());
        navigator.mediaSession.setActionHandler('pause', () => this.pause());
        navigator.mediaSession.setActionHandler('seekbackward', () => this.skip(-10));
        navigator.mediaSession.setActionHandler('seekforward', () => this.skip(10));
        navigator.mediaSession.setActionHandler('previoustrack', () => this.prevVerse());
        navigator.mediaSession.setActionHandler('nexttrack', () => this.nextVerse());
      } catch {
        // ignore
      }
    }
  }

  private updateMediaSessionPlaybackState(playing: boolean) {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
      } catch {
        // ignore
      }
    }
  }

  /** Pronúncia de texto avulso (jogos, quiz, perguntas da IA) */
  public async speakText(text: string): Promise<void> {
    const audioEl = this.getNeuralAudio();
    if (audioEl) {
      try {
        const cleanSnippet = text.slice(0, 600);
        const pseudoVerse = Math.abs(cleanSnippet.slice(0, 40).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
        const { url } = await fetchEdgeNeuralAudio(cleanSnippet, {
          translation: 'ui',
          book: 'app',
          chapter: 1,
          verse: pseudoVerse,
          voiceId: this.currentVoiceId,
        });
        audioEl.src = url;
        audioEl.playbackRate = this.currentSpeed;
        audioEl.volume = this.speechVolume;
        return new Promise((resolve) => {
          audioEl.onended = () => resolve();
          audioEl.onerror = () => resolve();
          void audioEl.play().catch(() => resolve());
        });
      } catch {
        // Fallback para síntese local se offline
      }
    }

    return new Promise((resolve) => {
      if (!this.isSpeechSupported()) {
        resolve();
        return;
      }
      this.safeCancelSpeech(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = this.getInstalledPortugueseVoices();
        const selectedVoice = voices.find((voice) => voice.voiceURI === this.currentSystemVoiceURI) || voices[0];
        utterance.lang = selectedVoice?.lang || 'pt-PT';
        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.volume = 1.0;
        const style = AVAILABLE_VOICES.find((voice) => voice.id === this.currentVoiceId) || AVAILABLE_VOICES[0];
        utterance.rate = Math.max(0.65, Math.min(2, (this.currentSpeed || 1.0) * style.rate));
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        try {
          window.speechSynthesis.speak(utterance);
        } catch {
          resolve();
        }
      });
    });
  }

  public getStats() {
    return {
      isPlaying: this.isSpeaking && !this.isPaused,
      currentTime: this.currentPlaybackTime,
      duration: this.totalDurationSec,
      verseIndex: this.currentVerseIndex,
      activeAmbient: this.activeAmbient,
      ambientVolume: this.ambientVolume,
      speed: this.currentSpeed,
      voiceId: this.currentVoiceId,
      sleepTimerRemainingSec: this.sleepTimerRemainingSec,
      isLoopingVerse: this.isLoopingVerse,
      isSupported: this.isSpeechSupported(),
    };
  }
}

export const audioEngine = new AudioEngine();
