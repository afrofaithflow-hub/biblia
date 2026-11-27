export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();

    if (!apiKey) {
      return res.status(503).json({
        error: 'Chave GEMINI_API_KEY não configurada no servidor. Por favor, adicione a chave nas variáveis de ambiente da Vercel.',
      });
    }

    const { question, readingContext, history = [] } = req.body || {};

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'O campo question é obrigatório.' });
    }

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

    let lastError = 'Falha ao consultar a API do Gemini.';
    let lastStatus = 500;

    for (const model of candidateModels) {
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
          const errText = await response.text();
          lastStatus = response.status;
          try {
            const errJson = JSON.parse(errText);
            if (errJson?.error?.message) lastError = errJson.error.message;
          } catch {
            lastError = errText;
          }
          continue;
        }

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return res.status(200).json({ rawText });
      } catch (err: any) {
        lastError = err?.message || String(err);
      }
    }

    return res.status(lastStatus).json({ error: lastError });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Erro interno no servidor do Assistente.' });
  }
}
