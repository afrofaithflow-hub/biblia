import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { audioEngine } from '../../lib/audioEngine';
import {
  askAssistant,
  AssistantServiceError,
  getAssistantHistory,
  ScriptureReference,
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
  interpretationNote?: string;
  safetyNote?: string;
}

const ACTIVE_CONVERSATION_KEY = 'biblia_ai_active_conversation';

const QUICK_PROMPTS = [
  { icon: 'menu_book', label: 'Explicar uma passagem', prompt: 'Explique Salmos 23 com contexto bíblico e aplicação prática.' },
  { icon: 'history_edu', label: 'Contexto histórico', prompt: 'Qual é o contexto histórico de Filipenses 4?' },
  { icon: 'compare_arrows', label: 'Comparar textos', prompt: 'Compare João 15:1-8 com Gálatas 5:22-23.' },
  { icon: 'volunteer_activism', label: 'Oração breve', prompt: 'Escreva uma oração bíblica breve para um momento de ansiedade.' },
];

export const AIAssistant: React.FC<AIAssistantProps> = ({ onNavigate, showToast }) => {
  const { user, isConfigured, loading, openAuthModal } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState('');
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [remainingToday, setRemainingToday] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  const name = String(user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Discípulo');
  const canUseAssistant = isConfigured && Boolean(user);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isSending, errorMessage]);

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
        setMessages(history.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          references: message.references,
          interpretationNote: message.interpretationNote,
          safetyNote: message.safetyNote,
        })));
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
    setRemainingToday(null);
    window.localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
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
    await audioEngine.speakText(message.content);
    setSpeakingMessageId((current) => current === message.id ? null : current);
  };

  const send = async (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question || isSending) return;
    setErrorMessage('');

    if (!isConfigured) {
      setErrorMessage('O Assistente Teológico será ativado quando a ligação segura ao servidor for configurada. Nenhuma resposta fictícia será exibida.');
      return;
    }
    if (!user) {
      setErrorMessage('Entre na sua conta para iniciar uma conversa privada e manter o histórico protegido.');
      openAuthModal();
      return;
    }

    const optimisticMessage: ChatMessage = { id: `pending-${Date.now()}`, role: 'user', content: question };
    setMessages((current) => [...current, optimisticMessage]);
    setInput('');
    setIsSending(true);

    try {
      const reply = await askAssistant(question, conversationId || undefined);
      setConversationId(reply.conversationId);
      window.localStorage.setItem(ACTIVE_CONVERSATION_KEY, reply.conversationId);
      setRemainingToday(reply.usage.remainingToday);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: reply.answer,
          references: reply.references,
          interpretationNote: reply.interpretationNote,
          safetyNote: reply.safetyNote,
        },
      ]);
    } catch (error) {
      const message = error instanceof AssistantServiceError
        ? error.message
        : 'Não foi possível consultar o Assistente agora. O seu texto continua visível para tentar de novo.';
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSending(false);
    }
  };

  const composer = (
    <form
      className="flex items-end gap-2 rounded-[24px] border border-slate-200 bg-white p-2 shadow-lg shadow-slate-900/5 dark:border-white/10 dark:bg-[#171725] dark:shadow-black/20"
      onSubmit={(event) => { event.preventDefault(); void send(input); }}
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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f8fafb] text-slate-900 transition-colors dark:bg-[#09090f] dark:text-slate-50">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-[#09090f]/90">
        <button onClick={() => onNavigate('screen-home')} className="flex size-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/10" title="Voltar ao início">
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-sacred-brand dark:text-sacred-neon">auto_awesome</span>
          <h1 className="text-sm font-extrabold tracking-tight">Assistente BiblIA</h1>
        </div>
        <button onClick={startNewConversation} className="flex size-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/10" title="Nova conversa">
          <span className="material-symbols-outlined">add</span>
        </button>
      </header>

      {messages.length === 0 && !isLoadingHistory ? (
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-5 pt-8">
          <section className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center text-center">
            <div className="relative mb-7 flex size-28 items-center justify-center rounded-full bg-gradient-to-br from-sacred-brand via-teal-500 to-gold-radiant shadow-[0_0_54px_rgba(45,122,124,0.35)] dark:from-sacred-neon dark:via-teal-400 dark:to-amber-300">
              <div className="absolute inset-2 rounded-full border border-white/45" />
              <span className="material-symbols-outlined relative text-4xl text-white dark:text-slate-950">auto_awesome</span>
            </div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-sacred-brand dark:text-sacred-neon">Estudo com cuidado</p>
            <h2 className="max-w-xs font-serif text-3xl font-semibold leading-tight tracking-tight text-slate-900 dark:text-white">Olá, {name}. Como posso ajudar no seu estudo?</h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">Uma conversa bíblica, cristocêntrica e respeitosa — sempre com a Escritura em primeiro lugar.</p>
            <div className="mt-8 grid w-full max-w-sm grid-cols-2 gap-2.5 text-left">
              {QUICK_PROMPTS.map((item) => (
                <button key={item.label} onClick={() => void send(item.prompt)} className="rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sacred-brand dark:border-white/10 dark:bg-[#171725] dark:hover:border-sacred-neon">
                  <span className="material-symbols-outlined mb-3 block text-xl text-sacred-brand dark:text-sacred-neon">{item.icon}</span>
                  <span className="block text-xs font-bold leading-snug">{item.label}</span>
                </button>
              ))}
            </div>
          </section>
          <p className="mx-auto mt-5 max-w-md text-center text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">O Assistente orienta estudos e orações; não substitui a Bíblia, a comunidade cristã ou apoio profissional em situações de emergência.</p>
        </main>
      ) : (
        <main className="flex-1 overflow-y-auto px-4 py-5">
          <div className="mx-auto w-full max-w-md space-y-4">
            {isLoadingHistory && <p className="py-8 text-center text-sm text-slate-500">A retomar a sua conversa privada…</p>}
            {messages.map((message) => (
              <article key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-3xl px-4 py-3.5 text-sm leading-relaxed ${message.role === 'user' ? 'rounded-br-md bg-sacred-brand text-white shadow-md dark:bg-sacred-neon dark:text-slate-950' : 'rounded-bl-md border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#171725]'}`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.interpretationNote && <p className="mt-3 border-l-2 border-gold-radiant pl-2.5 text-xs italic text-slate-600 dark:text-slate-300">{message.interpretationNote}</p>}
                  {message.safetyNote && <p className="mt-3 rounded-xl bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-200">{message.safetyNote}</p>}
                  {message.role === 'assistant' && (
                    <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2.5 dark:border-white/10">
                      <button onClick={() => void listenToMessage(message)} className="inline-flex items-center gap-1 text-xs font-bold text-sacred-brand dark:text-sacred-neon" title="Ouvir resposta com as suas preferências de áudio">
                        <span className="material-symbols-outlined text-base">{speakingMessageId === message.id ? 'stop_circle' : 'volume_up'}</span>
                        {speakingMessageId === message.id ? 'Parar' : 'Ouvir'}
                      </button>
                    </div>
                  )}
                  {message.references && message.references.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {message.references.map((reference) => <button key={`${reference.book}-${reference.chapter}-${reference.label}`} onClick={() => openReference(reference)} className="rounded-full bg-sacred-light px-2.5 py-1 text-[11px] font-bold text-sacred-brand hover:brightness-95 dark:bg-sacred-deep/70 dark:text-sacred-neon">{reference.label}</button>)}
                    </div>
                  )}
                </div>
              </article>
            ))}
            {isSending && <div className="flex items-center gap-2 px-2 py-3 text-xs font-medium text-slate-500"><span className="inline-flex gap-1"><i className="size-1.5 animate-bounce rounded-full bg-sacred-brand" /><i className="size-1.5 animate-bounce rounded-full bg-sacred-brand [animation-delay:150ms]" /><i className="size-1.5 animate-bounce rounded-full bg-sacred-brand [animation-delay:300ms]" /></span>A consultar com cuidado…</div>}
            <div ref={scrollAnchorRef} />
          </div>
        </main>
      )}

      <div className="shrink-0 border-t border-slate-200 bg-white/95 px-4 pb-3 pt-2 backdrop-blur dark:border-white/10 dark:bg-[#09090f]/95">
        <div className="mx-auto w-full max-w-md">
          {errorMessage && <p className="mb-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:text-amber-200">{errorMessage}</p>}
          {remainingToday !== null && <p className="mb-2 px-1 text-right text-[11px] font-semibold text-slate-500 dark:text-slate-400">{remainingToday} perguntas restantes hoje</p>}
          {!loading && !canUseAssistant && <p className="mb-2 px-1 text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400">{isConfigured ? 'Entre para usar conversas privadas.' : 'Serviço teológico seguro em configuração.'}</p>}
          {composer}
        </div>
      </div>
    </div>
  );
};
