/**
 * Reexporta tipos canônicos de gameContracts.ts e mantém o banco de questões
 * de demonstração do protótipo 2.1 para as sessões locais (G0/G1).
 */
export type {
  GameMode,
  GameQuestionKind,
  GameQuestion,
} from '../types/gameContracts';

export { REWARD_RULES } from '../types/gameContracts';

import type { GameMode, GameQuestion } from '../types/gameContracts';

export const GAME_MODE_LABELS: Record<GameMode, string> = {
  quiz: 'Quiz Cronometrado',
  'true-false': 'Verdadeiro ou Falso',
  'fill-blanks': 'Completar Versículo',
  daily: 'Desafio Diário',
};

export const QUIZ_QUESTIONS: GameQuestion[] = [
  { id: 'q1', kind: 'multiple-choice', prompt: 'Quem construiu uma arca antes do dilúvio?', reference: 'Génesis 6:14', options: ['Abraão', 'Noé', 'Moisés', 'David'], answers: ['Noé'], explanation: 'Deus instruiu Noé a construir a arca.', hint: 'Leia Génesis 6.', topic: 'Aliança', difficulty: 'easy' },
  { id: 'q2', kind: 'multiple-choice', prompt: 'Quem enfrentou Golias?', reference: '1 Samuel 17:45', options: ['David', 'Saul', 'Samuel', 'Salomão'], answers: ['David'], explanation: 'David enfrentou Golias confiando no Senhor.', hint: 'A história está em 1 Samuel 17.', topic: 'Fé', difficulty: 'easy' },
  { id: 'q3', kind: 'multiple-choice', prompt: 'Em que cidade Jesus nasceu?', reference: 'Mateus 2:1', options: ['Nazaré', 'Jerusalém', 'Belém', 'Jericó'], answers: ['Belém'], explanation: 'Mateus situa o nascimento de Jesus em Belém.', hint: 'Leia o início de Mateus 2.', topic: 'Evangelhos', difficulty: 'easy' },
  { id: 'q4', kind: 'multiple-choice', prompt: 'Quem foi lançado na cova dos leões?', reference: 'Daniel 6:16', options: ['Elias', 'Daniel', 'José', 'Jonas'], answers: ['Daniel'], explanation: 'Daniel foi lançado na cova, e Deus guardou-o.', hint: 'O nome do profeta dá nome ao livro.', topic: 'Fé', difficulty: 'easy' },
  { id: 'q5', kind: 'multiple-choice', prompt: 'Quem recebeu os Dez Mandamentos?', reference: 'Êxodo 31:18', options: ['Josué', 'Arão', 'Moisés', 'Calebe'], answers: ['Moisés'], explanation: 'Moisés recebeu as tábuas da aliança no Sinai.', hint: 'Leia Êxodo 31.', topic: 'Aliança', difficulty: 'easy' },
  { id: 'q6', kind: 'multiple-choice', prompt: 'Qual discípulo era cobrador de impostos?', reference: 'Mateus 9:9', options: ['Pedro', 'Mateus', 'André', 'Tomé'], answers: ['Mateus'], explanation: 'Jesus chamou Mateus enquanto ele estava sentado na coletoria.', hint: 'A passagem também identifica o evangelista.', topic: 'Evangelhos', difficulty: 'medium' },
  { id: 'q7', kind: 'multiple-choice', prompt: 'Quem interpretou os sonhos do faraó?', reference: 'Génesis 41:15–16', options: ['José', 'Daniel', 'Jacó', 'Isaac'], answers: ['José'], explanation: 'José explicou que a interpretação vinha de Deus.', hint: 'A história começa quando ele é levado ao Egito.', topic: 'Sabedoria', difficulty: 'medium' },
  { id: 'q8', kind: 'multiple-choice', prompt: 'Que profeta foi levado ao céu num redemoinho?', reference: '2 Reis 2:11', options: ['Isaías', 'Eliseu', 'Elias', 'Jeremias'], answers: ['Elias'], explanation: 'Elias foi levado ao céu num redemoinho.', hint: 'Eliseu estava com ele.', topic: 'Fé', difficulty: 'medium' },
  { id: 'q9', kind: 'multiple-choice', prompt: 'Quem subiu a uma árvore para ver Jesus?', reference: 'Lucas 19:4', options: ['Zaqueu', 'Bartimeu', 'Nicodemos', 'Lázaro'], answers: ['Zaqueu'], explanation: 'Zaqueu subiu a um sicómoro para conseguir ver Jesus.', hint: 'Leia o encontro em Lucas 19.', topic: 'Evangelhos', difficulty: 'easy' },
  { id: 'q10', kind: 'multiple-choice', prompt: 'Qual era a profissão de Pedro antes de seguir Jesus?', reference: 'Mateus 4:18–20', options: ['Pastor', 'Pescador', 'Carpinteiro', 'Soldado'], answers: ['Pescador'], explanation: 'Pedro e André trabalhavam como pescadores.', hint: 'Jesus chamou-os junto ao mar da Galileia.', topic: 'Evangelhos', difficulty: 'easy' },
];

