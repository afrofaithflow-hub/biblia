import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useTheme } from '../../context/ThemeContext';
import { useAudio } from '../../context/AudioContext';
import { useAuth } from '../../context/AuthContext';
import { getLastRead } from '../../lib/bibleStorage';
import { DEFAULT_BIBLE_TRANSLATION_ID, loadBibleChapter, getBibleTranslationLabel } from '../../data/bibleData';
import { getMaputoDateKey, getUserProgressTracks, getRecentPracticeDates } from '../../lib/gameSession';
import { getCurrentJourneyPhase } from '../../lib/gameJourney';
import { queueBibleReference } from '../../lib/scriptureReference';
import { getEffectiveDisplayName } from '../../lib/userProfile';
import { UserAvatar } from '../common/UserAvatar';
import { SacredOrb } from '../ai/SacredOrb';
import { TutorialSpotlight } from '../common/TutorialSpotlight';
import { isTutorialCompleted, markTutorialCompleted, TUTORIAL_STEPS } from '../../lib/tutorialService';

interface HomeScreenProps {
  onNavigate: (screenId: string) => void;
  showToast: (message: string, icon?: string) => void;
}

interface DailyVerseEntry {
  book: string;
  chapter: number;
  verse: number;
  fallbackText: string;
  reflection: string;
}

interface PrayerEntry {
  id: string;
  text: string;
  createdAt: string;
}

const PRAYER_JOURNAL_KEY = 'biblia_prayer_journal_v1';

const DAILY_VERSES: DailyVerseEntry[] = [
  {
    book: 'Salmos',
    chapter: 119,
    verse: 105,
    fallbackText: 'Lâmpada para os meus pés é a tua palavra, e luz para o meu caminho.',
    reflection: 'Mesmo nas noites escuras de incerteza, a Palavra de Deus ilumina o próximo passo seguro a dar.',
  },
  {
    book: 'Josué',
    chapter: 1,
    verse: 9,
    fallbackText: 'Não te mandei eu? Esforça-te, e tem bom ânimo; não temas, nem te espantes; porque o Senhor teu Deus é contigo por onde quer que andares.',
    reflection: 'A coragem bíblica não é ausência de receio, mas a certeza inabalável de que o Senhor caminha ao teu lado.',
  },
  {
    book: 'Salmos',
    chapter: 23,
    verse: 1,
    fallbackText: 'O Senhor é o meu pastor, nada me faltará.',
    reflection: 'Quando o Bom Pastor guia o teu coração, a paz e o descanso substituem a ansiedade do amanhã.',
  },
  {
    book: 'Provérbios',
    chapter: 3,
    verse: 5,
    fallbackText: 'Confia no Senhor de todo o teu coração, e não te estribes no teu próprio entendimento.',
    reflection: 'Entregar o controle a Deus liberta a mente do peso de tentar resolver tudo pela própria força.',
  },
  {
    book: 'João',
    chapter: 3,
    verse: 16,
    fallbackText: 'Porque Deus amou ao mundo de tal maneira, que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.',
    reflection: 'O amor de Deus por ti não é uma promessa distante, mas uma graça viva manifestada em Cristo Jesus.',
  },
  {
    book: 'Filipenses',
    chapter: 4,
    verse: 13,
    fallbackText: 'Posso todas as coisas em Cristo que me fortalece.',
    reflection: 'A tua perseverança hoje não depende apenas da tua energia humana, mas da força inesgotável do Senhor.',
  },
  {
    book: 'Romanos',
    chapter: 8,
    verse: 28,
    fallbackText: 'E sabemos que todas as coisas contribuem juntamente para o bem daqueles que amam a Deus, daqueles que são chamados segundo o seu decreto.',
    reflection: 'Nenhum sofrimento ou espera é vão: Deus une cada detalhe da tua jornada para um propósito eterno.',
  },
  {
    book: 'Isaías',
    chapter: 41,
    verse: 10,
    fallbackText: 'Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus; eu te fortaleço, e te ajudo.',
    reflection: 'Não precisas enfrentar os desafios de hoje sozinho; a mão justa de Deus sustenta cada passo teu.',
  },
  {
    book: 'Salmos',
    chapter: 46,
    verse: 1,
    fallbackText: 'Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia.',
    reflection: 'No turbilhão dos problemas, lembra-te que Deus não é socorro distante, mas abrigo imediato.',
  },
  {
    book: 'Mateus',
    chapter: 11,
    verse: 28,
    fallbackText: 'Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.',
    reflection: 'Larga o fardo do cansaço aos pés de Jesus; no Seu abraço encontras repouso para a alma.',
  },
  {
    book: 'Gênesis',
    chapter: 1,
    verse: 1,
    fallbackText: 'No princípio criou Deus os céus e a terra.',
    reflection: 'Aquele que ordenou o universo do nada tem todo o poder para trazer harmonia e beleza ao teu dia.',
  },
  {
    book: '1 Coríntios',
    chapter: 13,
    verse: 13,
    fallbackText: 'Agora, pois, permanecem a fé, a esperança e o amor, estes três; mas o maior destes é o amor.',
    reflection: 'Tudo o que fizermos hoje só terá valor eterno se for semeado com amor sincero e generoso.',
  },
  {
    book: 'Salmos',
    chapter: 91,
    verse: 1,
    fallbackText: 'Aquele que habita no esconderijo do Altíssimo, à sombra do Onipotente descansará.',
    reflection: 'Habitar na presença de Deus é a maior fortaleza espiritual contra o desânimo e a angústia.',
  },
  {
    book: 'João',
    chapter: 14,
    verse: 6,
    fallbackText: 'Respondeu-lhe Jesus: Eu sou o caminho, a verdade e a vida; ninguém vem ao Pai senão por mim.',
    reflection: 'Em meio a tantas vozes e caminhos confusos, Jesus permanece como a bússola perfeita e imutável.',
  },
];

const DAILY_PRAYERS = [
  'Senhor meu Deus, que a Tua Palavra seja hoje luz para os meus passos e consolo para o meu coração. Concede-me sabedoria para discernir a Tua vontade e mansidão para amar o meu próximo. Amém.',
  'Pai celestial, agradeço-Te pelo fôlego de vida e pela Tua fidelidade que se renova a cada manhã. Firma os meus pensamentos na verdade das Escrituras e guia as minhas decisões hoje. Amém.',
  'Deus eterno, entrega nas Tuas mãos o meu trabalho, a minha família e as preocupações do meu coração. Ensina-me a confiar no Teu cuidado mesmo quando não compreendo o caminho. Amém.',
  'Senhor Jesus, fortalece a minha fé nos momentos de espera e torna o meu coração sensível à Tua voz e às necessidades dos que estão ao meu redor. Amém.',
];

