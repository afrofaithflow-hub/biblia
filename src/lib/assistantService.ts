import { isSupabaseConfigured, supabase } from './supabaseClient';
import { resolveAssistantReferences } from './assistantReferenceResolver';
import { getLastRead } from './bibleStorage';

export type AssistantKind = 'study' | 'devotional' | 'prayer' | 'clarification';

export interface ScriptureReference {
  book: string;
  chapter: number;
  verses: number[];
  label: string;
}

export interface AssistantReply {
  answer: string;
  kind: AssistantKind;
  references: ScriptureReference[];
  interpretationNote?: string;
  safetyNote?: string;
  conversationId: string;
  usage: { remainingToday: number; limit?: number };
}

export interface AssistantHistoryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  kind?: AssistantKind;
  references: ScriptureReference[];
  interpretationNote?: string;
  safetyNote?: string;
  createdAt: string;
}

interface ReadingContext {
  book: string;
  chapter: number;
  verse: number;
}

export class AssistantServiceError extends Error {
  constructor(
    message: string,
    public readonly code: 'not_configured' | 'unauthenticated' | 'quota' | 'unavailable' | 'network' | 'invalid_response' = 'network'
  ) {
    super(message);
  }
}

const asReferences = (value: unknown): ScriptureReference[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ScriptureReference => {
    if (!item || typeof item !== 'object') return false;
    const reference = item as Partial<ScriptureReference>;
    return typeof reference.book === 'string'
      && Number.isInteger(reference.chapter)
      && Array.isArray(reference.verses)
      && typeof reference.label === 'string';
  });
};

export async function askAssistant(question: string, conversationId?: string): Promise<AssistantReply> {
  if (!isSupabaseConfigured) {
    throw new AssistantServiceError('O Assistente Teológico estará disponível assim que o serviço seguro for configurado.', 'not_configured');
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new AssistantServiceError('Entre na sua conta para conversar com o Assistente Teológico.', 'unauthenticated');
  }

  const lastRead = getLastRead();
  const readingContext: ReadingContext | undefined = lastRead.book && Number.isInteger(lastRead.chapter) && Number.isInteger(lastRead.verse)
    ? { book: lastRead.book, chapter: lastRead.chapter, verse: lastRead.verse }
    : undefined;
  const functionName = (import.meta.env.VITE_ASSISTANT_FUNCTION_NAME as string) || 'bright-processor';
  const { data, error } = await supabase.functions.invoke<AssistantReply>(functionName, {
    body: { question, conversationId, readingContext },
  });

  if (error) {
    const message = error.message || 'Não foi possível consultar o Assistente agora.';
    if (/quota|limite/i.test(message)) throw new AssistantServiceError(message, 'quota');
    if (/configur|indispon/i.test(message)) throw new AssistantServiceError(message, 'unavailable');
    throw new AssistantServiceError(message, 'network');
  }

  if (!data || typeof data.answer !== 'string' || typeof data.conversationId !== 'string') {
    throw new AssistantServiceError('A resposta recebida não está no formato esperado.', 'invalid_response');
  }

  return { ...data, references: await resolveAssistantReferences(asReferences(data.references)) };
}

export async function getAssistantHistory(conversationId: string): Promise<AssistantHistoryMessage[]> {
  if (!isSupabaseConfigured || !conversationId) return [];
  const { data, error } = await supabase
    .from('ai_messages')
    .select('id, role, content, kind, references, interpretation_note, safety_note, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw new AssistantServiceError('Não foi possível recuperar esta conversa.', 'network');
  return Promise.all((data || []).map(async (message) => ({
    id: message.id,
    role: message.role as 'user' | 'assistant',
    content: message.content,
    kind: message.kind as AssistantKind | undefined,
    references: await resolveAssistantReferences(asReferences(message.references)),
    interpretationNote: message.interpretation_note || undefined,
    safetyNote: message.safety_note || undefined,
    createdAt: message.created_at,
  })));
}