export const TRUE_FALSE_QUESTIONS: GameQuestion[] = [
  { id: 'tf1', kind: 'true-false', prompt: 'Noé construiu uma arca por instrução de Deus.', reference: 'Génesis 6:14', answers: ['true'], explanation: 'Génesis relata que Deus instruiu Noé a construir a arca.', hint: 'Consulte Génesis 6:13–14.', topic: 'Aliança', difficulty: 'easy' },
  { id: 'tf2', kind: 'true-false', prompt: 'David venceu Golias usando uma espada.', reference: '1 Samuel 17:50', answers: ['false'], explanation: 'David venceu Golias com uma funda e uma pedra.', hint: 'Leia 1 Samuel 17:49–50.', topic: 'Fé', difficulty: 'easy' },
  { id: 'tf3', kind: 'true-false', prompt: 'Jesus nasceu em Belém.', reference: 'Mateus 2:1', answers: ['true'], explanation: 'Mateus identifica Belém como o lugar do nascimento de Jesus.', hint: 'Consulte Mateus 2:1.', topic: 'Evangelhos', difficulty: 'easy' },
  { id: 'tf4', kind: 'true-false', prompt: 'Jonas foi engolido por um grande peixe.', reference: 'Jonas 1:17', answers: ['true'], explanation: 'O texto de Jonas diz que um grande peixe o engoliu.', hint: 'Consulte Jonas 1:17.', topic: 'Fé', difficulty: 'easy' },
  { id: 'tf5', kind: 'true-false', prompt: 'Moisés conduziu o povo através do mar Vermelho.', reference: 'Êxodo 14:21–22', answers: ['true'], explanation: 'O relato descreve a travessia do povo pelo mar.', hint: 'Leia Êxodo 14.', topic: 'Aliança', difficulty: 'easy' },
  { id: 'tf6', kind: 'true-false', prompt: 'Daniel foi lançado numa fornalha ardente.', reference: 'Daniel 6:16', answers: ['false'], explanation: 'Daniel foi lançado na cova dos leões; os três amigos foram lançados na fornalha.', hint: 'Compare Daniel 3 com Daniel 6.', topic: 'Fé', difficulty: 'medium' },
  { id: 'tf7', kind: 'true-false', prompt: 'Marta e Maria eram irmãs de Lázaro.', reference: 'João 11:1–2', answers: ['true'], explanation: 'João apresenta Lázaro como irmão de Marta e Maria.', hint: 'Leia João 11:1–2.', topic: 'Evangelhos', difficulty: 'easy' },
  { id: 'tf8', kind: 'true-false', prompt: 'Paulo estava presente no nascimento de Jesus.', reference: 'Lucas 2:1–7', answers: ['false'], explanation: 'O nascimento de Jesus ocorreu antes do período de Paulo.', hint: 'Consulte os relatos do nascimento em Mateus 1–2 ou Lucas 1–2.', topic: 'Evangelhos', difficulty: 'easy' },
  { id: 'tf9', kind: 'true-false', prompt: 'Salomão pediu sabedoria a Deus.', reference: '1 Reis 3:9–12', answers: ['true'], explanation: 'Salomão pediu entendimento para governar o povo.', hint: 'Leia 1 Reis 3.', topic: 'Sabedoria', difficulty: 'easy' },
  { id: 'tf10', kind: 'true-false', prompt: 'Pedro negou conhecer Jesus três vezes.', reference: 'Lucas 22:54–62', answers: ['true'], explanation: 'Jesus tinha anunciado que Pedro o negaria três vezes.', hint: 'Consulte Lucas 22:54–62.', topic: 'Evangelhos', difficulty: 'easy' },
];

