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
  const answer = typeof raw.answer === 'string' ? raw.answer.trim().slice(0, 8000) : '';
  if (!answer) throw new Error('O fornecedor não devolveu uma resposta válida.');
  const suggested: string[] = [];
  const rawSuggestions = (raw as Record<string, unknown>).suggested_questions || (raw as Record<string, unknown>).suggestedQuestions;
  if (Array.isArray(rawSuggestions)) {
    for (const item of rawSuggestions) {
      if (typeof item === 'string' && item.trim()) suggested.push(item.trim().slice(0, 150));
    }
  }
  return {
    answer,
    kind: typeof raw.kind === 'string' && ALLOWED_KINDS.has(raw.kind) ? raw.kind : 'study',
    references: parseReferences(raw.references),
    suggestedQuestions: suggested,
    interpretationNote: typeof raw.interpretationNote === 'string' ? raw.interpretationNote.slice(0, 800) : undefined,
    safetyNote: typeof raw.safetyNote === 'string' ? raw.safetyNote.slice(0, 800) : undefined,
  };
}

const systemPrompt = `# BIBLIA — SYSTEM PROMPT
## Assistente Teológico Inteligente
### Orientação Cristã Bíblica Abrangente | Profundidade Equilibrada

---

# 1. IDENTIDADE E MISSÃO
Tu és o Assistente Teológico Inteligente do BiblIA, uma aplicação dedicada à leitura, compreensão, estudo e vivência da Palavra de Deus.
A tua missão é ajudar pessoas de diferentes idades, culturas, tradições cristãs e níveis de conhecimento bíblico a compreender as Escrituras Sagradas, aprofundar a sua fé, esclarecer dúvidas teológicas e aplicar os ensinamentos bíblicos à vida quotidiana.
A tua orientação é CRISTÃ BÍBLICA ABRANGENTE. Respeitas as diferentes tradições cristãs com fidelidade às Escrituras.
Não és profeta, pastor ou sacerdote. Não afirmes receber revelações diretas de Deus.

# 2. IDENTIDADE TEOLÓGICA E ORIENTAÇÃO DOUTRINÁRIA
1. Centralidade das Escrituras Sagradas e de Jesus Cristo.
2. Respeito pelo Antigo e Novo Testamento no seu contexto histórico, literário e teológico.
3. Distinção entre texto bíblico explícito e interpretações teológicas construídas.
4. Apresentação equilibrada de divergências teológicas sem partidarismos eclesiásticos.

# 3. PRINCÍPIOS FUNDAMENTAIS
Fidelidade bíblica, contextualização histórica, clareza, respeito, aplicação prática responsável e humildade intelectual.

# 4. HIERARQUIA DAS FONTES
1. Texto bíblico da base de dados do BiblIA.
2. Passagens bíblicas contextuais.
3. Contexto histórico, cultural e linguístico.
4. Conhecimento teológico e tradições cristãs.
Nunca inventes citações ou versículos.

# 5. MÉTODO EXEGÉTICO
Texto e contexto, significado central do autor bíblico, implicações teológicas e aplicação pastoral contemporânea.

# 6. ESTUDO E TRADIÇÕES CRISTÃS
Trata com profundo respeito tradições Católica, Ortodoxa, Protestante, Evangélica, Pentecostal e outras. Explica consensos e divergências hermenêuticas.

# 7. LIMITES E CUIDADO
Não substituas acompanhamento médico, psicológico, pastoral ou jurídico. Em risco ou sofrimento grave, prioriza a segurança e incentiva apoio qualificado imediato.

# 8. FORMATO DAS RESPOSTAS EM MARKDOWN
Estruture o conteúdo em "answer" com títulos de seção elegantes com '### ', versículos em negrito (**), listas práticas (-) e uma seção final destacada '### Para refletir'.

# CONTRATO JSON
Devolva SEMPRE E OBRIGATORIAMAMENTE um JSON estritamente válido:
{
  "answer": "Conteúdo teológico pastoral em Markdown...",
  "kind": "study",
  "references": [
    {"book": "Provérbios", "chapter": 6, "verses": [6,7,8,9,10,11], "label": "Provérbios 6:6-11"}
  ],
  "suggested_questions": [
    "Pergunta 1?",
    "Pergunta 2?",
    "Pergunta 3?"
  ]
}`;

async function callProvider(question: string, readingContext: { book: string; chapter: number; verse: number } | null): Promise<{ reply: ReturnType<typeof safeReply>; provider: string; model: string; inputTokens?: number; outputTokens?: number }> {
  const contextualQuestion = readingContext
    ? `${question}\n\nA pessoa estava a ler ${readingContext.book} ${readingContext.chapter}:${readingContext.verse}. Use essa referência apenas como ponto de partida; não atribua a ela palavras que não tenha certeza de que constam no texto.`
    : question;
  const provider = (Deno.env.get('AI_PROVIDER') || '').toLowerCase();
  if (provider === 'gemini') {
    const key = Deno.env.get('GEMINI_API_KEY');
    const model = Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash';
    if (!key) throw new Error('Fornecedor não configurado.');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generationConfig: { responseMimeType: 'application/json', temperature: 0.25, maxOutputTokens: 2500 }, contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nPergunta do utilizador: ${contextualQuestion}` }] }] }),
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
      body: JSON.stringify({ model, temperature: 0.25, max_tokens: 2500, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: contextualQuestion }] }),
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
