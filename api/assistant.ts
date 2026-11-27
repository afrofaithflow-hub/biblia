export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { question, readingContext, conversationId, history = [] } = req.body || {};

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'O campo question é obrigatório.' });
    }

    const apiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();

    // ── CAMINHO 1: Chave configurada diretamente no Vercel (Latência Mínima) ──
    if (apiKey) {
      const contextualQuestion = readingContext
        ? `${question}\n\nA pessoa estava a ler ${readingContext.book} ${readingContext.chapter}:${readingContext.verse}. Use essa referência apenas como ponto de partida; não atribua a ela palavras que não tenha certeza de que constam no texto.`
        : question;

      const systemPrompt = `Você é o Orientador Teológico do BiblIA — uma aplicação devocional cristã séria, reverente e cristocêntrica.
Responda sempre em JSON estrito com os campos:
{
  "answer": "Sua resposta pastoral, exegética e clara",
  "kind": "study" | "devotional" | "prayer" | "clarification",
  "references": [
    { "book": "NomeDoLivro", "chapter": 1, "verses": [1, 2], "label": "NomeDoLivro 1:1-2" }
  ],
  "suggestedQuestions": ["Pergunta de aprofundamento 1", "Pergunta de aprofundamento 2"],
  "interpretationNote": "Nota hermenêutica breve se aplicável"
}`;

      const candidateModels = [
        process.env.VITE_GEMINI_MODEL,
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
      ].filter(Boolean) as string[];

      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      if (Array.isArray(history) && history.length > 0) {
        for (const h of history.slice(-6)) {
          contents.push({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.content }],
          });
        }
      }

      contents.push({
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\nPergunta do utilizador: ${contextualQuestion}` }],
      });

      for (const model of candidateModels) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

        try {
          const geminiRes = await fetch(url, {
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

          if (geminiRes.ok) {
            const data = await geminiRes.json();
            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            return res.status(200).json({ rawText });
          }
        } catch {
          // tenta próximo modelo
        }
      }
    }

    // ── CAMINHO 2: Proxy Seguro Servidor-para-Servidor com o Supabase ──
    // Elimina qualquer restrição de CORS porque é chamada direta entre servidores Node.js
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://raeydbmvlzacilshsnbj.supabase.co';
    const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_e0RRULsyOQAJPe6_LRZ7YA_iPEzadx-';
    const authHeader = req.headers['authorization'] || `Bearer ${SUPABASE_ANON_KEY}`;

    const candidateFunctions = ['bright-processor', 'theological-assistant'];

    for (const fn of candidateFunctions) {
      try {
        const subRes = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': authHeader,
          },
          body: JSON.stringify({ question, readingContext, conversationId, history }),
        });

        if (subRes.ok) {
          const subData = await subRes.json();
          return res.status(200).json(subData);
        }
      } catch {
        // tenta próxima função
      }
    }

    return res.status(503).json({
      error: 'O Assistente Teológico está a sincronizar. Por favor, tente novamente em instantes.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Erro interno no servidor do Assistente.' });
  }
}