export const FILL_QUESTIONS: GameQuestion[] = [
  { id: 'fb1', kind: 'fill-blanks', prompt: 'O Senhor é o meu ___. Nada me ___.', reference: 'Salmos 23:1', options: ['pastor', 'faltará', 'rei', 'medo', 'luz'], answers: ['pastor', 'faltará'], explanation: 'O primeiro versículo do Salmo 23 apresenta o Senhor como pastor.', hint: 'Salmos 23:1.', topic: 'Fé', difficulty: 'easy' },
  { id: 'fb2', kind: 'fill-blanks', prompt: 'A tua palavra é ___ para os meus pés e ___ para o meu caminho.', reference: 'Salmos 119:105', options: ['lâmpada', 'luz', 'espada', 'pão', 'voz'], answers: ['lâmpada', 'luz'], explanation: 'O salmista compara a palavra de Deus a uma lâmpada e luz para o caminho.', hint: 'Salmos 119:105.', topic: 'Sabedoria', difficulty: 'easy' },
  { id: 'fb3', kind: 'fill-blanks', prompt: 'No princípio era o ___, e o Verbo estava com ___.', reference: 'João 1:1', options: ['Verbo', 'Deus', 'mundo', 'templo', 'caminho'], answers: ['Verbo', 'Deus'], explanation: 'João começa o seu evangelho identificando o Verbo e a sua relação com Deus.', hint: 'João 1:1.', topic: 'Evangelhos', difficulty: 'medium' },
  { id: 'fb4', kind: 'fill-blanks', prompt: 'Confia no Senhor de todo o teu ___ e não te estribes no teu próprio ___.', reference: 'Provérbios 3:5', options: ['coração', 'entendimento', 'medo', 'poder', 'caminho'], answers: ['coração', 'entendimento'], explanation: 'Provérbios 3:5 aconselha confiar no Senhor e não depender do próprio entendimento.', hint: 'Provérbios 3:5.', topic: 'Sabedoria', difficulty: 'easy' },
  { id: 'fb5', kind: 'fill-blanks', prompt: 'Eu sou o ___, a ___ e a vida.', reference: 'João 14:6', options: ['caminho', 'verdade', 'pastor', 'porta', 'luz'], answers: ['caminho', 'verdade'], explanation: 'Em João 14:6, Jesus apresenta-se como o caminho, a verdade e a vida.', hint: 'João 14:6.', topic: 'Evangelhos', difficulty: 'easy' },
  { id: 'fb6', kind: 'fill-blanks', prompt: 'Vós sois o ___ da terra; vós sois a ___ do mundo.', reference: 'Mateus 5:13–14', options: ['sal', 'luz', 'pão', 'água', 'voz'], answers: ['sal', 'luz'], explanation: 'No Sermão do Monte, Jesus usa as imagens do sal e da luz.', hint: 'Mateus 5:13–14.', topic: 'Evangelhos', difficulty: 'easy' },
  { id: 'fb7', kind: 'fill-blanks', prompt: 'O fruto do Espírito é ___, alegria, ___ e longanimidade.', reference: 'Gálatas 5:22', options: ['amor', 'paz', 'fé', 'esperança', 'bondade'], answers: ['amor', 'paz'], explanation: 'Gálatas 5:22 começa a lista do fruto do Espírito com amor, alegria e paz.', hint: 'Gálatas 5:22.', topic: 'Fé', difficulty: 'medium' },
  { id: 'fb8', kind: 'fill-blanks', prompt: 'A tua ___ é ___ para os meus pés e luz para o meu caminho.', reference: 'Salmos 119:105', options: ['palavra', 'lâmpada', 'lei', 'oração', 'promessa'], answers: ['palavra', 'lâmpada'], explanation: 'O salmista descreve a palavra de Deus como orientação para o caminho.', hint: 'Salmos 119:105.', topic: 'Sabedoria', difficulty: 'easy' },
  { id: 'fb9', kind: 'fill-blanks', prompt: 'Buscai primeiro o ___ de Deus e a sua ___.', reference: 'Mateus 6:33', options: ['reino', 'justiça', 'poder', 'glória', 'sabedoria'], answers: ['reino', 'justiça'], explanation: 'Mateus 6:33 orienta a procurar primeiro o reino e a justiça de Deus.', hint: 'Mateus 6:33.', topic: 'Fé', difficulty: 'easy' },
  { id: 'fb10', kind: 'fill-blanks', prompt: 'A resposta branda desvia o ___, mas a palavra dura suscita a ___.', reference: 'Provérbios 15:1', options: ['furor', 'ira', 'medo', 'dor', 'paz'], answers: ['furor', 'ira'], explanation: 'Provérbios 15:1 contrasta o efeito de uma resposta branda com uma palavra dura.', hint: 'Provérbios 15:1.', topic: 'Sabedoria', difficulty: 'medium' },
];

