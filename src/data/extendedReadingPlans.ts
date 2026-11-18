import { BIBLE_BOOKS } from './bibleData';
import type { PlanDay, ReadingPlan, SprintDuration } from '../types/readingPlanTypes';

const chapterBook = (name: string) => {
  const book = BIBLE_BOOKS.find((item) => item.name === name);
  if (!book) throw new Error(`Livro bíblico não encontrado: ${name}`);
  return book;
};

function chapterDays(
  books: string[],
  dayCount: number,
  intro: string,
): PlanDay[] {
  const chapters = books.flatMap((name) => {
    const book = chapterBook(name);
    return Array.from({ length: book.totalChapters }, (_, index) => ({
      name: book.name,
      chapter: index + 1,
    }));
  });

  return Array.from({ length: dayCount }, (_, index) => {
    const start = Math.floor((index * chapters.length) / dayCount);
    const end = Math.floor(((index + 1) * chapters.length) / dayCount);
    const selected = chapters.slice(start, Math.max(start + 1, end));
    const first = selected[0];
    const last = selected[selected.length - 1];
    const chapterRange = first.name === last.name
      ? `${first.name} ${first.chapter}${last.chapter > first.chapter ? `–${last.chapter}` : ''}`
      : `${first.name} ${first.chapter}–${last.name} ${last.chapter}`;

    return {
      dayNumber: index + 1,
      title: chapterRange,
      devotionalSnippet: `${intro} Hoje: ${chapterRange}. Leia no seu ritmo e siga a linha da narrativa, observando o que o texto revela sobre Deus, as pessoas e a vida em comunidade.`,
      devotionalSource: 'Leitura bíblica — Bíblia Livre (BLIVRE).',
      reflectionPrompt: 'Que palavra, atitude ou acontecimento desta leitura merece ficar consigo hoje?',
      passages: selected.map((item) => ({
        bookId: item.name,
        chapter: item.chapter,
        label: `${item.name} ${item.chapter}`,
      })),
      quizQuestions: [],
      xpReward: 20,
    };
  });
}

function psalmDays(): PlanDay[] {
  const readings = [
    ['Salmo 1', 1], ['Salmo 8', 8], ['Salmo 13', 13], ['Salmo 19', 19], ['Salmo 23', 23],
    ['Salmo 27', 27], ['Salmo 34', 34], ['Salmo 42', 42], ['Salmo 46', 46], ['Salmo 51', 51],
    ['Salmo 63', 63], ['Salmo 91', 91], ['Salmo 103', 103], ['Salmo 121', 121], ['Salmo 139', 139],
  ] as const;
  const themes = [
    'Dois caminhos e uma escolha', 'A grandeza de Deus', 'Levar o lamento a Deus', 'A criação aponta para o Criador',
    'Deus cuida e guia', 'Coragem em tempos de medo', 'Bondade no meio da aflição', 'Saudade e esperança',
    'Refúgio em tempos de mudança', 'Confissão e recomeço', 'Desejo de estar com Deus', 'Proteção e confiança',
    'Gratidão pela misericórdia', 'Socorro para a caminhada', 'Conhecidos e acompanhados por Deus',
  ];
  return readings.map(([label, chapter], index) => ({
    dayNumber: index + 1,
    title: themes[index],
    devotionalSnippet: `Uma pausa para ler, sentir e responder com honestidade. ${label} oferece uma voz diferente para a oração de hoje.`,
    devotionalSource: 'Livro dos Salmos — poesia e oração bíblica.',
    reflectionPrompt: 'Que sentimento ou pedido encontra palavras neste salmo?',
    passages: [{ bookId: 'Salmos', chapter, label }],
    quizQuestions: [],
    xpReward: 20,
  }));
}

function makePlan(config: {
  id: string; title: string; subtitle: string; description: string;
  duration: SprintDuration; category: ReadingPlan['category']; icon: string;
  color: string; badge: string; badgeIcon: string; completionBonusXp: number;
  days: PlanDay[];
}): ReadingPlan {
  return {
    id: config.id,
    title: config.title,
    subtitle: config.subtitle,
    description: config.description,
    category: config.category,
    tier: 'free',
    sprintDays: config.duration,
    icon: config.icon,
    accentColor: config.color,
    badge: { icon: config.badgeIcon, label: config.badge },
    completionBonusXp: config.completionBonusXp,
    totalXp: config.days.reduce((sum, day) => sum + day.xpReward, 0) + config.completionBonusXp,
    days: config.days,
  };
}

// Esta jornada distribui os quatro Evangelhos e o início de Atos por 90 dias,
// mantendo uma leitura diária pequena e a sequência do texto.
const gospelAndActs = chapterDays(['Mateus', 'Marcos', 'Lucas', 'João', 'Atos'], 90,
  'Leia a história de Jesus pelos quatro Evangelhos e acompanhe os primeiros passos da Igreja em Atos.');
const newTestament = chapterDays(BIBLE_BOOKS.filter((book) => book.testament === 'NT').map((book) => book.name),
  180, 'Percorra o Novo Testamento: Evangelhos, missão da Igreja, cartas e esperança.');
