import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  audioEngine,
  AmbientSoundType,
  VoiceProfileId,
  AVAILABLE_VOICES,
  VoiceProfile,
} from '../lib/audioEngine';
import { getLastRead, recordChapterProgress, recordVerseProgress, saveLastRead } from '../lib/bibleStorage';
import { BIBLE_BOOKS, getBibleChapter, loadBibleChapter, DEFAULT_BIBLE_TRANSLATION_ID } from '../data/bibleData';

export interface AudioTrack {
  id: string;
  book: string;
  chapter: number;
  translationId: string;
  title: string;
  subtitle: string;
  quote: string;
  duration: number; // in seconds
  voiceId: VoiceProfileId;
  ambientId: AmbientSoundType;
}

interface AudioContextType {
  currentTrack: AudioTrack;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  selectedVoice: VoiceProfileId;
  selectedSystemVoiceURI: string;
  availableVoices: VoiceProfile[];
  installedSystemVoices: SpeechSynthesisVoice[];
  isSpeechSupported: boolean;
  selectedAmbient: AmbientSoundType;
  ambientVolume: number;
  speechVolume: number;
  currentVerseIndex: number;
  currentVerseText: string;
  allChapterVerses: string[];
  sleepTimerRemainingSec: number | null;
  isLoopingVerse: boolean;
  isFocusMode: boolean;
  togglePlay: () => void;
  pause: () => void;
  play: () => void;
  seek: (seconds: number) => void;
  seekToVerse: (verseIndex: number) => void;
  nextVerse: () => void;
  prevVerse: () => void;
  skip: (deltaSeconds: number) => void;
  setSpeed: (speed: number) => void;
  setSpeechVolume: (volume: number) => void;
  setVoice: (voiceId: VoiceProfileId) => void;
  setSystemVoice: (voiceURI: string) => void;
  setAmbient: (ambientId: AmbientSoundType) => void;
  setAmbientVolume: (vol: number) => void;
  setSleepTimer: (minutes: number | 'end_of_chapter' | null) => void;
  toggleLoopVerse: () => void;
  toggleFocusMode: () => void;
  loadTrack: (book: string, chapter: number, title?: string, translationId?: string, startingVerse?: number) => Promise<boolean>;
}

