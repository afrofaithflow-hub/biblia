import { createClient } from 'npm:@supabase/supabase-js@2';

type ScriptureReference = { book: string; chapter: number; verses: number[]; label: string };
type ProviderReply = {
  answer?: unknown;
  kind?: unknown;
  references?: unknown;
  interpretationNote?: unknown;
  safetyNote?: unknown;
};

const MAX_QUESTION_LENGTH = 1500;
const ALLOWED_KINDS = new Set(['study', 'devotional', 'prayer', 'clarification']);
const BOOKS: Record<string, { name: string; chapters: number }> = {
  'genesis': { name: 'Gênesis', chapters: 50 }, 'exodo': { name: 'Êxodo', chapters: 40 }, 'levitico': { name: 'Levítico', chapters: 27 }, 'numeros': { name: 'Números', chapters: 36 }, 'deuteronomio': { name: 'Deuteronômio', chapters: 34 },
  'josue': { name: 'Josué', chapters: 24 }, 'juizes': { name: 'Juízes', chapters: 21 }, 'rute': { name: 'Rute', chapters: 4 }, '1samuel': { name: '1 Samuel', chapters: 31 }, '2samuel': { name: '2 Samuel', chapters: 24 }, '1reis': { name: '1 Reis', chapters: 22 }, '2reis': { name: '2 Reis', chapters: 25 }, '1cronicas': { name: '1 Crônicas', chapters: 29 }, '2cronicas': { name: '2 Crônicas', chapters: 36 }, 'esdras': { name: 'Esdras', chapters: 10 }, 'neemias': { name: 'Neemias', chapters: 13 }, 'ester': { name: 'Ester', chapters: 10 },
  'jo': { name: 'Jó', chapters: 42 }, 'salmos': { name: 'Salmos', chapters: 150 }, 'proverbios': { name: 'Provérbios', chapters: 31 }, 'eclesiastes': { name: 'Eclesiastes', chapters: 12 }, 'canticos': { name: 'Cânticos', chapters: 8 }, 'isaias': { name: 'Isaías', chapters: 66 }, 'jeremias': { name: 'Jeremias', chapters: 52 }, 'lamentacoes': { name: 'Lamentações', chapters: 5 }, 'ezequiel': { name: 'Ezequiel', chapters: 48 }, 'daniel': { name: 'Daniel', chapters: 12 },
  'oseias': { name: 'Oseias', chapters: 14 }, 'joel': { name: 'Joel', chapters: 3 }, 'amos': { name: 'Amós', chapters: 9 }, 'obadias': { name: 'Obadias', chapters: 1 }, 'jonas': { name: 'Jonas', chapters: 4 }, 'miqueias': { name: 'Miqueias', chapters: 7 }, 'naum': { name: 'Naum', chapters: 3 }, 'habacuque': { name: 'Habacuque', chapters: 3 }, 'sofonias': { name: 'Sofonias', chapters: 3 }, 'ageu': { name: 'Ageu', chapters: 2 }, 'zacarias': { name: 'Zacarias', chapters: 14 }, 'malaquias': { name: 'Malaquias', chapters: 4 },
  'mateus': { name: 'Mateus', chapters: 28 }, 'marcos': { name: 'Marcos', chapters: 16 }, 'lucas': { name: 'Lucas', chapters: 24 }, 'joao': { name: 'João', chapters: 21 }, 'atos': { name: 'Atos', chapters: 28 }, 'romanos': { name: 'Romanos', chapters: 16 }, '1corintios': { name: '1 Coríntios', chapters: 16 }, '2corintios': { name: '2 Coríntios', chapters: 13 }, 'galatas': { name: 'Gálatas', chapters: 6 }, 'efesios': { name: 'Efésios', chapters: 6 }, 'filipenses': { name: 'Filipenses', chapters: 4 }, 'colossenses': { name: 'Colossenses', chapters: 4 }, '1tessalonicenses': { name: '1 Tessalonicenses', chapters: 5 }, '2tessalonicenses': { name: '2 Tessalonicenses', chapters: 3 }, '1timoteo': { name: '1 Timóteo', chapters: 6 }, '2timoteo': { name: '2 Timóteo', chapters: 4 }, 'tito': { name: 'Tito', chapters: 3 }, 'filemom': { name: 'Filemom', chapters: 1 }, 'hebreus': { name: 'Hebreus', chapters: 13 }, 'tiago': { name: 'Tiago', chapters: 5 }, '1pedro': { name: '1 Pedro', chapters: 5 }, '2pedro': { name: '2 Pedro', chapters: 3 }, '1joao': { name: '1 João', chapters: 5 }, '2joao': { name: '2 João', chapters: 1 }, '3joao': { name: '3 João', chapters: 1 }, 'judas': { name: 'Judas', chapters: 1 }, 'apocalipse': { name: 'Apocalipse', chapters: 22 },
};