function getDateIndex(dateKey: string, length: number): number {
  let sum = 0;
  for (let i = 0; i < dateKey.length; i++) {
    sum = (sum * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return sum % length;
}

function loadPrayerJournal(): PrayerEntry[] {
  try {
    const raw = localStorage.getItem(PRAYER_JOURNAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export interface VerseCardBackgroundOption {
  id: string;
  name: string;
  category: 'imagem' | 'degrade' | 'solido';
  type: 'image' | 'gradient' | 'solid';
  imageUrl?: string;
  gradient?: {
    from: string;
    to: string;
    mid?: string;
  };
  solidColor?: string;
}

export const VERSE_BACKGROUND_OPTIONS: VerseCardBackgroundOption[] = [
  // 1. Imagens Sacras (100% offline SVG de alta fidelidade)
  {
    id: 'img-mountains',
    name: 'Amanhecer',
    category: 'imagem',
    type: 'image',
    imageUrl: '/backgrounds/dawn-mountains.svg',
  },
  {
    id: 'img-celestial',
    name: 'Céu Noturno',
    category: 'imagem',
    type: 'image',
    imageUrl: '/backgrounds/celestial-night.svg',
  },
  {
    id: 'img-olive',
    name: 'Jardim de Paz',
    category: 'imagem',
    type: 'image',
    imageUrl: '/backgrounds/olive-garden.svg',
  },
  {
    id: 'img-parchment',
    name: 'Pergaminho',
    category: 'imagem',
    type: 'image',
    imageUrl: '/backgrounds/sacred-parchment.svg',
  },

  // 2. Degradês Sagrados
  {
    id: 'grad-sacred',
    name: 'Teal Sagrado',
    category: 'degrade',
    type: 'gradient',
    gradient: { from: '#061715', mid: '#0d2b27', to: '#051412' },
  },
  {
    id: 'grad-aurora',
    name: 'Aurora Âmbar',
    category: 'degrade',
    type: 'gradient',
    gradient: { from: '#1a0904', mid: '#451a03', to: '#1c0a05' },
  },
  {
    id: 'grad-indigo',
    name: 'Noite Sagrada',
    category: 'degrade',
    type: 'gradient',
    gradient: { from: '#020617', mid: '#0f172a', to: '#1e1b4b' },
  },
  {
    id: 'grad-burgundy',
    name: 'Vinho Solene',
    category: 'degrade',
    type: 'gradient',
    gradient: { from: '#15040a', mid: '#370b1b', to: '#120308' },
  },

  // 3. Cores Sólidas
  {
    id: 'solid-obsidian',
    name: 'Obsidiana',
    category: 'solido',
    type: 'solid',
    solidColor: '#081413',
  },
  {
    id: 'solid-slate',
    name: 'Ardósia',
    category: 'solido',
    type: 'solid',
    solidColor: '#0f172a',
  },
  {
    id: 'solid-charcoal',
    name: 'Carvão',
    category: 'solido',
    type: 'solid',
    solidColor: '#18181b',
  },
];

/**
 * Gera um cartão visual sagrado de alta resolução (1080x1350) via HTML Canvas para redes sociais
 */
async function generateVerseCardDataUrl(
  verseText: string,
  reference: string,
  reflection: string,
  bgOption: VerseCardBackgroundOption = VERSE_BACKGROUND_OPTIONS[0]
): Promise<string> {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  const width = 1080;
  const height = 1350;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Renderização do Fundo Escolhido
  if (bgOption.type === 'solid' && bgOption.solidColor) {
    ctx.fillStyle = bgOption.solidColor;
    ctx.fillRect(0, 0, width, height);
  } else if (bgOption.type === 'gradient' && bgOption.gradient) {
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, bgOption.gradient.from);
    if (bgOption.gradient.mid) bgGrad.addColorStop(0.5, bgOption.gradient.mid);
    bgGrad.addColorStop(1, bgOption.gradient.to);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  } else if (bgOption.type === 'image' && bgOption.imageUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = bgOption.imageUrl;
      await new Promise<void>((resolve, reject) => {
        if (img.complete) {
          resolve();
        } else {
          img.onload = () => resolve();
          img.onerror = () => reject();
        }
      });
      ctx.drawImage(img, 0, 0, width, height);
      // Camada espelhada/escura para legibilidade primorosa do texto
      const overlayGrad = ctx.createLinearGradient(0, 0, 0, height);
      overlayGrad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
      overlayGrad.addColorStop(0.4, 'rgba(0, 0, 0, 0.65)');
      overlayGrad.addColorStop(1, 'rgba(0, 0, 0, 0.92)');
      ctx.fillStyle = overlayGrad;
      ctx.fillRect(0, 0, width, height);
    } catch {
      // Fallback gracioso para degradê sagrado
      const fallbackGrad = ctx.createLinearGradient(0, 0, width, height);
      fallbackGrad.addColorStop(0, '#061715');
      fallbackGrad.addColorStop(0.5, '#0d2b27');
      fallbackGrad.addColorStop(1, '#051412');
      ctx.fillStyle = fallbackGrad;
      ctx.fillRect(0, 0, width, height);
    }
  }

  // Brilho dourado radial no centro
  const radialGlow = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, 560);
  radialGlow.addColorStop(0, 'rgba(212, 175, 55, 0.14)');
  radialGlow.addColorStop(0.7, 'rgba(45, 122, 124, 0.08)');
  radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = radialGlow;
  ctx.fillRect(0, 0, width, height);

  // Moldura ornamental dourada
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 3;
  ctx.strokeRect(52, 52, width - 104, height - 104);

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(64, 64, width - 128, height - 128);

  // Cantoneiras douradas
  const drawCorner = (x: number, y: number) => {
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
  };
  drawCorner(52, 52);
  drawCorner(width - 52, 52);
  drawCorner(52, height - 52);
  drawCorner(width - 52, height - 52);

  // Cabeçalho canónico
  ctx.fillStyle = '#d4af37';
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✝  BIBLIA  ·  PALAVRA DO DIA', width / 2, 150);

  // Divisória decorativa
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 140, 180);
  ctx.lineTo(width / 2 + 140, 180);
  ctx.stroke();

  // Aspas de destaque
  ctx.fillStyle = 'rgba(212, 175, 55, 0.25)';
  ctx.font = 'italic 110px Georgia, "Times New Roman", serif';
  ctx.fillText('“', width / 2, 270);

  // Helper de quebra de linha
  const wrapText = (
    text: string,
    maxWidth: number,
    fontSize: number,
    fontFamily: string,
    isBold = false
  ): string[] => {
    ctx.font = `${isBold ? 'bold ' : ''}${fontSize}px ${fontFamily}`;
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // Texto do Versículo
  const verseFontSize = verseText.length > 150 ? 42 : verseText.length > 90 ? 48 : 54;
  const verseLines = wrapText(verseText, width - 240, verseFontSize, 'Georgia, "Times New Roman", serif');
  const lineHeight = verseFontSize * 1.48;
  const totalVerseHeight = verseLines.length * lineHeight;

  let startY = 380 + Math.max(0, (260 - totalVerseHeight) / 2);
  ctx.fillStyle = '#ffffff';
  ctx.font = `italic ${verseFontSize}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = 'center';

  for (const line of verseLines) {
    ctx.fillText(line, width / 2, startY);
    startY += lineHeight;
  }

  // 1. Referência canónica (LOGO APÓS O VERSÍCULO)
  startY += 40;
  ctx.fillStyle = '#e5c158';
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(reference, width / 2, startY);

  // 2. Reflexão devocional (LOGO APÓS A REFERÊNCIA)
  if (reflection) {
    startY += 65;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(width / 2 - 90, startY - 30);
    ctx.lineTo(width / 2 + 90, startY - 30);
    ctx.stroke();

    const reflLines = wrapText(`"${reflection}"`, width - 300, 28, 'Georgia, serif');
    ctx.fillStyle = '#a7dcd2';
    ctx.font = 'italic 28px Georgia, serif';
    for (const rLine of reflLines) {
      ctx.fillText(rLine, width / 2, startY);
      startY += 40;
    }
  }

  // Rodapé do Card
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('LÂMPADA PARA OS TEUS PÉS  ·  APP BIBLIA', width / 2, height - 120);

  return canvas.toDataURL('image/png');
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate, showToast }) => {
  const { profile, currentPlan, openPricingModal } = useSubscription();
  const { themeMode, setThemeMode } = useTheme();
  const { loadTrack, play } = useAudio();
  const { user } = useAuth();
  const lastRead = getLastRead();
  const tracks = getUserProgressTracks();
  const nextPhase = getCurrentJourneyPhase();
  const xpTotal = 250;
  const xpCurrent = tracks.lifetimeXp % xpTotal;

  // Extração inteligente do Nome e Sobrenome reais (Google OAuth / Profile / Metadata / Identities)
  const displayName = useMemo(() => getEffectiveDisplayName(user, profile), [user, profile?.display_name]);

  const todayKey = getMaputoDateKey();

  const todayVerse = useMemo(
    () => DAILY_VERSES[getDateIndex(todayKey, DAILY_VERSES.length)],
    [todayKey]
  );
  const todayPrayer = useMemo(
    () => DAILY_PRAYERS[getDateIndex(`${todayKey}:prayer`, DAILY_PRAYERS.length)],
    [todayKey]
  );

  const [todayVerseText, setTodayVerseText] = useState(todayVerse.fallbackText);
  const [passageVerseText, setPassageVerseText] = useState('');
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showNavDrawer, setShowNavDrawer] = useState(false);
  const [showPrayerModal, setShowPrayerModal] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedBg, setSelectedBg] = useState<VerseCardBackgroundOption>(VERSE_BACKGROUND_OPTIONS[0]);
  const [shareImageDataUrl, setShareImageDataUrl] = useState('');
  const [showAppTutorial, setShowAppTutorial] = useState(false);

  // Inicializa o Tutorial do App na primeira visita
  useEffect(() => {
    if (!isTutorialCompleted('app', user?.id)) {
      const timer = setTimeout(() => {
        setShowAppTutorial(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [user?.id]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [prayerInput, setPrayerInput] = useState('');
  const [prayerJournal, setPrayerJournal] = useState<PrayerEntry[]>(loadPrayerJournal);
  const [aiQuestionInput, setAiQuestionInput] = useState('');
  const [xpWidth, setXpWidth] = useState(0);
  const themeRef = useRef<HTMLDivElement>(null);

  const weekPractice = useMemo(() => getRecentPracticeDates(7), [todayKey]);
  const isTodayCompleted = useMemo(() => weekPractice.some((d) => d.isToday && d.active), [weekPractice]);

  // Saudação contextual temporal
  const temporalGreeting = useMemo(() => {
    const hour = new Date().getHours();
    const cleanName = displayName ? `, ${displayName}` : '';
    if (hour >= 5 && hour < 12) {
      return {
        greeting: `Bom dia${cleanName} ☀️`,
        phrase: 'As misericórdias do Senhor renovam-se nesta manhã.',
      };
    }
    if (hour >= 12 && hour < 18) {
      return {
        greeting: `Boa tarde${cleanName} 🌿`,
        phrase: 'Uma pausa de paz e reverência para meditar na Palavra.',
      };
    }
    return {
      greeting: `Boa noite${cleanName} 🌙`,
      phrase: 'Encontre descanso e consolo na Escritura sagrada.',
    };
  }, [displayName]);

  // Carrega o verso exato da última leitura
  useEffect(() => {
    let active = true;
    loadBibleChapter(lastRead.book, lastRead.chapter, DEFAULT_BIBLE_TRANSLATION_ID)
      .then((passage) => {
        const verse = passage.verses.find((item) => item.num === lastRead.verse) || passage.verses[0];
        if (active) setPassageVerseText(verse?.text || '');
      })
      .catch(() => {
        if (active) setPassageVerseText('');
      });
    return () => {
      active = false;
    };
  }, [lastRead.book, lastRead.chapter, lastRead.verse]);

  // Carrega o texto canónico BLIVRE do Versículo do Dia
  useEffect(() => {
    let active = true;
    setTodayVerseText(todayVerse.fallbackText);
    loadBibleChapter(todayVerse.book, todayVerse.chapter, DEFAULT_BIBLE_TRANSLATION_ID)
      .then((passage) => {
        const found = passage.verses.find((v) => v.num === todayVerse.verse);
        if (active && found?.text) {
          setTodayVerseText(found.text);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [todayVerse]);

  // Animate XP bar on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setXpWidth((xpCurrent / xpTotal) * 100);
    }, 300);
    return () => clearTimeout(timer);
  }, [xpCurrent]);

  // Close theme menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setShowThemeMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleShareVerse = async () => {
    const refLabel = `${todayVerse.book} ${todayVerse.chapter}:${todayVerse.verse}`;
    const text = `"${todayVerseText}" — ${refLabel} (BLIVRE · BiblIA)\n\n"${todayVerse.reflection}"`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Versículo do Dia — ${refLabel}`, text });
        return;
      } catch {
        // segue para clipboard
      }
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      showToast('Versículo do dia copiado!', 'check_circle');
    } else {
      showToast(refLabel, 'share');
    }
  };

  const handleSelectBackground = async (opt: VerseCardBackgroundOption) => {
    setSelectedBg(opt);
    setIsGeneratingImage(true);
    try {
      const refLabel = `${todayVerse.book} ${todayVerse.chapter}:${todayVerse.verse} · BLIVRE`;
      const dataUrl = await generateVerseCardDataUrl(todayVerseText, refLabel, todayVerse.reflection, opt);
      setShareImageDataUrl(dataUrl);
    } catch {
      showToast('Erro ao aplicar estilo de fundo.', 'warning');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleOpenShareModal = async () => {
    setIsGeneratingImage(true);
    setShowShareModal(true);
    try {
      const refLabel = `${todayVerse.book} ${todayVerse.chapter}:${todayVerse.verse} · BLIVRE`;
      const dataUrl = await generateVerseCardDataUrl(todayVerseText, refLabel, todayVerse.reflection, selectedBg);
      setShareImageDataUrl(dataUrl);
    } catch {
      showToast('Não foi possível gerar imagem, copiando texto...', 'warning');
      void handleShareVerse();
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleShareCardImage = async () => {
    if (!shareImageDataUrl) return;
    try {
      const res = await fetch(shareImageDataUrl);
      const blob = await res.blob();
      const file = new File(
        [blob],
        `versiculo-${todayVerse.book.toLowerCase()}-${todayVerse.chapter}-${todayVerse.verse}.png`,
        { type: 'image/png' }
      );
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Versículo do Dia — ${todayVerse.book} ${todayVerse.chapter}:${todayVerse.verse}`,
          text: `"${todayVerseText}" — ${todayVerse.book} ${todayVerse.chapter}:${todayVerse.verse} (BiblIA)\n\n"${todayVerse.reflection}"`,
        });
        showToast('Partilhado com sucesso!', 'share');
        return;
      }
    } catch {
      // Fallback para download direto
    }
    handleDownloadCardImage();
  };

  const handleDownloadCardImage = () => {
    if (!shareImageDataUrl) return;
    const a = document.createElement('a');
    a.href = shareImageDataUrl;
    a.download = `versiculo-${todayVerse.book.toLowerCase()}-${todayVerse.chapter}-${todayVerse.verse}.png`;
    a.click();
    showToast('Imagem guardada! Pronta para Status ou Stories.', 'download');
  };

  const handleCopyTextOnly = async () => {
    const refLabel = `${todayVerse.book} ${todayVerse.chapter}:${todayVerse.verse}`;
    const text = `"${todayVerseText}" — ${refLabel} (BLIVRE · BiblIA)\n\nReflexão: "${todayVerse.reflection}"`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      showToast('Texto bíblico copiado!', 'check_circle');
    }
  };

  const handleOpenDailyVerseInBible = () => {
    queueBibleReference(`${todayVerse.book} ${todayVerse.chapter}:${todayVerse.verse}`);
    onNavigate('screen-biblia');
  };

  const handlePlayDailyVerseAudio = async () => {
    const loaded = await loadTrack(
      todayVerse.book,
      todayVerse.chapter,
      `${todayVerse.book} ${todayVerse.chapter}`,
      DEFAULT_BIBLE_TRANSLATION_ID,
      todayVerse.verse
    );
    if (!loaded) {
      showToast('Não foi possível carregar o áudio desta passagem.', 'warning');
      return;
    }
    play();
    showToast(`A ouvir ${todayVerse.book} ${todayVerse.chapter}:${todayVerse.verse}`, 'headphones');
    onNavigate('screen-audio');
  };

  const handleQuickPlayAudio = async () => {
    const loaded = await loadTrack(
      lastRead.book,
      lastRead.chapter,
      `${lastRead.book} ${lastRead.chapter}`,
      DEFAULT_BIBLE_TRANSLATION_ID,
      lastRead.verse
    );
    if (!loaded) {
      showToast('Não foi possível abrir esta passagem.', 'warning');
      return;
    }
    play();
    showToast(`A ouvir ${lastRead.book} ${lastRead.chapter}:${lastRead.verse} · BL`, 'headphones');
    onNavigate('screen-audio');
  };

  const handleSavePrayer = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = prayerInput.trim();
    if (!clean) {
      setShowPrayerModal(false);
      return;
    }
    const next: PrayerEntry[] = [
      { id: `pr_${Date.now()}`, text: clean, createdAt: new Date().toISOString() },
      ...prayerJournal,
    ].slice(0, 20);
    setPrayerJournal(next);
    try {
      localStorage.setItem(PRAYER_JOURNAL_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    setPrayerInput('');
    showToast('Intenção guardada neste dispositivo.', 'favorite');
  };

  const handleDeletePrayer = (id: string) => {
    const next = prayerJournal.filter((p) => p.id !== id);
    setPrayerJournal(next);
    try {
      localStorage.setItem(PRAYER_JOURNAL_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleAskAIPrompt = (prompt: string) => {
    sessionStorage.setItem('biblia_ai_pending_prompt', prompt);
    onNavigate('screen-ai');
  };

  const handleAskAISubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = aiQuestionInput.trim();
    if (!clean) return;
    handleAskAIPrompt(clean);
    setAiQuestionInput('');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto no-scrollbar bg-bg-canvas dark:bg-dark-canvas text-slate-900 dark:text-slate-100 font-display transition-colors duration-300 pb-36">
      {/* Header Section */}
      <header className="flex items-center justify-between px-5 pt-4 pb-3 sticky top-0 z-20 bg-bg-canvas/95 dark:bg-dark-canvas/95 backdrop-blur-md border-b border-slate-200/60 dark:border-dark-border transition-colors">
        <div className="flex items-center gap-3 animate-fade-in">
          <button
            onClick={() => onNavigate('screen-perfil')}
            className="group relative transition-transform active:scale-95"
            title="Ver meu perfil e avatar"
          >
            <UserAvatar
              avatarUrl={profile.avatar_url || user?.user_metadata?.picture || user?.user_metadata?.avatar_url}
              displayName={displayName}
              size="md"
            />
          </button>
          <div className="flex flex-col gap-0.5 text-left">
            <h1 className="text-slate-900 dark:text-white text-lg font-extrabold leading-tight tracking-tight">
              {temporalGreeting.greeting}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">
              {temporalGreeting.phrase}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 animate-fade-in">
          {/* 1. Seletor de Temas (à esquerda) */}
          <div className="relative" ref={themeRef}>
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="flex items-center justify-center size-9 rounded-full bg-white dark:bg-dark-card-base border border-slate-200 dark:border-dark-border shadow-sm text-slate-700 dark:text-slate-200 hover:border-sacred-brand transition-all active:scale-95"
              title={`Tema: ${themeMode}`}
            >
              {themeMode === 'claro' && (
                <span className="material-symbols-outlined text-[18px] text-amber-500">light_mode</span>
              )}
              {themeMode === 'escuro' && (
                <span className="material-symbols-outlined text-[18px] text-sacred-neon">dark_mode</span>
              )}
              {themeMode === 'sistema' && (
                <span className="material-symbols-outlined text-[18px] text-slate-400">devices</span>
              )}
            </button>

            {showThemeMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-card-base rounded-2xl shadow-elevated border border-slate-200 dark:border-dark-border py-1.5 z-50 animate-scale-in text-xs overflow-hidden text-left">
                <div className="px-3 py-1 font-bold text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-100 dark:border-slate-800 mb-1">
                  Aparência
                </div>
                {([
                  { key: 'claro', icon: 'light_mode', label: 'Claro', color: 'text-amber-500' },
                  { key: 'escuro', icon: 'dark_mode', label: 'Escuro', color: 'text-sacred-neon' },
                  { key: 'sistema', icon: 'devices', label: 'Sistema', color: 'text-slate-400' },
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      setThemeMode(opt.key);
                      setShowThemeMenu(false);
                      showToast(`Tema ${opt.label} ativado!`, opt.icon);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                      themeMode === opt.key
                        ? 'text-sacred-brand dark:text-sacred-neon font-bold bg-sacred-light/40 dark:bg-sacred-neon/10'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-base ${opt.color}`}>{opt.icon}</span>
                    <span>{opt.label}</span>
                    {themeMode === opt.key && (
                      <span className="material-symbols-outlined text-sm ml-auto text-sacred-brand dark:text-sacred-neon">
                        check
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Menu Hambúrguer (à direita) */}
          <button
            onClick={() => setShowNavDrawer(true)}
            className="flex items-center justify-center size-9 rounded-full bg-white dark:bg-dark-card-base border border-slate-200 dark:border-dark-border shadow-sm text-slate-700 dark:text-slate-200 hover:border-sacred-brand hover:text-sacred-brand dark:hover:text-sacred-neon transition-all active:scale-95"
            title="Menu Principal"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col gap-4 px-4 pt-3 text-left">
        {/* 1. Spiritual Progress Hero Card */}
        <div
          data-tutorial="user-progress-bar"
          className="w-full rounded-2xl bg-white dark:bg-dark-card-base p-5 shadow-soft border border-slate-200/80 dark:border-dark-border relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-28 h-28 bg-gold-radiant/5 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400 dark:text-slate-500">
                  Nível Atual
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="material-symbols-outlined text-sacred-brand dark:text-sacred-neon text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                    verified
                  </span>
                  <span className="text-base font-extrabold text-sacred-brand dark:text-sacred-neon">
                    Nível {tracks.walkLevel}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowStreakModal(true)}
                className="badge-streak dark:badge-streak-dark shadow-sm hover:scale-105 active:scale-95 transition-transform"
                title="Ver Ofensiva Diária e Dias Consecutivos"
              >
                <span className="material-symbols-outlined text-base animate-flame-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>
                  local_fire_department
                </span>
                <span className="text-xs font-black">{tracks.streakDays}</span>
                <span className="text-[10px] opacity-80">{tracks.streakDays === 1 ? 'dia' : 'dias'}</span>
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Progresso</span>
                <span className="font-bold text-gold-talent dark:text-gold-radiant tabular-nums">
                  {xpCurrent}<span className="text-slate-400 font-normal">/{xpTotal} XP</span>
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold-talent to-gold-radiant transition-all duration-1000 ease-out shadow-glow"
                  style={{ width: `${xpWidth}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 text-right">
                {xpTotal - xpCurrent} XP para o próximo nível
              </p>
            </div>
          </div>
        </div>

        {/* 2. Primary CTA — Continuar Jornada (dinâmico) */}
        <button
          onClick={() => onNavigate('screen-game-dashboard')}
          className="w-full flex items-center justify-between bg-sacred-brand dark:bg-sacred-neon text-white dark:text-slate-950 p-1.5 pr-3.5 rounded-2xl shadow-duo-primary dark:shadow-[0_4px_0_#0f766e] active:translate-y-1 active:shadow-none hover:brightness-105 transition-all group overflow-hidden h-[70px]"
        >
          <div className="flex items-center justify-center bg-white/20 dark:bg-slate-950/15 h-full aspect-square rounded-xl ml-1">
            <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">
              map
            </span>
          </div>
          <div className="flex flex-col items-start flex-1 ml-3.5 min-w-0">
            <span className="text-base font-extrabold leading-tight tracking-tight">Continuar Jornada</span>
            <span className="text-xs opacity-85 font-medium mt-0.5 truncate w-full text-left">
              Próximo: Fase {nextPhase.phaseNumber} · {nextPhase.title}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-950 text-sacred-brand dark:text-sacred-neon rounded-full p-2 group-hover:translate-x-1 transition-transform shrink-0">
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </div>
        </button>

        {/* 2b. Harmonized Secondary Strip — Última Leitura Livre */}
        <div className="w-full rounded-2xl bg-white dark:bg-dark-card-base p-3.5 border border-slate-200/80 dark:border-dark-border shadow-soft flex items-center justify-between gap-3 text-left">
          <button
            onClick={() => onNavigate('screen-biblia')}
            className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-85 transition-opacity text-left"
          >
            <div className="size-10 rounded-xl bg-sacred-brand/10 dark:bg-sacred-neon/15 text-sacred-brand dark:text-sacred-neon flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">menu_book</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Última Leitura</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">BLIVRE</span>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {lastRead.book} {lastRead.chapter}:{lastRead.verse}
                {passageVerseText ? ` — ${passageVerseText}` : ''}
              </p>
            </div>
          </button>
          <button
            onClick={() => void handleQuickPlayAudio()}
            className="size-9 rounded-xl bg-slate-100 hover:bg-sacred-brand/10 dark:bg-slate-800 dark:hover:bg-sacred-neon/15 text-slate-600 hover:text-sacred-brand dark:text-slate-300 dark:hover:text-sacred-neon flex items-center justify-center shrink-0 transition-colors"
            title={`Ouvir ${lastRead.book} ${lastRead.chapter}`}
          >
            <span className="material-symbols-outlined text-lg">headphones</span>
          </button>
        </div>

        {/* 3. Banner da Palavra do Dia com Imagem Sacra e Efeito Degradê Espelhado */}
        <div
          data-tutorial="verse-of-the-day"
          className="relative w-full rounded-2xl overflow-hidden shadow-sacred-card min-h-[270px] group border border-slate-700/40"
        >
          {/* Imagem de Fundo com zoom suave no hover */}
          <img
            src="/backgrounds/dawn-mountains.svg"
            alt="Palavra do Dia Fundo"
            className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-1000 group-hover:scale-105 pointer-events-none"
          />

          {/* Efeito espelho/degradê: gradiente duplo com desfoque subtil para máxima legibilidade do texto */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/35 backdrop-blur-[0.5px]" />
          <div className="absolute top-0 right-0 w-52 h-52 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col justify-between min-h-[270px] p-5 text-left">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/25 text-white text-[10px] font-extrabold tracking-widest uppercase mb-3 shadow-sm">
                <span className="material-symbols-outlined text-xs text-amber-300">bookmark</span>
                Palavra do Dia
              </span>
              <blockquote className="text-white text-lg sm:text-xl font-serif italic leading-snug mb-2 drop-shadow-md">
                "{todayVerseText}"
              </blockquote>
              <p className="text-amber-300 text-xs font-bold border-l-2 border-amber-400 pl-2">
                {todayVerse.book} {todayVerse.chapter}:{todayVerse.verse} • BLIVRE
              </p>

              {/* Aplicação Prática / Reflexão Devocional Curta */}
              <div className="mt-3 pt-2.5 border-t border-white/15 flex items-start gap-2 text-white/90">
                <span className="material-symbols-outlined text-amber-300 text-sm mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                  lightbulb
                </span>
                <p className="text-[11px] sm:text-xs leading-relaxed italic text-amber-100 font-medium drop-shadow-sm">
                  {todayVerse.reflection}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleOpenDailyVerseInBible}
                className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 border border-white/15 active:scale-95 shadow-sm"
              >
                <span className="material-symbols-outlined text-base">menu_book</span>
                <span>Ler Capítulo</span>
              </button>
              <button
                onClick={() => void handlePlayDailyVerseAudio()}
                className="bg-sacred-brand hover:bg-sacred-dark active:scale-95 text-white py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md font-bold text-xs"
                title="Ouvir Versículo do Dia"
              >
                <span className="material-symbols-outlined text-base">headphones</span>
                <span>Ouvir</span>
              </button>
              <button
                onClick={() => void handleOpenShareModal()}
                disabled={isGeneratingImage}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white p-2.5 rounded-xl transition-all aspect-square flex items-center justify-center active:scale-95 disabled:opacity-50 border border-white/15 shadow-sm"
                title="Personalizar e Partilhar"
              >
                <span className="material-symbols-outlined text-base">
                  {isGeneratingImage ? 'hourglass_top' : 'palette'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 4. Orientador Espiritual com IA (Card de Grande Relevância e Ação Direta) */}
        <div className="w-full rounded-2xl bg-white dark:bg-dark-card-base p-4 border border-slate-200/80 dark:border-purple-500/30 shadow-soft text-left relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <SacredOrb state="idle" size={36} />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  Orientador Espiritual
                  <span className="text-[9px] bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400 font-bold px-1.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-500/20 uppercase tracking-wider">IA</span>
                </h3>
              </div>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Bíblico & Pastoral</span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
            Tire dúvidas, peça discernimento para situações difíceis ou aprofunde a passagem de hoje com a nossa IA bíblica.
          </p>

          {/* Quick Input Bar */}
          <form onSubmit={handleAskAISubmit} className="relative flex items-center mb-2.5">
            <input
              type="text"
              value={aiQuestionInput}
              onChange={(e) => setAiQuestionInput(e.target.value)}
              placeholder="Escreva uma pergunta ou pedido de reflexão..."
              className="w-full pl-3.5 pr-11 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-sacred-brand dark:focus:border-purple-400 transition-colors shadow-inner"
            />
            <button
              type="submit"
              disabled={!aiQuestionInput.trim()}
              className="absolute right-1.5 size-7 rounded-lg bg-sacred-brand dark:bg-gradient-to-tr dark:from-purple-600 dark:to-indigo-600 text-white flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none hover:brightness-110 active:scale-95 transition-all shadow-sm"
              title="Perguntar ao Orientador"
            >
              <span className="material-symbols-outlined text-base">send</span>
            </button>
          </form>

          {/* Suggestion Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            <button
              type="button"
              onClick={() => handleAskAIPrompt(`Podes explicar e contextualizar o versículo de hoje (${todayVerse.book} ${todayVerse.chapter}:${todayVerse.verse}): "${todayVerseText}"? O que ele ensina para a minha vida?`)}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sacred-brand dark:hover:border-purple-500 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-200/60 dark:hover:bg-purple-950/40 active:scale-95"
            >
              <span className="material-symbols-outlined text-xs text-sacred-brand dark:text-purple-400">lightbulb</span>
              <span>Explicar versículo de hoje</span>
            </button>
            <button
              type="button"
              onClick={() => handleAskAIPrompt('O que a Bíblia ensina para vencer a ansiedade e encontrar paz interior no meio das dificuldades?')}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sacred-brand dark:hover:border-purple-500 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-200/60 dark:hover:bg-purple-950/40 active:scale-95"
            >
              <span className="material-symbols-outlined text-xs text-sacred-brand dark:text-purple-400">self_improvement</span>
              <span>Vencer ansiedade</span>
            </button>
            <button
              type="button"
              onClick={() => handleAskAIPrompt('O que a Bíblia ensina sobre o perdão e como perdoar de coração alguém que nos magoou?')}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sacred-brand dark:hover:border-purple-500 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-200/60 dark:hover:bg-purple-950/40 active:scale-95"
            >
              <span className="material-symbols-outlined text-xs text-sacred-brand dark:text-purple-400">volunteer_activism</span>
              <span>Perdão bíblico</span>
            </button>
          </div>
        </div>



        {/* 6. Membership Intelligent Status / Upgrade Banner */}
        <div className="rounded-2xl p-4 bg-gradient-to-r from-sacred-brand/10 via-sacred-brand/5 to-gold-talent/10 border border-sacred-brand/20 dark:border-sacred-neon/30 flex items-center justify-between gap-3 overflow-hidden relative">
          <div className="flex items-center gap-3 relative z-10">
            <div className="size-10 rounded-xl bg-sacred-brand text-white flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-xl">workspace_premium</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold uppercase tracking-widest text-sacred-brand dark:text-sacred-neon">
                  Plano {currentPlan}
                </span>
                {currentPlan === 'FREE' ? (
                  <span className="text-[9px] bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-500/25 uppercase tracking-wide">
                    Gratuito
                  </span>
                ) : (
                  <span className="text-[9px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/25 uppercase tracking-wide">
                    Membro Ativo
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-tight">
                {currentPlan === 'FREE'
                  ? 'Apoie o projeto e desbloqueie o Orientador Espiritual sem limites e áudio neural HD.'
                  : 'Acesso total ativo ao Orientador Espiritual IA, áudio HD e jornadas.'}
              </p>
            </div>
          </div>
          <button
            onClick={openPricingModal}
            className="relative z-10 shrink-0 bg-sacred-brand dark:bg-sacred-neon hover:brightness-110 text-white dark:text-slate-950 text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-95"
          >
            {currentPlan === 'FREE' ? 'Melhorar' : 'Gerir'}
          </button>
        </div>
      </main>

      {/* Prayer & Devotional Journal Modal */}
      {showPrayerModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPrayerModal(false);
          }}
        >
          <div className="bg-white dark:bg-dark-card-base border border-slate-200 dark:border-dark-border rounded-3xl p-5 max-w-sm w-full shadow-2xl relative text-left animate-slide-up max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    volunteer_activism
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Oração de Hoje</h3>
                  <p className="text-[11px] text-slate-400">Comunhão e diário espiritual</p>
                </div>
              </div>
              <button
                onClick={() => setShowPrayerModal(false)}
                className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-serif italic border-l-2 border-sacred-brand pl-3">
              "{todayPrayer}"
            </p>

            <form onSubmit={handleSavePrayer} className="space-y-2.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                Escrever intenção ou gratidão pessoal (guardado no dispositivo)
              </label>
              <textarea
                rows={2}
                maxLength={400}
                value={prayerInput}
                onChange={(e) => setPrayerInput(e.target.value)}
                placeholder="Ex: Senhor, dá sabedoria à minha família esta semana..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:border-sacred-brand resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 btn-duo-primary dark:btn-duo-primary-dark text-xs py-2.5 font-bold"
                >
                  {prayerInput.trim() ? 'Guardar no Diário' : 'Amém'}
                </button>
              </div>
            </form>

            {prayerJournal.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Registos recentes ({prayerJournal.length})
                </p>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {prayerJournal.slice(0, 5).map((entry) => (
                    <div
                      key={entry.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 flex items-start justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="text-slate-700 dark:text-slate-200 leading-snug">{entry.text}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(entry.createdAt).toLocaleDateString('pt')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeletePrayer(entry.id)}
                        className="text-slate-400 hover:text-rose-500 shrink-0"
                        title="Remover"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Modal do Cartão Visual do Versículo com Galeria de Fundos */}
      {showShareModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowShareModal(false);
          }}
        >
          <div className="bg-white dark:bg-dark-card-base border border-slate-200 dark:border-dark-border rounded-3xl p-5 max-w-sm w-full shadow-2xl relative text-left animate-slide-up max-h-[92vh] overflow-y-auto space-y-3.5 no-scrollbar">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-sacred-brand/10 dark:bg-sacred-neon/15 text-sacred-brand dark:text-sacred-neon flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">palette</span>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                    Partilhar Palavra do Dia
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Personalize o fundo e inspire quem você ama
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {/* Pré-visualização da imagem gerada */}
            <div className="w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md aspect-[4/5] bg-black/60 flex items-center justify-center relative">
              {shareImageDataUrl ? (
                <img
                  src={shareImageDataUrl}
                  alt={`Palavra do Dia — ${todayVerse.book} ${todayVerse.chapter}:${todayVerse.verse}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <span className="material-symbols-outlined text-3xl animate-spin">refresh</span>
                  <span className="text-xs">A criar cartão...</span>
                </div>
              )}
              {isGeneratingImage && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center text-white text-xs gap-2">
                  <span className="material-symbols-outlined text-xl animate-spin">refresh</span>
                  <span>A atualizar estilo...</span>
                </div>
              )}
            </div>

            {/* Galeria de Personalização de Fundos (Imagens, Degradês e Sólidos) */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Galeria de Fundos
                </span>
                <span className="text-[10px] font-bold text-sacred-brand dark:text-sacred-neon">
                  {selectedBg.name}
                </span>
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {VERSE_BACKGROUND_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => void handleSelectBackground(opt)}
                    className={`group shrink-0 flex flex-col items-center gap-1 p-1 rounded-xl transition-all ${
                      selectedBg.id === opt.id
                        ? 'ring-2 ring-sacred-brand dark:ring-sacred-neon scale-105 bg-sacred-brand/5 dark:bg-sacred-neon/10'
                        : 'opacity-70 hover:opacity-100 hover:scale-102'
                    }`}
                    title={opt.name}
                  >
                    <div
                      className="size-11 rounded-lg border border-slate-300 dark:border-slate-700 shadow-sm overflow-hidden bg-cover bg-center flex items-center justify-center relative"
                      style={{
                        background:
                          opt.type === 'solid'
                            ? opt.solidColor
                            : opt.type === 'gradient'
                            ? `linear-gradient(135deg, ${opt.gradient?.from}, ${opt.gradient?.to})`
                            : `url(${opt.imageUrl}) center/cover no-repeat`,
                      }}
                    >
                      {selectedBg.id === opt.id && (
                        <span
                          className="material-symbols-outlined text-white text-base drop-shadow-md"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          check_circle
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 max-w-[54px] truncate">
                      {opt.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ações de partilha e download */}
            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleShareCardImage}
                className="w-full btn-duo-primary dark:btn-duo-primary-dark text-xs py-3 font-extrabold flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">share</span>
                <span>Partilhar Imagem</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDownloadCardImage}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  <span>Baixar Imagem</span>
                </button>
                <button
                  onClick={handleCopyTextOnly}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                  <span>Copiar Texto</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal Interativo de Ofensiva / Streak (🔥) */}
      {showStreakModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowStreakModal(false);
          }}
        >
          <div className="bg-white dark:bg-dark-card-base border border-slate-200 dark:border-dark-border rounded-3xl p-5 max-w-sm w-full shadow-2xl relative text-center animate-slide-up space-y-4">
            <div className="flex justify-end -mb-2">
              <button
                onClick={() => setShowStreakModal(false)}
                className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="flex flex-col items-center">
              <div className="size-20 rounded-full bg-amber-500/15 text-amber-500 dark:text-amber-400 flex items-center justify-center mb-2 shadow-inner">
                <span className="material-symbols-outlined text-4xl animate-flame-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>
                  local_fire_department
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {tracks.streakDays} {tracks.streakDays === 1 ? 'Dia de Ofensiva' : 'Dias de Ofensiva'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[260px]">
                {isTodayCompleted
                  ? 'A sua chama sagrada já está protegida hoje! Parabéns pela disciplina espiritual.'
                  : 'Pratique um desafio ou leia um capítulo hoje para manter a sua chama acesa.'}
              </p>
            </div>

            {/* Calendário da semana atual (7 dias reais) */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  Histórico dos Últimos 7 Dias
                </span>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  {tracks.streakDays > 0 ? `${tracks.streakDays}x consecutivo` : 'Inicie hoje'}
                </span>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {weekPractice.map((day) => (
                  <div key={day.dateKey} className="flex flex-col items-center gap-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                      {day.label.split(' ')[0]}
                    </span>
                    <div
                      className={`size-8 rounded-full flex items-center justify-center transition-all ${
                        day.active
                          ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-sm'
                          : day.isToday
                          ? 'border-2 border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                          : 'bg-slate-200/60 dark:bg-slate-700/60 text-slate-400'
                      }`}
                      title={`${day.dateKey}: ${day.active ? 'Cumprido' : 'Pendente'}`}
                    >
                      <span className="material-symbols-outlined text-sm" style={day.active ? { fontVariationSettings: "'FILL' 1" } : {}}>
                        {day.active ? 'local_fire_department' : day.isToday ? 'hourglass_top' : 'remove'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dica do Protetor de Ofensiva */}
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left">
              <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-lg shrink-0">
                shield
              </span>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                <strong>Dica:</strong> A ofensiva zera à meia-noite se não houver leitura ou lição concluída no dia.
              </p>
            </div>

            {/* Ação Primária */}
            <button
              onClick={() => {
                setShowStreakModal(false);
                onNavigate('screen-desafio-diario');
              }}
              className="w-full btn-duo-primary dark:btn-duo-primary-dark text-xs py-3 font-extrabold flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">play_arrow</span>
              <span>{isTodayCompleted ? 'Praticar Mais Lições' : 'Cumprir Desafio Diário Agora'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Menu Hambúrguer Lateral (Drawer Canónico de Navegação) */}
      {showNavDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setShowNavDrawer(false)}
          />

          {/* Drawer Sheet */}
          <div className="relative w-[85%] max-w-sm h-full bg-white dark:bg-[#0c1816] border-l border-slate-200 dark:border-dark-border shadow-2xl flex flex-col justify-between overflow-y-auto no-scrollbar z-10 animate-slide-left text-left">
            <div>
              {/* Header do Drawer: Perfil do Usuário */}
              <div className="p-5 border-b border-slate-100 dark:border-dark-border bg-slate-50/70 dark:bg-[#081413]/70">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sacred-brand dark:text-sacred-neon text-lg">
                      auto_stories
                    </span>
                    <span className="text-xs font-black tracking-wider text-slate-800 dark:text-slate-200 uppercase">
                      Menu BiblIA
                    </span>
                  </div>
                  <button
                    onClick={() => setShowNavDrawer(false)}
                    className="size-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
                    title="Fechar menu"
                  >
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <UserAvatar
                    avatarUrl={profile.avatar_url || user?.user_metadata?.picture || user?.user_metadata?.avatar_url}
                    displayName={displayName}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                        {displayName}
                      </h3>
                      <span className="shrink-0 text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full bg-sacred-brand/10 dark:bg-sacred-neon/15 text-sacred-brand dark:text-sacred-neon border border-sacred-brand/20">
                        {currentPlan}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {user?.email || 'Visitante em Comunhão'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Conteúdo de Navegação em Blocos Estruturados */}
              <div className="p-4 space-y-5">
                {/* BLOCO 1: Vida Devocional & Louvor */}
                <div>
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 mb-2">
                    Vida Devocional & Louvor
                  </h4>
                  <div className="space-y-1">
                    {/* Orações & Diário */}
                    <button
                      onClick={() => {
                        setShowNavDrawer(false);
                        setShowPrayerModal(true);
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors group"
                    >
                      <div className="size-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-lg">volunteer_activism</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Orações & Diário</span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {prayerJournal.length > 0 ? `${prayerJournal.length} nota(s)` : 'Novo'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          Suas intenções e petições a Deus
                        </p>
                      </div>
                    </button>

                    {/* Músicas Gospel - Afro Faith Flow */}
                    <a
                      href="https://www.youtube.com/@AfroFaithFlow"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowNavDrawer(false)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors group"
                    >
                      <div className="size-9 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-lg">smart_display</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Músicas Gospel</span>
                          <span className="text-[9px] font-black tracking-wide text-red-600 dark:text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full border border-red-500/20">
                            CANAL OFICIAL
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          Afro Faith Flow · Louvor e adoração
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-sm text-slate-400 group-hover:translate-x-0.5 transition-transform">
                        open_in_new
                      </span>
                    </a>

                    {/* Planos de Leitura */}
                    <button
                      onClick={() => {
                        setShowNavDrawer(false);
                        onNavigate('screen-planos');
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors group"
                    >
                      <div className="size-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-lg">calendar_month</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Planos de Leitura</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          Jornadas temáticas guiadas
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-sm text-slate-400 group-hover:translate-x-0.5 transition-transform">
                        chevron_right
                      </span>
                    </button>

                    {/* Bíblia Sagrada (Texto) */}
                    <button
                      onClick={() => {
                        setShowNavDrawer(false);
                        onNavigate('screen-biblia');
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors group"
                    >
                      <div className="size-9 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-sacred-brand dark:text-sacred-neon flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-lg">menu_book</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Leitura da Bíblia</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          Explorar todos os 66 livros sagrados
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-sm text-slate-400 group-hover:translate-x-0.5 transition-transform">
                        chevron_right
                      </span>
                    </button>
                  </div>
                </div>

                {/* BLOCO 2: Jornada & Comunhão */}
                <div>
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 mb-2">
                    Jornada & Comunhão
                  </h4>
                  <div className="space-y-1">
                    {/* Desafio Diário */}
                    <button
                      onClick={() => {
                        setShowNavDrawer(false);
                        onNavigate('screen-desafio-diario');
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors group"
                    >
                      <div className="size-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-lg">local_fire_department</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Desafio Diário</span>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                            {tracks.streakDays > 0 ? `${tracks.streakDays}🔥` : 'Hoje'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          Quiz rápido & proteger ofensiva
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-sm text-slate-400 group-hover:translate-x-0.5 transition-transform">
                        chevron_right
                      </span>
                    </button>

                    {/* Mapa dos Mundos */}
                    <button
                      onClick={() => {
                        setShowNavDrawer(false);
                        onNavigate('screen-mapa-mundos');
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors group"
                    >
                      <div className="size-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-lg">explore</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Mapa dos Mundos</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          Da Criação ao Apocalipse em lições
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-sm text-slate-400 group-hover:translate-x-0.5 transition-transform">
                        chevron_right
                      </span>
                    </button>

                    {/* Classificação & Ligas */}
                    <button
                      onClick={() => {
                        setShowNavDrawer(false);
                        onNavigate('screen-ranking');
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors group"
                    >
                      <div className="size-9 rounded-xl bg-yellow-50 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-lg">leaderboard</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Classificação & Ligas</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          Tabela de posições e XP semanal
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-sm text-slate-400 group-hover:translate-x-0.5 transition-transform">
                        chevron_right
                      </span>
                    </button>

                    {/* Comunidade & Clãs */}
                    <button
                      onClick={() => {
                        setShowNavDrawer(false);
                        onNavigate('screen-clans');
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors group"
                    >
                      <div className="size-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-lg">groups</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Comunidade & Clãs</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          Cresça em comunhão fraternal
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-sm text-slate-400 group-hover:translate-x-0.5 transition-transform">
                        chevron_right
                      </span>
                    </button>
                  </div>
                </div>

                {/* BLOCO 3: Ferramentas & Conta */}
                <div>
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 mb-2">
                    Ferramentas & Definições
                  </h4>
                  <div className="space-y-1">
                    {/* Áudio Bíblia */}
                    <button
                      onClick={() => {
                        setShowNavDrawer(false);
                        onNavigate('screen-audio');
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors group"
                    >
                      <div className="size-9 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-sacred-brand dark:text-sacred-neon flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-lg">headphones</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Áudio Bíblia Dramatizada</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          Narração contínua e imersiva
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-sm text-slate-400 group-hover:translate-x-0.5 transition-transform">
                        chevron_right
                      </span>
                    </button>

                    {/* Estatísticas */}
                    <button
                      onClick={() => {
                        setShowNavDrawer(false);
                        onNavigate('screen-estatisticas');
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors group"
                    >
                      <div className="size-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-lg">insights</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Estatísticas de Estudo</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          Histórico de leitura, XP e metas
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-sm text-slate-400 group-hover:translate-x-0.5 transition-transform">
                        chevron_right
                      </span>
                    </button>

                    {/* Membresia & Apoio */}
                    <button
                      onClick={() => {
                        setShowNavDrawer(false);
                        openPricingModal();
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors group"
                    >
                      <div className="size-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-lg">workspace_premium</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Membresia & Apoio</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {currentPlan === 'FREE' ? 'Apoiar o projeto e desbloquear Pro' : `Membro ativo (${currentPlan})`}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-sm text-slate-400 group-hover:translate-x-0.5 transition-transform">
                        chevron_right
                      </span>
                    </button>

                    {/* Perfil & Configurações */}
                    <button
                      onClick={() => {
                        setShowNavDrawer(false);
                        onNavigate('screen-perfil');
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors group"
                    >
                      <div className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-lg">manage_accounts</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Perfil & Definições</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          Configurações da conta e preferências
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-sm text-slate-400 group-hover:translate-x-0.5 transition-transform">
                        chevron_right
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Rodapé do Drawer */}
            <div className="p-4 border-t border-slate-100 dark:border-dark-border bg-slate-50/50 dark:bg-[#081413]/50 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                BiblIA v2.1.0 · Lâmpada para os teus pés
              </span>
              <button
                onClick={() => setShowNavDrawer(false)}
                className="text-xs font-bold text-sacred-brand dark:text-sacred-neon hover:underline"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Guiado Contextual (Spotlight) */}
      <TutorialSpotlight
        steps={TUTORIAL_STEPS.app}
        isActive={showAppTutorial}
        onComplete={() => {
          markTutorialCompleted('app', user?.id);
          setShowAppTutorial(false);
        }}
        onSkip={() => {
          markTutorialCompleted('app', user?.id);
          setShowAppTutorial(false);
        }}
      />
    </div>
  );
};
