import type { CanonicalPhase, CanonicalWorld, GameMode } from '../types/gameContracts';

const JOURNEY_STORAGE_KEY = 'biblia:game-journey-v1';

export const CANONICAL_WORLDS: CanonicalWorld[] = [
  { id: 1, slug: 'creation-eden', title: 'A Criação e o Éden', subtitle: 'Génesis 1–11', testament: 'AT', focus: 'Criação, queda, dilúvio e Babel', themeColor: 'emerald', icon: 'auto_awesome', totalPhases: 5, reviewTitle: 'Revisão dos Começos', achievementBadge: 'Pioneiro da Fé', isUnlocked: true },
  { id: 2, slug: 'patriarchs', title: 'A Aliança dos Patriarcas', subtitle: 'Génesis 12–50', testament: 'AT', focus: 'Abraão, Isaac, Jacó e José', themeColor: 'amber', icon: 'family_restroom', totalPhases: 5, reviewTitle: 'Revisão da Aliança', achievementBadge: 'Filho da Promessa', isUnlocked: false },
  { id: 3, slug: 'exodus-law', title: 'O Êxodo e a Lei', subtitle: 'Êxodo–Deuteronómio', testament: 'AT', focus: 'Libertação, deserto e aliança', themeColor: 'sky', icon: 'waves', totalPhases: 5, reviewTitle: 'Revisão da Libertação', achievementBadge: 'Liberto do Egito', isUnlocked: false },
  { id: 4, slug: 'promised-land-kings', title: 'A Terra Prometida e os Reinos', subtitle: 'Josué–2 Reis', testament: 'AT', focus: 'Juízes, reis, coragem e sabedoria', themeColor: 'rose', icon: 'castle', totalPhases: 5, reviewTitle: 'Revisão dos Reinos', achievementBadge: 'Guardião da Aliança', isUnlocked: false },
  { id: 5, slug: 'prophets', title: 'Vozes dos Profetas', subtitle: 'Profetas Maiores e Menores', testament: 'AT', focus: 'Esperança, justiça e restauração', themeColor: 'violet', icon: 'campaign', totalPhases: 5, reviewTitle: 'Revisão Profética', achievementBadge: 'Sentinela da Palavra', isUnlocked: false },
  { id: 6, slug: 'gospel-grace', title: 'O Evangelho da Graça', subtitle: 'Mateus–João', testament: 'NT', focus: 'Jesus, parábolas, cruz e ressurreição', themeColor: 'teal', icon: 'menu_book', totalPhases: 5, reviewTitle: 'Revisão do Evangelho', achievementBadge: 'Discípulo de Cristo', isUnlocked: false },
  { id: 7, slug: 'church-hope', title: 'A Igreja e a Esperança Final', subtitle: 'Atos–Apocalipse', testament: 'NT', focus: 'Missão, cartas e esperança cristã', themeColor: 'indigo', icon: 'groups', totalPhases: 5, reviewTitle: 'Revisão da Missão', achievementBadge: 'Servo Fiel', isUnlocked: false },
];