const wholeBible = chapterDays(BIBLE_BOOKS.map((book) => book.name), 365,
  'Uma leitura completa da Bíblia, do Génesis ao Apocalipse. O plano distribui os capítulos ao longo do ano para criar um ritmo sustentável.');

// A missão de 30 dias começa em Marcos e avança pelos primeiros capítulos de Atos.
const markAndActsDays: PlanDay[] = Array.from({ length: 30 }, (_, index) => {
  const bookName = index < 16 ? 'Marcos' : 'Atos';
  const chapter = index < 16 ? index + 1 : index - 15;
  const bookTitle = index < 16
    ? ['O início das boas-novas', 'Autoridade que serve', 'Chamados para caminhar', 'Histórias do Reino', 'Poder que restaura', 'Compaixão em movimento', 'Aprender a confiar', 'Quem é Jesus?', 'O caminho do discipulado', 'Servir em vez de dominar', 'A chegada a Jerusalém', 'Vigiar e permanecer', 'A mesa da aliança', 'A paixão de Jesus', 'A cruz', 'A notícia da ressurreição'][index]
    : `A missão continua — Atos ${chapter}`;
  const book = chapterBook(bookName);
  return {
    dayNumber: index + 1,
    title: bookTitle,
    devotionalSnippet: index < 16
      ? `Leia Marcos ${chapter} e acompanhe uma etapa do ministério de Jesus. Repare nos encontros e nas respostas de quem o segue.`
      : `Leia Atos ${chapter} e veja como a comunidade cristã dá os próximos passos da sua missão.`,
    devotionalSource: 'Evangelho de Marcos e Atos dos Apóstolos — leitura narrativa.',
    reflectionPrompt: 'O que este capítulo convida a compreender, confiar ou praticar?',
    passages: [{ bookId: book.name, chapter, label: `${book.name} ${chapter}` }],
    quizQuestions: [],
    xpReward: 20,
  };
});

export const EXTENDED_READING_PLANS: ReadingPlan[] = [
  makePlan({ id: 'salmos-15-dias', title: '15 Dias de Salmos para a Vida Real', subtitle: 'Orações para diferentes dias e sentimentos', description: 'Quinze salmos escolhidos para acompanhar alegria, medo, cansaço, gratidão e esperança. Um plano breve, com espaço para ler e orar sem pressa.', duration: 15, category: 'oração', icon: 'self_improvement', color: '#6366f1', badge: 'Coração em Oração', badgeIcon: '🙏', completionBonusXp: 100, days: psalmDays() }),
  makePlan({ id: 'jesus-e-missao-30-dias', title: 'De Jesus à Missão', subtitle: '30 dias em Marcos e Atos', description: 'Comece pela vida, pelos encontros e pelo caminho de Jesus em Marcos; termine acompanhando os primeiros passos da Igreja em Atos. Uma ponte entre o Evangelho e a vida em comunidade.', duration: 30, category: 'primeiros-passos', icon: 'route', color: '#0ea5e9', badge: 'Caminho e Missão', badgeIcon: '🕊️', completionBonusXp: 300, days: markAndActsDays }),
  makePlan({ id: 'evangelhos-e-atos-90-dias', title: 'Jesus e a Igreja Nascente', subtitle: 'Uma jornada trimestral pelos Evangelhos e Atos', description: 'Leia os quatro relatos da vida de Jesus e siga para Atos. A leitura mantém a ordem de cada livro e distribui os capítulos em pequenas porções diárias.', duration: 90, category: 'primeiros-passos', icon: 'auto_stories', color: '#14b8a6', badge: 'Testemunha da Boa-Nova', badgeIcon: '✨', completionBonusXp: 1200, days: gospelAndActs }),
  makePlan({ id: 'novo-testamento-180-dias', title: 'Novo Testamento em Seis Meses', subtitle: 'Uma leitura diária de Evangelhos, cartas e esperança', description: 'Percorra o Novo Testamento inteiro em seis meses. A sequência passa pela vida de Jesus, pela missão da Igreja e pelos ensinamentos das cartas, com cerca de um ou dois capítulos por dia.', duration: 180, category: 'primeiros-passos', icon: 'menu_book', color: '#f97316', badge: 'Leitor do Novo Testamento', badgeIcon: '📖', completionBonusXp: 3000, days: newTestament }),
  makePlan({ id: 'biblia-em-um-ano', title: 'Bíblia Completa em Um Ano', subtitle: 'Do Génesis ao Apocalipse, um passo de cada vez', description: 'Uma jornada anual por todos os capítulos da Bíblia, na ordem dos livros. O ritmo diário fica perto de três capítulos, com pausas naturais entre jornadas e sem penalidade por retomar depois.', duration: 365, category: 'primeiros-passos', icon: 'calendar_month', color: '#a855f7', badge: 'Caminho por Toda a Bíblia', badgeIcon: '🏆', completionBonusXp: 8000, days: wholeBible }),
];
