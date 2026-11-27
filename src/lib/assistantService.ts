import { isSupabaseConfigured, supabase } from './supabaseClient';
import { resolveAssistantReferences } from './assistantReferenceResolver';
import { getLastRead } from './bibleStorage';
import { BIBLIA_THEOLOGICAL_SYSTEM_PROMPT } from './assistantSystemPrompt';
import {
  getDailyQuotaStatus,
  recordSuccessfulConsultation,
  getPlanDailyLimit,
} from './assistantQuotaService';

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
  suggestedQuestions?: string[];
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
  suggestedQuestions?: string[];
  interpretationNote?: string;
  safetyNote?: string;
  createdAt: string;
}

export interface AssistantConversation {
  id: string;
  title: string;
  contextReference?: ScriptureReference | null;
  createdAt: string;
  updatedAt: string;
}

interface ReadingContext {
  book: string;
  chapter: number;
  verse: number;
}

const CACHED_CONVERSATIONS_KEY = 'biblia_ai_cached_conversations';
export const CUSTOM_GEMINI_KEY_STORAGE = 'biblia_custom_gemini_api_key';

export function getEffectiveGeminiApiKey(): string {
  const envKey = (import.meta.env.VITE_GEMINI_API_KEY as string)?.trim();
  if (envKey) return envKey;
  try {
    return localStorage.getItem(CUSTOM_GEMINI_KEY_STORAGE)?.trim() || '';
  } catch {
    return '';
  }
}

export function setCustomGeminiApiKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(CUSTOM_GEMINI_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(CUSTOM_GEMINI_KEY_STORAGE);
    }
  } catch {
    // ignore
  }
}

export class AssistantServiceError extends Error {
  constructor(
    message: string,
    public readonly code: 'not_configured' | 'unauthenticated' | 'quota' | 'unavailable' | 'network' | 'invalid_response' = 'network',
    public readonly status?: number
  ) {
    super(message);
  }
}

const asReferences = (value: unknown): ScriptureReference[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ScriptureReference => {
    if (!item || typeof item !== 'object') return false;
    const reference = item as Partial<ScriptureReference>;
    return (
      typeof reference.book === 'string' &&
      Number.isInteger(reference.chapter) &&
      Array.isArray(reference.verses) &&
      typeof reference.label === 'string'
    );
  });
};

/**
 * Deteta estritamente se o erro recebido é HTTP 404 (Função inexistente / não publicada sob este nome).
 */
export function isFunctionNotFoundError(error: unknown): boolean {
  if (!error) return false;
  const status =
    (error as { context?: { status?: number } })?.context?.status ??
    (error as { status?: number })?.status;
  if (status === 404) return true;

  const msg = String((error as { message?: unknown })?.message || '').toLowerCase();
  return (
    msg.includes('404') ||
    msg.includes('function not found') ||
    msg.includes('functionshttp_404') ||
    msg.includes('not_found')
  );
}

/**
 * Extrai a mensagem real enviada pelo corpo JSON da Edge Function do Supabase.
 */
async function extractEdgeFunctionErrorMessage(error: any): Promise<{ message: string; status?: number }> {
  let message = error?.message || 'Não foi possível consultar o Assistente agora.';
  const status = error?.context?.status ?? error?.status;

  if (error?.context && typeof error.context.json === 'function') {
    try {
      const cloned = typeof error.context.clone === 'function' ? error.context.clone() : error.context;
      const body = await cloned.json();
      if (body?.error && typeof body.error === 'string') {
        message = body.error;
      } else if (body?.message && typeof body.message === 'string') {
        message = body.message;
      }
    } catch {
      try {
        const text = await error.context.text();
        if (text && text.length < 300) message = text;
      } catch {
        // silencioso
      }
    }
  }

  // Se o Supabase devolver apenas a mensagem genérica de SDK, traduz para o motivo real
  if (message.includes('non-2xx status code') || message.includes('FunctionsHttpError')) {
    if (status === 503 || status === 502) {
      message = 'O Assistente Teológico necessita da chave GEMINI_API_KEY ou OPENAI_API_KEY configurada nas variáveis do Supabase.';
    } else if (status === 429) {
      message = 'Atingiu o limite diário de consultas do seu plano. O limite renova à meia-noite (CAT).';
    } else if (status === 401) {
      message = 'Sessão expirada. Por favor autentique-se novamente.';
    } else {
      message = 'O serviço da Edge Function respondeu com erro temporário. Verifique os logs no Supabase.';
    }
  }

  return { message, status };
}