export const DAILY_QUESTIONS: GameQuestion[] = [
  // 1. Contexto e Reflexão (Múltipla Escolha)
  {
    id: 'daily-q1',
    kind: 'multiple-choice',
    prompt: 'Qual é o fundamento da sabedoria segundo o livro de Provérbios?',
    reference: 'Provérbios 9:10',
    options: ['O temor do Senhor', 'A riqueza dos reis', 'A erudição humana', 'A força militar'],
    answers: ['O temor do Senhor'],
    explanation: 'O temor do Senhor é o princípio da sabedoria, e o conhecimento do Santo é a prudência.',
    hint: 'Provérbios 9:10.',
    topic: 'Sabedoria',
    difficulty: 'easy',
  },
  // 2. Discernimento de Afirmação (Verdadeiro ou Falso)
  {
    id: 'daily-tf2',
    kind: 'true-false',
    prompt: 'O Salmo 23 declara que a bondade e a misericórdia de Deus nos seguirão todos os dias da nossa vida.',
    reference: 'Salmos 23:6',
    answers: ['true'],
    explanation: 'Salmos 23:6 afirma com confiança: "Certamente que a bondade e a misericórdia me seguirão todos os dias da minha vida".',
    hint: 'Consulte o versículo final do Salmo 23.',
    topic: 'Fé',
    difficulty: 'easy',
  },
  // 3. Memorização Sagrada (Completar Versículo)
  {
    id: 'daily-fb3',
    kind: 'fill-blanks',
    prompt: 'Lâmpada para os meus pés é a tua ___, e luz para o meu ___.',
    reference: 'Salmos 119:105',
    options: ['palavra', 'caminho', 'verdade', 'guia', 'paz'],
    answers: ['palavra', 'caminho'],
    explanation: 'A Palavra de Deus ilumina cada passo da nossa caminhada diária.',
    hint: 'Salmos 119:105.',
    topic: 'Memorização',
    difficulty: 'easy',
  },
];

export function questionsForMode(mode: GameMode): GameQuestion[] {
  if (mode === 'quiz') return QUIZ_QUESTIONS;
  if (mode === 'true-false') return TRUE_FALSE_QUESTIONS;
  if (mode === 'daily') return DAILY_QUESTIONS;
  return FILL_QUESTIONS;
}
