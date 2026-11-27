import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { audioEngine } from '../../lib/audioEngine';
import { UserAvatar } from '../common/UserAvatar';
import { TheologicalMarkdown } from './TheologicalMarkdown';
import { SacredOrb, SacredOrbState } from './SacredOrb';
import { getFirstName, getEffectiveDisplayName } from '../../lib/userProfile';
import { getDailyQuotaStatus, getPlanDailyLimit } from '../../lib/assistantQuotaService';
import { TutorialSpotlight } from '../common/TutorialSpotlight';
import { isTutorialCompleted, markTutorialCompleted, TUTORIAL_STEPS } from '../../lib/tutorialService';
import {
  askAssistant,
  AssistantConversation,
  AssistantServiceError,
  deleteAssistantConversation,
  getAssistantHistory,
  getUserConversations,
  ScriptureReference,
  getEffectiveGeminiApiKey,
  setCustomGeminiApiKey,
} from '../../lib/assistantService';

interface AIAssistantProps {
  onNavigate: (screen: string) => void;
  showToast: (msg: string, icon?: string) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  references?: ScriptureReference[];
  suggestedQuestions?: string[];
  interpretationNote?: string;
  safetyNote?: string;
}

const ACTIVE_CONVERSATION_KEY = 'biblia_ai_active_conversation';

const QUICK_PROMPTS = [
  {
    icon: 'menu_book',
    label: 'Explicar uma passagem',
    guidance: 'Com certeza! Que livro, capítulo ou versículo gostaria de analisar juntos hoje?',
  },
  {
    icon: 'history_edu',
    label: 'Contexto histórico',
    guidance: 'Excelente escolha de estudo. Sobre qual livro ou carta bíblica deseja conhecer o autor, a época e o público original?',
  },
  {
    icon: 'compare_arrows',
    label: 'Comparar textos',
    guidance: 'A comparação entre passagens revela a harmonia da Palavra. Que textos ou temas gostaria de correlacionar hoje?',
  },
  {
    icon: 'volunteer_activism',
    label: 'Oração breve',
    guidance: 'A oração aproxima o nosso coração de Deus. Há algum momento específico, motivo de gratidão ou aflição pelo qual gostaria de orar agora?',
  },
];

function formatRelativeDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24 && date.getDate() === now.getDate()) {
      return 'Hoje';
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.getDate() === yesterday.getDate()) {
      return 'Ontem';
    }
    if (diffHours < 24 * 7) {
      return 'Esta semana';
    }
    return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
  } catch {
    return 'Anteriores';
  }
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ onNavigate, showToast }) => {
  const { user, isConfigured, loading, openAuthModal } = useAuth();
  const { planTier, planName, profile } = useSubscription();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState('');
  const [conversations, setConversations] = useState<AssistantConversation[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [dailyLimit, setDailyLimit] = useState<number>(() => getPlanDailyLimit(planTier));
  const [remainingToday, setRemainingToday] = useState<number>(() => getDailyQuotaStatus(user?.id, planTier).remainingToday);

  useEffect(() => {
    const status = getDailyQuotaStatus(user?.id, planTier);
    setRemainingToday(status.remainingToday);
    setDailyLimit(status.limit);
  }, [user?.id, planTier]);
  const [errorMessage, setErrorMessage] = useState('');
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => getEffectiveGeminiApiKey());
  const [showAiTutorial, setShowAiTutorial] = useState(false);

  useEffect(() => {
    if (!isTutorialCompleted('ai', user?.id)) {
      const timer = setTimeout(() => {
        setShowAiTutorial(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [user?.id]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [lastUserQuestion, setLastUserQuestion] = useState('');
  const hasDirectApiKey = Boolean(getEffectiveGeminiApiKey());
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  const firstName = getFirstName(user, profile);
  const displayName = getEffectiveDisplayName(user, profile);
  const orbState: SacredOrbState = isSending
    ? 'thinking'
    : speakingMessageId
    ? 'speaking'
    : 'idle';
  const currentAvatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const canUseAssistant = (isConfigured && Boolean(user)) || hasDirectApiKey;

  const handleSelectQuickPrompt = (item: (typeof QUICK_PROMPTS)[number]) => {
    setMessages([
      {
        id: `guided-${Date.now()}`,
        role: 'assistant',
        content: item.guidance,
      },
    ]);
    setTimeout(() => {
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement | null;
      textarea?.focus();
    }, 120);
  };

  // Carregar lista de conversas ao iniciar ou trocar de utilizador
  const refreshConversations = async () => {
    if (!user) {
      setConversations([]);
      return;
    }
    try {
      const list = await getUserConversations();
      setConversations(list);
    } catch {
      // Ignorar falhas silenciosas
    }
  };

  useEffect(() => {
    void refreshConversations();
  }, [user?.id, isConfigured]);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isSending, errorMessage]);

  // Restaurar conversa ativa guardada
  useEffect(() => {
    const restoreConversation = async () => {
      if (!isConfigured || !user) return;
      const savedId = window.localStorage.getItem(ACTIVE_CONVERSATION_KEY);
      if (!savedId) return;
      setIsLoadingHistory(true);
      try {
        const history = await getAssistantHistory(savedId);
        if (!history.length) {
          window.localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
          return;
        }
        setConversationId(savedId);
        setMessages(
          history.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            references: message.references,
            interpretationNote: message.interpretationNote,
            safetyNote: message.safetyNote,
          }))
        );
      } catch {
        window.localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    void restoreConversation();
  }, [isConfigured, user?.id]);

  const startNewConversation = () => {
    setMessages([]);
    setConversationId('');
    setErrorMessage('');
    window.localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
    setIsSidebarOpen(false);
  };

  const selectConversation = async (convId: string) => {
    if (convId === conversationId) {
      setIsSidebarOpen(false);
      return;
    }
    setIsSidebarOpen(false);
    setIsLoadingHistory(true);
    setErrorMessage('');
    try {
      const history = await getAssistantHistory(convId);
      setConversationId(convId);
      window.localStorage.setItem(ACTIVE_CONVERSATION_KEY, convId);
      setMessages(
        history.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          references: message.references,
          interpretationNote: message.interpretationNote,
          safetyNote: message.safetyNote,
        }))
      );
    } catch (err) {
      const msg = err instanceof AssistantServiceError ? err.message : 'Não foi possível carregar a conversa.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDeleteConversation = async (convId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const confirmed = window.confirm('Deseja eliminar esta conversa do seu histórico?');
    if (!confirmed) return;

    const ok = await deleteAssistantConversation(convId);
    if (ok) {
      setConversations((current) => current.filter((c) => c.id !== convId));
      if (conversationId === convId) {
        startNewConversation();
      }
      showToast('Conversa removida do histórico.', 'delete');
    } else {
      showToast('Não foi possível remover a conversa.', 'error');
    }
  };

  const openReference = (reference: ScriptureReference) => {
    window.localStorage.setItem('biblia_pending_reference', JSON.stringify(reference));
    onNavigate('screen-biblia');
  };

  const listenToMessage = async (message: ChatMessage) => {
    if (speakingMessageId === message.id) {
      audioEngine.stop();
      setSpeakingMessageId(null);
      return;
    }
    setSpeakingMessageId(message.id);

    // Remove caracteres de formatação Markdown antes da síntese de voz para uma leitura humana e reverente
    const cleanSpeech = message.content
      .replace(/^#+\s+/gm, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^[-*]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      .replace(/^>\s+/gm, '')
      .trim();

    await audioEngine.speakText(cleanSpeech);
    setSpeakingMessageId((current) => (current === message.id ? null : current));
  };

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      showToast('Estudo bíblico copiado!', 'content_copy');
    } catch {
      showToast('Não foi possível copiar o texto.', 'warning');
    }
  };

  const handleShareMessage = async (content: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Estudo Bíblico — BiblIA',
          text: `${content}\n\n— BiblIA · Lâmpada para os meus pés`,
        });
        return;
      } catch {
        // segue para cópia em caso de cancelamento/erro
      }
    }
    void handleCopyMessage(content);
  };

  const handleSaveStudy = (message: ChatMessage) => {
    try {
      const savedKey = 'biblia_saved_studies_v1';
      const existing = JSON.parse(localStorage.getItem(savedKey) || '[]');
      const updated = [
        {
          id: `saved_${Date.now()}`,
          content: message.content,
          references: message.references,
          savedAt: new Date().toISOString(),
        },
        ...existing,
      ].slice(0, 50);
      localStorage.setItem(savedKey, JSON.stringify(updated));
      showToast('Estudo guardado com sucesso nos favoritos!', 'bookmark_added');
    } catch {
      showToast('Estudo guardado!', 'bookmark');
    }
  };

  const send = async (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question || isSending) return;
    setErrorMessage('');
    setLastUserQuestion(question);

    if (!isConfigured && !hasDirectApiKey) {
      setErrorMessage(
        'O Assistente Teológico necessita de uma chave Gemini. Clique no ícone de chave (🔑) no topo para colar a sua chave ou envie-a diretamente no chat do Antigravity.'
      );
      return;
    }
    if (!user && !hasDirectApiKey) {
      setErrorMessage('Entre na sua conta para iniciar uma conversa privada e manter o histórico protegido.');
      openAuthModal();
      return;
    }

    const optimisticMessage: ChatMessage = { id: `pending-${Date.now()}`, role: 'user', content: question };
    setMessages((current) => [...current, optimisticMessage]);
    setInput('');
    setIsSending(true);

    try {
      // Passa as mensagens anteriores para manter o fio da conversa e contexto
      const conversationHistory = messages.map((m) => ({ role: m.role, content: m.content }));
      const reply = await askAssistant(question, conversationId || undefined, conversationHistory, planTier);

      setConversationId(reply.conversationId);
      window.localStorage.setItem(ACTIVE_CONVERSATION_KEY, reply.conversationId);
      setRemainingToday(reply.usage.remainingToday);
      if (reply.usage.limit) setDailyLimit(reply.usage.limit);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: reply.answer,
          references: reply.references,
          suggestedQuestions: reply.suggestedQuestions,
          interpretationNote: reply.interpretationNote,
          safetyNote: reply.safetyNote,
        },
      ]);
      void refreshConversations();
    } catch (error) {
      const message =
        error instanceof AssistantServiceError
          ? error.message
          : 'Não foi possível consultar o Assistente agora. O seu texto continua visível para tentar de novo.';
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Processa pergunta pendente enviada da Home Screen
  useEffect(() => {
    const pending = sessionStorage.getItem('biblia_ai_pending_prompt');
    if (pending && pending.trim()) {
      sessionStorage.removeItem('biblia_ai_pending_prompt');
      void send(pending.trim());
    }
  }, []);

  const handleRetry = async (questionToRetry?: string) => {
    const target = (questionToRetry || lastUserQuestion).trim();
    if (!target || isSending) return;
    setErrorMessage('');

    // Remove a última mensagem pendente do utilizador se for repetição para evitar duplicar
    setMessages((current) => {
      if (current.length > 0 && current[current.length - 1].role === 'user') {
        return current.slice(0, -1);
      }
      return current;
    });

    await send(target);
  };

  const handleStartEdit = (message: ChatMessage) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleSaveAndResend = async (targetId: string) => {
    const clean = editingContent.trim();
    if (!clean || isSending) return;

    // Trunca as mensagens a partir desta mensagem (inclusive) para reconstruir o diálogo
    const idx = messages.findIndex((m) => m.id === targetId);
    if (idx !== -1) {
      setMessages((current) => current.slice(0, idx));
    }
    setEditingMessageId(null);
    setEditingContent('');
    setErrorMessage('');
    await send(clean);
  };

  // Processa pergunta imediata pendente (vinda da Home ou do Leitor Bíblico)
  useEffect(() => {
    if (!user || !isConfigured || isSending) return;
    const pending = sessionStorage.getItem('biblia_ai_pending_prompt');
    if (pending) {
      sessionStorage.removeItem('biblia_ai_pending_prompt');
      const timer = setTimeout(() => {
        void send(pending);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [user?.id, isConfigured]);

  const composer = (
    <form
      className="flex items-end gap-2 rounded-[24px] border border-slate-200 bg-white p-2 shadow-lg shadow-slate-900/5 dark:border-white/10 dark:bg-[#171725] dark:shadow-black/20"
      onSubmit={(event) => {
        event.preventDefault();
        void send(input);
      }}
    >
      <textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void send(input);
          }
        }}
        rows={1}
        maxLength={1500}
        placeholder="Pergunte sobre as Escrituras..."
        aria-label="Pergunta para o Assistente Teológico"
        className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm leading-5 text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
      />
      <button
        type="submit"
        disabled={!input.trim() || isSending}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sacred-brand text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-sacred-neon dark:text-slate-950"
        title="Enviar pergunta"
      >
        <span className="material-symbols-outlined text-xl">arrow_upward</span>
      </button>
    </form>
  );

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f8fafb] text-slate-900 transition-colors dark:bg-[#09090f] dark:text-slate-50">
      {/* ─── SIDEBAR / MENU ESTILO CHATGPT ─── */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:border-white/10 dark:bg-[#0c1816] ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Topo da Sidebar */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-white/10 dark:bg-[#081413]/70">
          <button
            onClick={startNewConversation}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sacred-brand/10 px-3 py-2.5 text-xs font-bold text-sacred-brand transition hover:bg-sacred-brand hover:text-white dark:bg-sacred-neon/15 dark:text-sacred-neon dark:hover:bg-sacred-neon dark:hover:text-slate-950"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Nova Conversa
          </button>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="ml-2 flex size-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white"
            title="Fechar menu"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Histórico de Conversas */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Histórico de Estudos
          </p>

          {conversations.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-slate-400">
              <span className="material-symbols-outlined mb-2 block text-2xl text-slate-300 dark:text-slate-600">
                chat_bubble_outline
              </span>
              Nenhuma conversa gravada ainda. Inicie um estudo bíblico!
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => {
                const isActive = conv.id === conversationId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => void selectConversation(conv.id)}
                    className={`group flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs transition ${
                      isActive
                        ? 'bg-sacred-light font-bold text-sacred-brand dark:bg-sacred-neon/15 dark:text-sacred-neon'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="material-symbols-outlined shrink-0 text-sm opacity-60">
                        {isActive ? 'chat' : 'notes'}
                      </span>
                      <div className="min-w-0 flex-1 truncate">
                        <p className="truncate font-medium">{conv.title}</p>
                        <span className="text-[10px] opacity-50">{formatRelativeDate(conv.updatedAt)}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => void handleDeleteConversation(conv.id, e)}
                      className="ml-1 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                      title="Eliminar conversa"
                    >
                      <span className="material-symbols-outlined text-sm">delete_outline</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé da Sidebar: Quota & Atalhos Úteis */}
        <div className="border-t border-slate-100 p-3 dark:border-white/10 dark:bg-[#081413]/60">
          <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-[#122320] border border-slate-200/60 dark:border-white/10">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-500 dark:text-slate-400">Plano {planName}</span>
              <span className="text-sacred-brand dark:text-sacred-neon">
                {dailyLimit} consultas/dia
              </span>
            </div>
            {remainingToday !== null && (
              <p className="mt-1 text-[10px] text-slate-400">
                Restam <strong className="text-slate-700 dark:text-slate-200">{remainingToday}</strong> perguntas hoje
              </p>
            )}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5 pt-1">
            <button
              onClick={() => {
                setIsSidebarOpen(false);
                void send('Explique o contexto histórico e teológico do capítulo de hoje.');
              }}
              className="rounded-lg border border-slate-200 bg-white p-2 text-left text-[11px] font-medium transition hover:border-sacred-brand dark:border-white/10 dark:bg-[#122320] dark:text-slate-200 dark:hover:border-sacred-neon"
            >
              📖 Contexto
            </button>
            <button
              onClick={() => {
                setIsSidebarOpen(false);
                void send('Escreva uma reflexão devocional prática com base nesta passagem.');
              }}
              className="rounded-lg border border-slate-200 bg-white p-2 text-left text-[11px] font-medium transition hover:border-sacred-brand dark:border-white/10 dark:bg-[#122320] dark:text-slate-200 dark:hover:border-sacred-neon"
            >
              🙏 Devocional
            </button>
          </div>

          {/* Cartão do Utilizador (Estilo ChatGPT) */}
          <div
            onClick={() => onNavigate('screen-profile')}
            className="mt-2.5 flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-2 transition hover:bg-slate-100 dark:border-white/10 dark:bg-[#122320] dark:hover:bg-slate-800/80"
            title="Ver o meu perfil"
          >
            <UserAvatar avatarUrl={currentAvatarUrl} displayName={displayName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">{displayName}</p>
              <p className="truncate text-[10px] text-slate-400">{user?.email || 'Visitante'}</p>
            </div>
            <span className="material-symbols-outlined text-sm text-slate-400">chevron_right</span>
          </div>
        </div>
      </aside>

      {/* ─── CABEÇALHO DO CHAT ─── */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-3 py-2.5 backdrop-blur dark:border-white/10 dark:bg-[#09090f]/90">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onNavigate('screen-home')}
            className="flex size-9 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/10"
            title="Voltar ao início"
          >
            <span className="material-symbols-outlined text-lg">arrow_back_ios_new</span>
          </button>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="relative flex size-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/10"
            title="Histórico de conversas (Estilo ChatGPT)"
          >
            <span className="material-symbols-outlined text-xl">menu</span>
            {conversations.length > 0 && (
              <span className="absolute right-1 top-1 size-2 rounded-full bg-sacred-brand dark:bg-sacred-neon" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <SacredOrb state={orbState} size={28} />
          <h1 className="text-xs font-extrabold tracking-tight">Assistente BiblIA</h1>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowApiKeyModal(true)}
            className={`flex size-9 items-center justify-center rounded-full transition-colors ${
              hasDirectApiKey
                ? 'text-sacred-brand dark:text-sacred-neon hover:bg-sacred-brand/10'
                : 'text-amber-500 hover:bg-amber-500/10'
            }`}
            title="Configurar chave de API Gemini"
          >
            <span className="material-symbols-outlined text-lg">key</span>
          </button>
          <button
            onClick={startNewConversation}
            className="flex size-9 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/10"
            title="Nova conversa"
          >
            <span className="material-symbols-outlined text-xl">add</span>
          </button>
        </div>
      </header>

      {/* ─── CORPO DA CONVERSA ─── */}
      {messages.length === 0 && !isLoadingHistory ? (
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-5 pt-6">
          <section className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center text-center">
            <div data-tutorial="ai-sacred-orb" className="relative mb-4 flex items-center justify-center">
              <SacredOrb state={orbState} size={140} />
            </div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-sacred-brand dark:text-sacred-neon">
              Estudo com reverência
            </p>
            <h2 className="max-w-xs font-serif text-2xl font-semibold leading-tight tracking-tight text-slate-900 dark:text-white">
              Olá, {firstName}. Em que texto bíblico vamos meditar hoje?
            </h2>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Uma conversa bíblica, cristocêntrica e interdenominacional — com a Escritura sempre no centro.
            </p>
            <div data-tutorial="ai-study-modes" className="mt-6 grid w-full max-w-sm grid-cols-2 gap-2 text-left">
              {QUICK_PROMPTS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleSelectQuickPrompt(item)}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sacred-brand dark:border-white/10 dark:bg-[#171725] dark:hover:border-sacred-neon group active:scale-95"
                >
                  <span className="material-symbols-outlined mb-2 block text-lg text-sacred-brand dark:text-sacred-neon group-hover:scale-110 transition-transform">
                    {item.icon}
                  </span>
                  <span className="block text-[11px] font-bold leading-snug">{item.label}</span>
                </button>
              ))}
            </div>
          </section>
          <p className="mx-auto mt-4 max-w-md text-center text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
            O Assistente apoia estudos bíblicos; não substitui a Escritura, a comunhão eclesiástica ou apoio profissional.
          </p>
        </main>
      ) : (
        <main className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mx-auto w-full max-w-md space-y-3.5">
            {isLoadingHistory && (
              <p className="py-8 text-center text-xs text-slate-500">A carregar o seu estudo bíblico…</p>
            )}
            {messages.map((message) => (
              <article
                key={message.id}
                className={`flex items-end gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="mb-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-sacred-brand/15 text-sacred-brand dark:bg-sacred-neon/20 dark:text-sacred-neon">
                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                  </div>
                )}
                {message.role === 'user' ? (
                  editingMessageId === message.id ? (
                    <div className="w-full max-w-[85%] rounded-2xl bg-sacred-brand/10 dark:bg-sacred-neon/15 border border-sacred-brand/30 dark:border-sacred-neon/30 p-3 space-y-2 text-left">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        <span>Editar pergunta</span>
                      </div>
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        rows={2}
                        className="w-full resize-none rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] p-2 text-xs text-slate-900 dark:text-white outline-none focus:border-sacred-brand dark:focus:border-sacred-neon"
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSaveAndResend(message.id)}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-sacred-brand text-white dark:bg-sacred-neon dark:text-slate-950 text-[11px] font-extrabold hover:brightness-110 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-xs">replay</span>
                          <span>Salvar & Reenviar</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="group relative max-w-[85%] flex flex-col items-end">
                      <div className="rounded-2xl rounded-br-sm bg-sacred-brand text-white shadow-sm dark:bg-sacred-neon dark:text-slate-950 px-3.5 py-3 text-xs leading-relaxed text-left">
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>

                      {/* Botões de Ação: Editar e Reenviar (Seta) */}
                      <div className="flex items-center gap-2 mt-1 mr-1">
                        <button
                          onClick={() => handleStartEdit(message)}
                          className="flex items-center gap-0.5 text-[10px] text-slate-400 hover:text-sacred-brand dark:hover:text-sacred-neon transition-colors font-medium opacity-80 hover:opacity-100"
                          title="Editar mensagem e reenviar"
                        >
                          <span className="material-symbols-outlined text-[13px]">edit</span>
                          <span>Editar</span>
                        </button>

                        <button
                          onClick={() => void handleRetry(message.content)}
                          disabled={isSending}
                          className="flex items-center gap-0.5 text-[10px] text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors font-medium opacity-80 hover:opacity-100"
                          title="Reenviar esta pergunta"
                        >
                          <span className="material-symbols-outlined text-[13px]">replay</span>
                          <span>Reenviar</span>
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="max-w-[88%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#171725] p-4 text-xs leading-relaxed text-left space-y-3">
                    {/* Renderizador de Markdown Teológico Rico & Escrituras Clicáveis */}
                    <TheologicalMarkdown content={message.content} onOpenReference={openReference} />

                    {message.interpretationNote && (
                      <p className="border-l-2 border-gold-radiant pl-2.5 text-[11px] italic text-slate-600 dark:text-slate-300">
                        {message.interpretationNote}
                      </p>
                    )}
                    {message.safetyNote && (
                      <p className="rounded-lg bg-amber-500/10 p-2 text-[11px] text-amber-800 dark:text-amber-200">
                        {message.safetyNote}
                      </p>
                    )}

                    {/* Referências Bíblicas Clicáveis da Resposta */}
                    {message.references && message.references.length > 0 && (
                      <div className="pt-2.5 border-t border-slate-100 dark:border-white/10">
                        <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                          <span className="material-symbols-outlined text-[13px] text-sacred-brand dark:text-sacred-neon">menu_book</span>
                          <span>Passagens Citadas</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {message.references.map((reference) => (
                            <button
                              key={`${reference.book}-${reference.chapter}-${reference.label}`}
                              onClick={() => openReference(reference)}
                              className="inline-flex items-center gap-1 rounded-lg bg-sacred-brand/10 dark:bg-sacred-neon/15 px-2.5 py-1 text-[11px] font-bold text-sacred-brand dark:text-sacred-neon hover:bg-sacred-brand/20 transition-colors"
                              title={`Abrir ${reference.label} no leitor bíblico`}
                            >
                              <span className="material-symbols-outlined text-xs">auto_stories</span>
                              <span>{reference.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Barra de Ações: Ouvir, Copiar, Partilhar, Guardar */}
                    <div className="pt-2.5 border-t border-slate-100 dark:border-white/10 flex flex-wrap items-center gap-3 text-slate-400 dark:text-slate-500">
                      <button
                        onClick={() => void listenToMessage(message)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-sacred-brand dark:text-sacred-neon hover:underline"
                        title="Ouvir resposta em voz alta"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {speakingMessageId === message.id ? 'stop_circle' : 'volume_up'}
                        </span>
                        <span>{speakingMessageId === message.id ? 'Parar' : 'Ouvir resposta'}</span>
                      </button>

                      <button
                        onClick={() => void handleCopyMessage(message.content)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        title="Copiar texto da resposta"
                      >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                        <span>Copiar</span>
                      </button>

                      <button
                        onClick={() => void handleShareMessage(message.content)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        title="Partilhar este estudo"
                      >
                        <span className="material-symbols-outlined text-sm">share</span>
                        <span>Partilhar</span>
                      </button>

                      <button
                        onClick={() => handleSaveStudy(message)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium hover:text-slate-700 dark:hover:text-slate-200 transition-colors ml-auto"
                        title="Guardar estudo bíblico"
                      >
                        <span className="material-symbols-outlined text-sm">bookmark</span>
                        <span>Guardar</span>
                      </button>
                    </div>

                    {/* Queres aprofundar este assunto? (Sugestões Interactivas de Continuação) */}
                    {message.suggestedQuestions && message.suggestedQuestions.length > 0 && (
                      <div className="pt-3 border-t border-slate-100 dark:border-white/10 space-y-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          <span className="material-symbols-outlined text-xs text-sacred-brand dark:text-sacred-neon">
                            psychology_alt
                          </span>
                          <span>Queres aprofundar este assunto?</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {message.suggestedQuestions.map((q, qIdx) => (
                            <button
                              key={qIdx}
                              onClick={() => void send(q)}
                              className="w-full text-left text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-sacred-brand dark:hover:border-sacred-neon hover:bg-sacred-brand/5 dark:hover:bg-sacred-neon/10 transition-all flex items-center justify-between group active:scale-[0.99]"
                            >
                              <span className="font-medium">{q}</span>
                              <span className="material-symbols-outlined text-xs text-slate-400 group-hover:text-sacred-brand dark:group-hover:text-sacred-neon group-hover:translate-x-0.5 transition-transform">
                                arrow_forward
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {message.role === 'user' && (
                  <div className="mb-1 shrink-0">
                    <UserAvatar avatarUrl={currentAvatarUrl} displayName={displayName} size="xs" />
                  </div>
                )}
              </article>
            ))}
            {isSending && (
              <div className="flex items-center gap-2 px-2 py-2 text-xs font-medium text-slate-500">
                <span className="inline-flex gap-1">
                  <i className="size-1.5 animate-bounce rounded-full bg-sacred-brand" />
                  <i className="size-1.5 animate-bounce rounded-full bg-sacred-brand [animation-delay:150ms]" />
                  <i className="size-1.5 animate-bounce rounded-full bg-sacred-brand [animation-delay:300ms]" />
                </span>
                A consultar com cuidado nas Escrituras…
              </div>
            )}
            <div ref={scrollAnchorRef} />
          </div>
        </main>
      )}

      {/* ─── CAMPO DE ENTRADA / COMPOSER ─── */}
      <div className="shrink-0 border-t border-slate-200 bg-white/95 px-4 pb-3 pt-2 backdrop-blur dark:border-white/10 dark:bg-[#09090f]/95">
        <div className="mx-auto w-full max-w-md">
          {errorMessage && (
            <div className="mb-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs leading-relaxed text-amber-800 dark:text-amber-200 flex items-center justify-between gap-3 text-left animate-fade-in">
              <div className="flex items-start gap-2 min-w-0">
                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-base shrink-0 mt-0.5">
                  error
                </span>
                <p className="min-w-0 break-words text-[11px] font-medium leading-normal">
                  {errorMessage}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleRetry()}
                disabled={isSending}
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[11px] shadow-sm transition-all active:scale-95"
                title="Reenviar pergunta agora"
              >
                <span className="material-symbols-outlined text-sm">replay</span>
                <span>Reenviar</span>
              </button>
            </div>
          )}
          {remainingToday !== null && (
            <p
              data-tutorial="ai-quota-badge"
              className="mb-1.5 px-1 text-right text-[10px] font-semibold text-slate-500 dark:text-slate-400"
            >
              {remainingToday} de {dailyLimit} perguntas restantes hoje
            </p>
          )}
          {!loading && !canUseAssistant && (
            <p className="mb-1.5 px-1 text-center text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              {isConfigured ? 'Inicie sessão para guardar o histórico das suas conversas.' : 'Serviço teológico seguro em configuração.'}
            </p>
          )}
          {composer}
        </div>
      </div>

      {/* ─── MODAL DE CONFIGURAÇÃO DA CHAVE API GEMINI ─── */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in text-left">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#12121a] p-5 shadow-2xl border border-slate-200 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sacred-brand dark:text-sacred-neon text-xl">
                  key
                </span>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Chave de API do Gemini
                </h3>
              </div>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="size-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Para o Assistente Teológico responder diretamente com o modelo <strong>Gemini 2.0 Flash</strong>, cole a sua chave abaixo.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Google Gemini API Key
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-sacred-brand dark:focus:border-sacred-neon font-mono"
              />
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-3 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                💬 Dica Simples:
              </p>
              <p>
                Você também pode simplesmente <strong>enviar a sua chave no chat do Antigravity</strong> que nós configuramos automaticamente no projeto!
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {apiKeyInput && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomGeminiApiKey('');
                    setApiKeyInput('');
                    showToast('Chave de API removida.');
                  }}
                  className="flex-1 py-2 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  Remover
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const clean = apiKeyInput.trim();
                  setCustomGeminiApiKey(clean);
                  setShowApiKeyModal(false);
                  if (clean) {
                    showToast('Chave de API salva com sucesso!', 'check_circle');
                  }
                }}
                className="flex-1 btn-duo-primary dark:btn-duo-primary-dark py-2 text-xs font-extrabold"
              >
                Salvar Chave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Guiado da IA Assistente (Spotlight) */}
      <TutorialSpotlight
        steps={TUTORIAL_STEPS.ai}
        isActive={showAiTutorial}
        onComplete={() => {
          markTutorialCompleted('ai', user?.id);
          setShowAiTutorial(false);
        }}
        onSkip={() => {
          markTutorialCompleted('ai', user?.id);
          setShowAiTutorial(false);
        }}
      />
    </div>
  );
};