export function parseAssistantJsonResponse(rawText: string): {
  answer: string;
  kind: AssistantKind;
  references: ScriptureReference[];
  suggestedQuestions: string[];
  interpretationNote?: string;
  safetyNote?: string;
} {
  let cleaned = (rawText || '').trim();

  // 1. Remove cercas de código ```json ... ``` se existirem
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  let parsed: any = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // 2. Se falhar o parse completo (ex: JSON truncado), tenta extrair "answer" por regex resiliente
    try {
      const match = cleaned.match(/"answer"\s*:\s*"((?:\\.|[^"\\])*)/s);
      if (match && match[1]) {
        try {
          parsed = { answer: JSON.parse(`"${match[1]}"`) };
        } catch {
          parsed = { answer: match[1] };
        }
      }
    } catch {
      // continua para fallback
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    // 3. Fallback agressivo: remove marcas de JSON do início e fim
    let fallbackText = cleaned
      .replace(/^\s*\{?\s*"answer"\s*:\s*"?/i, '')
      .replace(/"\s*,?\s*"(?:references|kind|suggested_questions|suggestedQuestions|interpretationNote|safetyNote)[\s\S]*$/i, '')
      .replace(/"?\s*\}?\s*$/i, '');
    parsed = { answer: fallbackText };
  }

  // 4. Garante que `answer` é uma string limpa sem JSON e sem caracteres de escape literais
  let answerStr = typeof parsed.answer === 'string' ? parsed.answer.trim() : String(parsed.answer || cleaned).trim();

  // Limpa prefixos acidentais
  if (answerStr.startsWith('{"answer":')) {
    answerStr = answerStr.replace(/^\{"answer":\s*"?/i, '').replace(/"?\s*\}$/i, '');
  }

  // Desescapa quebras de linha literais (\n -> quebra de linha real)
  if (answerStr.includes('\\n')) {
    answerStr = answerStr.replace(/\\n/g, '\n');
  }
  if (answerStr.includes('\\"')) {
    answerStr = answerStr.replace(/\\"/g, '"');
  }
  if (answerStr.includes('\\t')) {
    answerStr = answerStr.replace(/\\t/g, '\t');
  }

  // 5. Perguntas sugeridas para continuar a conversa
  const suggested: string[] = [];
  const rawSuggestions = parsed.suggested_questions || parsed.suggestedQuestions;
  if (Array.isArray(rawSuggestions)) {
    for (const item of rawSuggestions) {
      if (typeof item === 'string' && item.trim()) {
        suggested.push(item.trim());
      }
    }
  }

  return {
    answer: answerStr,
    kind: typeof parsed.kind === 'string' ? (parsed.kind as AssistantKind) : 'study',
    references: Array.isArray(parsed.references) ? parsed.references : [],
    suggestedQuestions: suggested,
    interpretationNote: typeof parsed.interpretationNote === 'string' ? parsed.interpretationNote : undefined,
    safetyNote: typeof parsed.safetyNote === 'string' ? parsed.safetyNote : undefined,
  };
}

async function callDirectGemini(
  apiKey: string,
  question: string,
  readingContext?: ReadingContext,
  conversationId?: string,
  history?: { role: 'user' | 'assistant'; content: string }[],
  userId?: string | null,
  planTier: number = 0
): Promise<AssistantReply> {
  const contextualQuestion = readingContext
    ? `${question}\n\nA pessoa estava a ler ${readingContext.book} ${readingContext.chapter}:${readingContext.verse}. Use essa referência apenas como ponto de partida; não atribua a ela palavras que não tenha certeza de que constam no texto.`
    : question;

  const systemPrompt = BIBLIA_THEOLOGICAL_SYSTEM_PROMPT;

  const configuredModel = (import.meta.env.VITE_GEMINI_MODEL as string)?.trim();
  const CANDIDATE_MODELS = [
    configuredModel,
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-flash-latest',
  ].filter(Boolean) as string[];

  const uniqueModels = Array.from(new Set(CANDIDATE_MODELS));

  let lastErrorDetail = 'Erro ao consultar a API do Gemini.';
  let lastStatus = 500;

  // Monta histórico de turnos anteriores (até 6 mensagens) para manter o contexto
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
  if (history && history.length > 0) {
    for (const h of history.slice(-6)) {
      contents.push({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
      });
    }
  }

  // Turno atual com instrução do sistema
  contents.push({
    role: 'user',
    parts: [{ text: `${systemPrompt}\n\nPergunta do utilizador: ${contextualQuestion}` }],
  });

  for (const model of uniqueModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.3,
            maxOutputTokens: 2500,
          },
          contents,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        lastStatus = response.status;
        try {
          const errJson = JSON.parse(errorText);
          if (errJson?.error?.message) {
            lastErrorDetail = errJson.error.message;
          }
        } catch {
          lastErrorDetail = errorText;
        }

        const isUnavailable =
          lastErrorDetail.toLowerCase().includes('no longer available') ||
          lastErrorDetail.toLowerCase().includes('not found') ||
          lastErrorDetail.toLowerCase().includes('is not supported') ||
          lastErrorDetail.toLowerCase().includes('high demand') ||
          response.status === 404 ||
          response.status === 503;

        if (isUnavailable) {
          console.warn(`[assistantService] Modelo ${model} indisponível. Tentando próximo modelo...`);
          continue;
        }

        throw new AssistantServiceError(
          `Falha na API Gemini: ${lastErrorDetail}`,
          'unavailable',
          response.status
        );
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = parseAssistantJsonResponse(rawText);

      const convId = conversationId || `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      // Persistência no Supabase se autenticado
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          const userId = sessionData.session.user.id;
          await supabase.from('ai_conversations').upsert(
            {
              id: convId,
              user_id: userId,
              title: question.slice(0, 40),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );

          await supabase.from('ai_messages').insert([
            { conversation_id: convId, user_id: userId, role: 'user', content: question },
            {
              conversation_id: convId,
              user_id: userId,
              role: 'assistant',
              content: parsed.answer,
              kind: parsed.kind || 'study',
              references: parsed.references || [],
              interpretation_note: parsed.interpretationNote || null,
              safety_note: parsed.safetyNote || null,
            },
          ]);
        }
      } catch {
        // Falha não-fatal de persistência remota
      }

      const updatedQuota = recordSuccessfulConsultation(userId, planTier);

      return {
        answer: parsed.answer,
        kind: parsed.kind || 'study',
        references: await resolveAssistantReferences(asReferences(parsed.references)),
        suggestedQuestions: parsed.suggestedQuestions,
        interpretationNote: parsed.interpretationNote,
        safetyNote: parsed.safetyNote,
        conversationId: convId,
        usage: {
          remainingToday: updatedQuota.remainingToday,
          limit: updatedQuota.limit,
        },
      };
    } catch (err) {
      if (err instanceof AssistantServiceError) throw err;
      lastErrorDetail = err instanceof Error ? err.message : String(err);
    }
  }

  throw new AssistantServiceError(
    `Falha na API Gemini: ${lastErrorDetail}`,
    'unavailable',
    lastStatus
  );
}

export async function askAssistant(
  question: string,
  conversationId?: string,
  history?: { role: 'user' | 'assistant'; content: string }[],
  planTier: number = 0
): Promise<AssistantReply> {
  const directApiKey = getEffectiveGeminiApiKey();

  if (!isSupabaseConfigured && !directApiKey) {
    throw new AssistantServiceError(
      'O Assistente Teológico estará disponível assim que o serviço seguro ou uma chave Gemini for configurada.',
      'not_configured'
    );
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;

  if (!sessionData?.session && !directApiKey) {
    throw new AssistantServiceError(
      'Entre na sua conta para conversar com o Assistente Teológico.',
      'unauthenticated'
    );
  }

  // Validação real de Quota Diária antes da consulta
  const quota = getDailyQuotaStatus(userId, planTier);
  if (quota.remainingToday <= 0) {
    const planName = planTier >= 2 ? 'MASTER' : planTier === 1 ? 'PRO' : 'FREE';
    throw new AssistantServiceError(
      `Atingiu o limite diário de consultas do seu Plano ${planName} (${quota.limit}/${quota.limit}). O limite renova à meia-noite (CAT) ou pode fazer upgrade do plano.`,
      'quota',
      429
    );
  }

  const lastRead = getLastRead();
  const readingContext: ReadingContext | undefined =
    lastRead.book && Number.isInteger(lastRead.chapter) && Number.isInteger(lastRead.verse)
      ? { book: lastRead.book, chapter: lastRead.chapter, verse: lastRead.verse }
      : undefined;

  // 1. Se temos chave direta do Gemini configurada, utiliza-a diretamente com máxima performance
  if (directApiKey) {
    return await callDirectGemini(directApiKey, question, readingContext, conversationId, history, userId, planTier);
  }

  // Nomes canónicos com fallback estrito apenas sob 404
  const envName = (import.meta.env.VITE_ASSISTANT_FUNCTION_NAME as string)?.trim();
  const primaryFunctionName = envName || 'theological-assistant';
  const secondaryFunctionName =
    primaryFunctionName === 'theological-assistant' ? 'bright-processor' : 'theological-assistant';

  let responseData: AssistantReply | null = null;
  let responseError: any = null;

  // 1. Primeira tentativa na função primária
  try {
    const res = await supabase.functions.invoke<AssistantReply>(primaryFunctionName, {
      body: { question, conversationId, readingContext },
    });
    responseData = res.data;
    responseError = res.error;
  } catch (err) {
    responseError = err;
  }

  // 2. Fallback estrito: APENAS se for comprovadamente erro 404 (função não encontrada)
  if (responseError && isFunctionNotFoundError(responseError)) {
    console.info(
      `[assistantService] Função "${primaryFunctionName}" retornou 404. Tentando alternativa canónica "${secondaryFunctionName}"...`
    );
    try {
      const fallbackRes = await supabase.functions.invoke<AssistantReply>(secondaryFunctionName, {
        body: { question, conversationId, readingContext },
      });
      responseData = fallbackRes.data;
      responseError = fallbackRes.error;
    } catch (fallbackErr) {
      responseError = fallbackErr;
    }
  }

  // 3. Fallback Direto para Gemini se houver erro da Edge Function e possuirmos chave configurada
  if (responseError && directApiKey) {
    console.info('[assistantService] Edge Function falhou ou indisponível. Utilizando chave direta do Gemini...');
    try {
      return await callDirectGemini(directApiKey, question, readingContext, conversationId, history, userId, planTier);
    } catch (directErr) {
      if (directErr instanceof AssistantServiceError) throw directErr;
      // segue para tratamento determinístico original
    }
  }

  // 4. Tratamento determinístico de erros
  if (responseError) {
    const { message, status } = await extractEdgeFunctionErrorMessage(responseError);

    if (status === 429 || /quota|limite/i.test(message)) {
      throw new AssistantServiceError(
        message || 'Atingiu o limite diário de perguntas do seu plano. O limite renova à meia-noite (CAT).',
        'quota',
        429
      );
    }
    if (status === 401 || status === 403 || /autentic|sessão|token/i.test(message)) {
      throw new AssistantServiceError(
        'Sessão expirada. Por favor autentique-se novamente.',
        'unauthenticated',
        status
      );
    }
    if (/configur|indispon|serviço indisponível|gemini|openai/i.test(message)) {
      throw new AssistantServiceError(message, 'unavailable', status);
    }
    throw new AssistantServiceError(message, 'network', status);
  }

  if (!responseData || typeof responseData.answer !== 'string' || typeof responseData.conversationId !== 'string') {
    throw new AssistantServiceError('A resposta recebida não está no formato esperado.', 'invalid_response');
  }

  const updatedUsage = recordSuccessfulConsultation(userId, planTier);

  return {
    ...responseData,
    references: await resolveAssistantReferences(asReferences(responseData.references)),
    usage: {
      remainingToday: updatedUsage.remainingToday,
      limit: updatedUsage.limit,
    },
  };
}

/**
 * Retorna o histórico de mensagens de uma conversa específica.
 */
export async function getAssistantHistory(conversationId: string): Promise<AssistantHistoryMessage[]> {
  if (!isSupabaseConfigured || !conversationId) return [];
  const { data, error } = await supabase
    .from('ai_messages')
    .select('id, role, content, kind, references, interpretation_note, safety_note, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw new AssistantServiceError('Não foi possível recuperar esta conversa.', 'network');
  return Promise.all(
    (data || []).map(async (message) => ({
      id: message.id,
      role: message.role as 'user' | 'assistant',
      content: message.content,
      kind: message.kind as AssistantKind | undefined,
      references: await resolveAssistantReferences(asReferences(message.references)),
      interpretationNote: message.interpretation_note || undefined,
      safetyNote: message.safety_note || undefined,
      createdAt: message.created_at,
    }))
  );
}

/**
 * Retorna a lista de todas as conversas do utilizador (ordenadas por updated_at).
 */
export async function getUserConversations(): Promise<AssistantConversation[]> {
  let cached: AssistantConversation[] = [];
  try {
    const raw = localStorage.getItem(CACHED_CONVERSATIONS_KEY);
    if (raw) cached = JSON.parse(raw);
  } catch {
    cached = [];
  }

  if (!isSupabaseConfigured) return cached;

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return cached;

  try {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('id, title, context_reference, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('[assistantService] Falha ao listar conversas no Supabase:', error.message);
      return cached;
    }

    const conversations: AssistantConversation[] = (data || []).map((row) => ({
      id: row.id,
      title: row.title || 'Estudo Bíblico',
      contextReference: row.context_reference as ScriptureReference | null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    try {
      localStorage.setItem(CACHED_CONVERSATIONS_KEY, JSON.stringify(conversations));
    } catch {
      // Ignorar erros de quota local
    }

    return conversations;
  } catch {
    return cached;
  }
}

/**
 * Remove uma conversa e o seu histórico no Supabase e no cache local.
 */
export async function deleteAssistantConversation(conversationId: string): Promise<boolean> {
  try {
    const raw = localStorage.getItem(CACHED_CONVERSATIONS_KEY);
    if (raw) {
      const list: AssistantConversation[] = JSON.parse(raw);
      const filtered = list.filter((item) => item.id !== conversationId);
      localStorage.setItem(CACHED_CONVERSATIONS_KEY, JSON.stringify(filtered));
    }
  } catch {
    // Ignorar
  }

  if (!isSupabaseConfigured) return true;

  try {
    const { error } = await supabase.from('ai_conversations').delete().eq('id', conversationId);
    if (error) {
      console.warn('[assistantService] Erro ao eliminar conversa no Supabase:', error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