const WORLD_ONE_PHASES: CanonicalPhase[] = [
  { id: 'world-1-phase-1', worldId: 1, phaseNumber: 1, title: 'A Criação', description: 'Descubra os começos em Génesis e a bondade da criação.', nodeType: 'lesson', scriptureReference: 'Génesis 1', estimatedMinutes: 5, mode: 'quiz', topics: ['Criação', 'Fé'], stars: 0, isCompleted: false, isUnlocked: true },
  { id: 'world-1-phase-2', worldId: 1, phaseNumber: 2, title: 'A Queda', description: 'Reflita sobre escolha, confiança e restauração.', nodeType: 'lesson', scriptureReference: 'Génesis 3', estimatedMinutes: 5, mode: 'true-false', topics: ['Fé', 'Aliança'], stars: 0, isCompleted: false, isUnlocked: false },
  { id: 'world-1-phase-3', worldId: 1, phaseNumber: 3, title: 'Memória da Criação', description: 'Guarde uma passagem-chave de Génesis no coração.', nodeType: 'memory', scriptureReference: 'Génesis 1:1', estimatedMinutes: 3, mode: 'fill-blanks', topics: ['Criação', 'Memória'], stars: 0, isCompleted: false, isUnlocked: false },
  { id: 'world-1-phase-4', worldId: 1, phaseNumber: 4, title: 'O Grande Dilúvio', description: 'Explore a fidelidade de Deus na história de Noé.', nodeType: 'lesson', scriptureReference: 'Génesis 6–9', estimatedMinutes: 5, mode: 'quiz', topics: ['Fé', 'Aliança'], stars: 0, isCompleted: false, isUnlocked: false },
  { id: 'world-1-phase-5', worldId: 1, phaseNumber: 5, title: 'Revisão dos Começos', description: 'Celebre o que aprendeu e consolide os temas do primeiro mundo.', nodeType: 'world_review', scriptureReference: 'Génesis 1–11', estimatedMinutes: 7, mode: 'quiz', topics: ['Criação', 'Fé', 'Aliança'], stars: 0, isCompleted: false, isUnlocked: false },
];

export interface JourneyState {
  phases: Record<string, CanonicalPhase>;
}

function createInitialState(): JourneyState {
  return { phases: Object.fromEntries(WORLD_ONE_PHASES.map((phase) => [phase.id, { ...phase }])) };
}

export function getJourneyState(): JourneyState {
  try {
    const stored = localStorage.getItem(JOURNEY_STORAGE_KEY);
    if (stored) return JSON.parse(stored) as JourneyState;
  } catch {
    // A fresh state is safer than retaining malformed local progress.
  }
  return createInitialState();
}

function saveJourneyState(state: JourneyState): void {
  try {
    localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Progress remains available for the current session if storage is unavailable.
  }
}

export function getJourneyPhases(worldId: number): CanonicalPhase[] {
  const phases = Object.values(getJourneyState().phases)
    .filter((phase) => phase.worldId === worldId)
    .sort((a, b) => a.phaseNumber - b.phaseNumber);
  return phases;
}

export function getJourneyPhase(phaseId: string): CanonicalPhase | undefined {
  return getJourneyState().phases[phaseId];
}

export function getCurrentJourneyPhase(): CanonicalPhase {
  const phases = getJourneyPhases(1);
  return phases.find((phase) => phase.isUnlocked && !phase.isCompleted) || phases[phases.length - 1];
}

export function getWorldCompletion(worldId: number): number {
  const phases = getJourneyPhases(worldId);
  if (!phases.length) return 0;
  return Math.round((phases.filter((phase) => phase.isCompleted).length / phases.length) * 100);
}

export function recordPhaseResult(phaseId: string | undefined, result: { completed: boolean; starsEarned: number }): void {
  if (!phaseId || !result.completed) return;

  const state = getJourneyState();
  const phase = state.phases[phaseId];
  if (!phase) return;

  state.phases[phaseId] = {
    ...phase,
    isCompleted: true,
    stars: Math.max(phase.stars, result.starsEarned),
    lastCompletedAt: new Date().toISOString(),
  };

  const nextId = `world-${phase.worldId}-phase-${phase.phaseNumber + 1}`;
  if (state.phases[nextId]) {
    state.phases[nextId] = { ...state.phases[nextId], isUnlocked: true };
  }
  saveJourneyState(state);
}

export function getNodeIcon(nodeType: CanonicalPhase['nodeType']): string {
  if (nodeType === 'memory') return 'bookmark';
  if (nodeType === 'guided_reading') return 'menu_book';
  if (nodeType === 'blessing_chest') return 'redeem';
  if (nodeType === 'world_review') return 'workspace_premium';
  return 'play_circle';
}

export function getPhaseModeLabel(mode: GameMode): string {
  if (mode === 'true-false') return 'Verdadeiro ou Falso';
  if (mode === 'fill-blanks') return 'Completar Versículo';
  if (mode === 'daily') return 'Desafio Diário';
  return 'Quiz Bíblico';
}