const DEFAULT_TRACK: AudioTrack = {
  id: 'salmos-23',
  book: 'Salmos',
  chapter: 23,
  translationId: DEFAULT_BIBLE_TRANSLATION_ID,
  title: 'Salmos 23',
  subtitle: 'O Senhor é o meu pastor',
  quote: '',
  duration: 130,
  voiceId: 'neural_davi_pt',
  ambientId: 'strings',
};

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<AudioTrack>(() => {
    const last = getLastRead();
    return { ...DEFAULT_TRACK, book: last.book, chapter: last.chapter, title: `${last.book} ${last.chapter}`, translationId: last.translation };
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(130);
  const [playbackSpeed, setPlaybackSpeed] = useState(() => Number(window.localStorage.getItem('biblia_audio_speed')) || 1.0);
  const [selectedVoice, setSelectedVoice] = useState<VoiceProfileId>('neural_davi_pt');
  const [selectedAmbient, setSelectedAmbient] = useState<AmbientSoundType>('strings');
  const [ambientVolume, setAmbientVolumeState] = useState(0.55);
  const [speechVolume, setSpeechVolumeState] = useState(() => Number(window.localStorage.getItem('biblia_audio_speech_volume')) || 1.0);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [currentVerseText, setCurrentVerseText] = useState('');
  const [allChapterVerses, setAllChapterVerses] = useState<string[]>([]);
  const [installedSystemVoices, setInstalledSystemVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedSystemVoiceURI, setSelectedSystemVoiceURI] = useState(() =>
    typeof window === 'undefined' ? '' : window.localStorage.getItem('biblia_audio_system_voice_uri') || ''
  );
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [sleepTimerRemainingSec, setSleepTimerRemainingSec] = useState<number | null>(null);
  const [isLoopingVerse, setIsLoopingVerse] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  const isMounted = useRef(false);
  const currentTrackRef = useRef<AudioTrack>(currentTrack);
  const loadTrackRef = useRef<AudioContextType['loadTrack'] | null>(null);

  useEffect(() => {
    isMounted.current = true;
    setIsSpeechSupported(audioEngine.isSpeechSupported());
    audioEngine.setSpeed(playbackSpeed);
    audioEngine.setSpeechVolume(speechVolume);
    const syncVoices = () => {
      if (!isMounted.current) return;
      const voices = audioEngine.getInstalledPortugueseVoices();
      setInstalledSystemVoices(voices);
      if (!voices.length) return;
      const storedUri = window.localStorage.getItem('biblia_audio_system_voice_uri') || '';
      const storedVoice = voices.find((voice) => voice.voiceURI === storedUri);
      const preferredVoice = voices.find((voice) => /hell?ena|helia/i.test(voice.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))
        || voices.find((voice) => /pt-pt/i.test(voice.lang))
        || voices.find((voice) => /pt-br/i.test(voice.lang))
        || voices[0];
      const choice = storedVoice || preferredVoice;
      if (choice) {
        setSelectedSystemVoiceURI(choice.voiceURI);
        audioEngine.setSystemVoiceURI(choice.voiceURI);
        window.localStorage.setItem('biblia_audio_system_voice_uri', choice.voiceURI);
      }
    };
    syncVoices();

    // Listener para vozes carregadas assincronamente pelo navegador
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = syncVoices;
    }

    audioEngine.setCallbacks({
      onTimeUpdate: (sec, total) => {
        if (isMounted.current) {
          setCurrentTime(sec);
          setDuration(total || 130);
        }
      },
      onVerseChange: (idx, text) => {
        if (isMounted.current) {
          setCurrentVerseIndex(idx);
          setCurrentVerseText(text);
          const activeChapter = audioEngine.getCurrentChapterData();
          const chapterData = getBibleChapter(
            activeChapter.book,
            activeChapter.chapter,
            activeChapter.translation
          );
          const activeVerse = chapterData.verses[idx];
          if (activeVerse) {
            saveLastRead(
              activeChapter.book,
              activeChapter.chapter,
              activeVerse.num,
              activeChapter.translation
            );
          }
        }
      },
      onVerseCompleted: (idx) => {
        const activeChapter = audioEngine.getCurrentChapterData();
        const verse = getBibleChapter(activeChapter.book, activeChapter.chapter, activeChapter.translation).verses[idx];
        if (verse) recordVerseProgress(activeChapter.book, activeChapter.chapter, verse.num, 'listened', activeChapter.translation);
      },
      onStateChange: (playing) => {
        if (isMounted.current) {
          setIsPlaying(playing);
        }
      },
      onEnded: async () => {
        if (isMounted.current) {
          setIsPlaying(false);
          setCurrentTime(0);
          const endedTrack = currentTrackRef.current;
          const endedChapter = getBibleChapter(
            endedTrack.book,
            endedTrack.chapter,
            endedTrack.translationId
          );

          // Só corpus integral e validado pode concluir progresso; capítulos validados
          // seguem automaticamente para o próximo capítulo integral na mesma edição.
          if (endedChapter.isComplete) {
            recordChapterProgress(endedTrack.book, endedTrack.chapter, 'listened', true);
            const currentBookIndex = BIBLE_BOOKS.findIndex((book) => book.name === endedTrack.book);
            const currentBookMeta = BIBLE_BOOKS[currentBookIndex];
            let nextBook = currentBookMeta;
            let nextChapter = endedTrack.chapter + 1;

            if (currentBookMeta && nextChapter > currentBookMeta.totalChapters) {
              nextBook = BIBLE_BOOKS[currentBookIndex + 1];
              nextChapter = 1;
            }

            if (nextBook) {
              const nextData = await loadBibleChapter(nextBook.name, nextChapter, endedTrack.translationId);
              if (nextData.isComplete) {
                window.setTimeout(() => {
                  if (isMounted.current) {
                    void loadTrackRef.current?.(
                      nextBook.name,
                      nextChapter,
                      `${nextBook.name} ${nextChapter} — ${nextData.title}`,
                      endedTrack.translationId,
                      1
                    );
                  }
                }, 0);
              }
            }
          }
        }
      },
      onSleepTimerTick: (remaining) => {
        if (isMounted.current) {
          setSleepTimerRemainingSec(remaining);
        }
      },
    });

    const startingPosition = getLastRead();
    void loadBibleChapter(startingPosition.book, startingPosition.chapter, DEFAULT_BIBLE_TRANSLATION_ID).then((chapter) => {
      if (!isMounted.current || !audioEngine.loadChapter(startingPosition.book, startingPosition.chapter, DEFAULT_BIBLE_TRANSLATION_ID)) return;
      setAllChapterVerses(audioEngine.getAllVerses());
      const verseIndex = Math.max(0, chapter.verses.findIndex((verse) => verse.num >= startingPosition.verse));
      audioEngine.seekToVerse(verseIndex);
      setCurrentVerseIndex(verseIndex);
      setCurrentVerseText(chapter.verses[verseIndex]?.text || '');
      setCurrentTrack((track) => ({ ...track, book: startingPosition.book, chapter: startingPosition.chapter, title: `${startingPosition.book} ${startingPosition.chapter}`, quote: chapter.verses[verseIndex]?.text || '' }));
      setDuration(audioEngine.getStats().duration);
    }).catch(() => {
      if (isMounted.current) setAllChapterVerses([]);
    });

    return () => {
      isMounted.current = false;
      audioEngine.stop();
    };
  }, []);

  const togglePlay = () => {
    audioEngine.togglePlay();
  };

  const pause = () => {
    audioEngine.pause();
  };

  const play = () => {
    audioEngine.play();
  };

  const seek = (seconds: number) => {
    audioEngine.seek(seconds);
  };

  const seekToVerse = (verseIndex: number) => {
    audioEngine.seekToVerse(verseIndex);
  };

  const nextVerse = () => {
    audioEngine.nextVerse();
  };

  const prevVerse = () => {
    audioEngine.prevVerse();
  };

  const skip = (deltaSeconds: number) => {
    audioEngine.skip(deltaSeconds);
  };

  const setSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    window.localStorage.setItem('biblia_audio_speed', String(speed));
    audioEngine.setSpeed(speed);
  };

  const setSpeechVolume = (volume: number) => {
    setSpeechVolumeState(volume);
    window.localStorage.setItem('biblia_audio_speech_volume', String(volume));
    audioEngine.setSpeechVolume(volume);
  };

  const setVoice = (voiceId: VoiceProfileId) => {
    setSelectedVoice(voiceId);
    audioEngine.setVoice(voiceId);
  };

  const setSystemVoice = (voiceURI: string) => {
    setSelectedSystemVoiceURI(voiceURI);
    window.localStorage.setItem('biblia_audio_system_voice_uri', voiceURI);
    audioEngine.setSystemVoiceURI(voiceURI);
  };

  const setAmbient = (ambientId: AmbientSoundType) => {
    setSelectedAmbient(ambientId);
    audioEngine.setAmbient(ambientId);
  };

  const setAmbientVolume = (vol: number) => {
    setAmbientVolumeState(vol);
    audioEngine.setAmbientVolume(vol);
  };

  const setSleepTimer = (minutes: number | 'end_of_chapter' | null) => {
    audioEngine.setSleepTimer(minutes);
  };

  const toggleLoopVerse = () => {
    const next = audioEngine.toggleLoopVerse();
    setIsLoopingVerse(next);
  };

  const toggleFocusMode = () => {
    setIsFocusMode((prev) => !prev);
  };

  const loadTrack = async (
    book: string,
    chapter: number,
    customTitle?: string,
    translationId = DEFAULT_BIBLE_TRANSLATION_ID,
    startingVerse = 1
  ): Promise<boolean> => {
    let chapterData;
    try {
      chapterData = await loadBibleChapter(book, chapter, translationId);
    } catch {
      return false;
    }
    if (!chapterData.isAvailable || !audioEngine.loadChapter(book, chapter, translationId)) return false;
    const data = audioEngine.getCurrentChapterData();
    const startingIndex = Math.max(
      0,
      chapterData.verses.findIndex((verse) => verse.num >= startingVerse)
    );
    const newTrack: AudioTrack = {
      id: `${translationId}-${book.toLowerCase()}-${chapter}`,
      book,
      chapter,
      translationId,
      title: customTitle || data.title,
      subtitle: data.subtitle,
      quote: data.verses[startingIndex] || data.verses[0] || 'A Palavra Viva',
      duration: audioEngine.getStats().duration,
      voiceId: selectedVoice,
      ambientId: selectedAmbient,
    };
    setCurrentVerseIndex(0);
    setCurrentVerseText(data.verses[0] || '');
    setAllChapterVerses(audioEngine.getAllVerses());
    audioEngine.seekToVerse(startingIndex);
    currentTrackRef.current = newTrack;
    setCurrentTrack(newTrack);
    audioEngine.play();
    return true;
  };
  loadTrackRef.current = loadTrack;

  return (
    <AudioContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        playbackSpeed,
        selectedVoice,
        selectedSystemVoiceURI,
        availableVoices: AVAILABLE_VOICES,
        installedSystemVoices,
        isSpeechSupported,
        selectedAmbient,
        ambientVolume,
        speechVolume,
        currentVerseIndex,
        currentVerseText,
        allChapterVerses,
        sleepTimerRemainingSec,
        isLoopingVerse,
        isFocusMode,
        togglePlay,
        pause,
        play,
        seek,
        seekToVerse,
        nextVerse,
        prevVerse,
        skip,
        setSpeed,
        setSpeechVolume,
        setVoice,
        setSystemVoice,
        setAmbient,
        setAmbientVolume,
        setSleepTimer,
        toggleLoopVerse,
        toggleFocusMode,
        loadTrack,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