const normalise = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const json = (body: unknown, status: number, cors: HeadersInit) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

function corsHeaders(origin: string | null): HeadersInit {
  const configured = (Deno.env.get('AI_ALLOWED_ORIGINS') || 'http://localhost:5173').split(',').map((entry) => entry.trim()).filter(Boolean);
  const allowedOrigin = origin && configured.includes(origin) ? origin : configured[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function parseReferences(value: unknown): ScriptureReference[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return [];
    const ref = raw as Partial<ScriptureReference>;
    const book = typeof ref.book === 'string' ? BOOKS[normalise(ref.book)] : undefined;
    const chapter = Number(ref.chapter);
    const verses = Array.isArray(ref.verses) ? ref.verses.map(Number).filter((verse) => Number.isInteger(verse) && verse > 0 && verse <= 200) : [];
    if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters || !verses.length) return [];
    return [{ book: book.name, chapter, verses: [...new Set(verses)].sort((a, b) => a - b), label: typeof ref.label === 'string' && ref.label.length <= 80 ? ref.label : `${book.name} ${chapter}:${verses.join(',')}` }];
  });
}

function parseReadingContext(value: unknown): { book: string; chapter: number; verse: number } | null {
  if (!value || typeof value !== 'object') return null;
  const context = value as { book?: unknown; chapter?: unknown; verse?: unknown };
  const book = typeof context.book === 'string' ? BOOKS[normalise(context.book)] : undefined;
  const chapter = Number(context.chapter);
  const verse = Number(context.verse);
  if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters || !Number.isInteger(verse) || verse < 1 || verse > 200) return null;
  return { book: book.name, chapter, verse };
}

function safeReply(raw: ProviderReply) {
  const answer = typeof raw.answer === 'string' ? raw.answer.trim().slice(0, 6000) : '';
  if (!answer) throw new Error('O fornecedor não devolveu uma resposta válida.');
  return {
    answer,
    kind: typeof raw.kind === 'string' && ALLOWED_KINDS.has(raw.kind) ? raw.kind : 'study',
    references: parseReferences(raw.references),
    interpretationNote: typeof raw.interpretationNote === 'string' ? raw.interpretationNote.slice(0, 800) : undefined,
    safetyNote: typeof raw.safetyNote === 'string' ? raw.safetyNote.slice(0, 800) : undefined,
  };
}

const systemPrompt = `Você é o Assistente Teológico do BiblIA. Responda em português claro, bíblico, cristocêntrico e interdenominacional. Separe texto bíblico, contexto e interpretação quando necessário. Não invente citações, livros, capítulos, versículos, fontes ou consenso. Em divergências, apresente perspetivas de modo equilibrado. Não substitua profissionais de saúde, segurança ou direito; em risco imediato de autoagressão, violência ou emergência, incentive contacto urgente com emergência local e pessoa de confiança. Não alegue revelação pessoal ou certeza sobre decisões. Devolva SOMENTE JSON: {"answer":"...","kind":"study|devotional|prayer|clarification","references":[{"book":"...","chapter":1,"verses":[1],"label":"..."}],"interpretationNote":"opcional","safetyNote":"opcional"}.`;

