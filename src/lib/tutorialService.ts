/**
 * BiblIA — Serviço de Gestão e Persistência de Tutoriais Guiados
 * Controla a exibição única dos tutoriais da Home (App), Jogo (Jornada) e IA (Orientador).
 */

export type TutorialModule = 'app' | 'game' | 'ai';

export interface TutorialStep {
  targetSelector: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'auto';
}

const STORAGE_PREFIX = 'biblia_tutorial_seen_';

export function isTutorialCompleted(module: TutorialModule, userId?: string | null): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const key = `${STORAGE_PREFIX}${module}_${userId || 'anon'}`;
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

export function markTutorialCompleted(module: TutorialModule, userId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const key = `${STORAGE_PREFIX}${module}_${userId || 'anon'}`;
    localStorage.setItem(key, 'true');
  } catch {
    // ignore
  }
}

export function resetTutorial(module?: TutorialModule, userId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (module) {
      const key = `${STORAGE_PREFIX}${module}_${userId || 'anon'}`;
      localStorage.removeItem(key);
    } else {
      const modules: TutorialModule[] = ['app', 'game', 'ai'];
      modules.forEach((mod) => {
        const key = `${STORAGE_PREFIX}${mod}_${userId || 'anon'}`;
        localStorage.removeItem(key);
      });
    }
  } catch {
    // ignore
  }
}

export const TUTORIAL_STEPS: Record<TutorialModule, TutorialStep[]> = {
  app: [
    {
      targetSelector: '[data-tutorial="verse-of-the-day"]',
      title: 'Pão Diário das Escrituras',
      description: 'Leia, reflita e guarde a mensagem sagrada selecionada para hoje. Toque para aprofundar ou partilhar.',
      position: 'bottom',
    },
    {
      targetSelector: '[data-tutorial="bottom-navigation"]',
      title: 'Navegação Fácil & Rápida',
      description: 'Alterne entre o Início, a Bíblia narrada em Áudio, a Jornada de jogos, o Leitor das Escrituras e o Orientador IA.',
      position: 'top',
    },
    {
      targetSelector: '[data-tutorial="user-progress-bar"]',
      title: 'Sua Caminhada Espiritual',
      description: 'Acompanhe a sua constância diária, ofensiva de oração e leitura para edificar um hábito firme na Palavra.',
      position: 'bottom',
    },
  ],
  game: [
    {
      targetSelector: '[data-tutorial="game-first-node"]',
      title: 'O Caminho da Fé',
      description: 'Avance de nó em nó pelas Escrituras, do Gênesis ao Apocalipse. Cada lição vencida abre novas revelações.',
      position: 'top',
    },
    {
      targetSelector: '[data-tutorial="game-lives-header"]',
      title: 'Vidas e Atenção',
      description: 'Cada erro consome um coração sagrado. As vidas regeneram com o tempo ou quando você revisa lições passadas.',
      position: 'bottom',
    },
    {
      targetSelector: '[data-tutorial="game-daily-quest"]',
      title: 'Desafios & Crescimento',
      description: 'Responda a Quizzes, Verdadeiro ou Falso e complete versículos para acumular bênçãos e sabedoria bíblica.',
      position: 'top',
    },
  ],
  ai: [
    {
      targetSelector: '[data-tutorial="ai-sacred-orb"]',
      title: 'Orbe Sagrada Viva',
      description: 'A Orbe reage ao seu estudo: acelera ao buscar referências bíblicas e vibra suavemente durante a leitura por voz.',
      position: 'bottom',
    },
    {
      targetSelector: '[data-tutorial="ai-study-modes"]',
      title: 'Diálogo Teológico Guiado',
      description: 'Peça explicações teológicas, contexto histórico ou orações pastorais com apenas um toque, sem dúvidas soltas.',
      position: 'top',
    },
    {
      targetSelector: '[data-tutorial="ai-quota-badge"]',
      title: 'Uso Diário & Voz Neural',
      description: 'Consulte as suas perguntas diárias gratuitas e ouça as respostas com a narração por voz natural e tranquila.',
      position: 'bottom',
    },
  ],
};