async function callProvider(question: string, readingContext: { book: string; chapter: number; verse: number } | null): Promise<{ reply: ReturnType<typeof safeReply>; provider: string; model: string; inputTokens?: number; outputTokens?: number }> {
  const contextualQuestion = readingContext
    ? `${question}\n\nA pessoa estava a ler ${readingContext.book} ${readingContext.chapter}:${readingContext.verse}. Use essa referência apenas como ponto de partida; não atribua a ela palavras que não tenha certeza de que constam no texto.`
    : question;
  const provider = (Deno.env.get('AI_PROVIDER') || '').toLowerCase();
  if (provider === 'gemini') {
    const key = Deno.env.get('GEMINI_API_KEY');
    const model = Deno.env.get('GEMINI_MODEL') || 'gemini-2.0-flash';
    if (!key) throw new Error('Fornecedor não configurado.');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generationConfig: { responseMimeType: 'application/json', temperature: 0.25, maxOutputTokens: 1400 }, contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nPergunta do utilizador: ${contextualQuestion}` }] }] }),
    });
    if (!response.ok) throw new Error('O fornecedor de IA não está disponível.');
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return { reply: safeReply(JSON.parse(text)), provider, model, inputTokens: data?.usageMetadata?.promptTokenCount, outputTokens: data?.usageMetadata?.candidatesTokenCount };
  }

  if (provider === 'openai') {
    const key = Deno.env.get('OPENAI_API_KEY');
    const model = Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-mini';
    if (!key) throw new Error('Fornecedor não configurado.');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, temperature: 0.25, max_tokens: 1400, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: contextualQuestion }] }),
    });
    if (!response.ok) throw new Error('O fornecedor de IA não está disponível.');
    const data = await response.json();
    return { reply: safeReply(JSON.parse(data?.choices?.[0]?.message?.content || '')), provider, model, inputTokens: data?.usage?.prompt_tokens, outputTokens: data?.usage?.completion_tokens };
  }
  throw new Error('Fornecedor não configurado.');
}

Deno.serve(async (request) => {
  const cors = corsHeaders(request.headers.get('Origin'));
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405, cors);

  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Autenticação obrigatória.' }, 401, cors);
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: 'Serviço indisponível.' }, 503, cors);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const token = authHeader.slice(7);
  const { data: userData } = await userClient.auth.getUser(token);
  const user = userData.user;
  if (!user) return json({ error: 'Sessão inválida.' }, 401, cors);

  let payload: { question?: unknown; conversationId?: unknown; readingContext?: unknown };
  try { payload = await request.json(); } catch { return json({ error: 'Pedido inválido.' }, 400, cors); }
  const question = typeof payload.question === 'string' ? payload.question.trim() : '';
  if (!question || question.length > MAX_QUESTION_LENGTH) return json({ error: `A pergunta deve ter entre 1 e ${MAX_QUESTION_LENGTH} caracteres.` }, 400, cors);
  const readingContext = parseReadingContext(payload.readingContext);

  const startedAt = Date.now();
  const { data: quota, error: quotaError } = await userClient.rpc('reserve_ai_quota');
  if (quotaError) return json({ error: 'Não foi possível verificar o limite de uso.' }, 503, cors);
  if (!quota?.allowed) return json({ error: 'Limite diário de perguntas atingido.', code: 'quota_exceeded', usage: quota }, 429, cors);

  try {
    let conversationId = typeof payload.conversationId === 'string' ? payload.conversationId : '';
    if (conversationId) {
      const { data: conversation } = await adminClient.from('ai_conversations').select('id').eq('id', conversationId).eq('user_id', user.id).maybeSingle();
      if (!conversation) throw new Error('Conversa inválida.');
    } else {
      const title = question.replace(/\s+/g, ' ').slice(0, 72);
      const { data: conversation, error } = await adminClient.from('ai_conversations').insert({ user_id: user.id, title, context_reference: readingContext }).select('id').single();
      if (error || !conversation) throw new Error('Não foi possível criar a conversa.');
      conversationId = conversation.id;
    }

    const { error: userMessageError } = await adminClient
      .from('ai_messages')
      .insert({ conversation_id: conversationId, role: 'user', content: question });
    if (userMessageError) throw new Error('Não foi possível guardar a pergunta.');

    const result = await callProvider(question, readingContext);
    const { error: assistantMessageError } = await adminClient
      .from('ai_messages')
      .insert({ conversation_id: conversationId, role: 'assistant', content: result.reply.answer, kind: result.reply.kind, references: result.reply.references, interpretation_note: result.reply.interpretationNote || null, safety_note: result.reply.safetyNote || null });
    if (assistantMessageError) throw new Error('Não foi possível guardar a resposta.');

    const { error: updateConversationError } = await adminClient
      .from('ai_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
    if (updateConversationError) throw new Error('Não foi possível atualizar a conversa.');
    await adminClient.from('ai_request_audit').insert({ user_id: user.id, provider: result.provider, model: result.model, status: 'success', latency_ms: Date.now() - startedAt, input_tokens: result.inputTokens || null, output_tokens: result.outputTokens || null });
    return json({ ...result.reply, conversationId, usage: { remainingToday: quota.remaining_today, limit: quota.limit } }, 200, cors);
  } catch (error) {
    await adminClient.rpc('release_ai_quota', { p_user_id: user.id });
    await adminClient.from('ai_request_audit').insert({ user_id: user.id, status: (error as Error).message.includes('configurado') ? 'unavailable' : 'provider_error', latency_ms: Date.now() - startedAt });
    const unavailable = (error as Error).message.includes('configurado');
    return json({ error: unavailable ? 'O Assistente Teológico ainda não está configurado.' : 'Não foi possível gerar uma resposta agora.' }, unavailable ? 503 : 502, cors);
  }
});
