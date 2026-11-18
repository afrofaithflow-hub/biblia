# BiblIA — Conclusões e catálogo inicial de Jornadas de Leitura

**Data:** 17 de novembro de 2026  
**Estado:** proposta de produto e conteúdo para validação antes da publicação

## Conclusão executiva

Adotar jornadas temáticas curtas como formato principal de descoberta e onboarding. Não eliminar planos longos: oferecer percursos de leitura contínua como opção secundária para quem os procura. Jornadas de 3, 5 e 7 dias são um bom ponto de partida; 14 e 21 dias podem vir depois de medir conclusão e retorno.

O Gemini acerta ao propor um ciclo diário curto, conteúdo por público e uma biblioteca que possa crescer. Porém, retenção “drástica” não está demonstrada pelos dados do BiblIA; tratar a proposta como hipótese e medir início, conclusão, retorno e custo de IA. Evitar transformar leitura espiritual numa corrida: XP e insígnias devem reconhecer participação, sem penalizar pausas ou falhas.

## Decisões recomendadas

1. **Experiência:** cada dia apresenta passagem, contexto breve, reflexão/aplicação e desafio opcional de 2–3 perguntas. Áudio é um formato alternativo da leitura, não uma etapa obrigatória. Manter o compromisso médio em 5–8 minutos e indicar a duração real por trecho.
2. **Conteúdo:** lançar cinco jornadas curadas: duas gratuitas e três Premium. Criar em seguida uma experiência Master para grupos, quando convite, privacidade e progresso partilhado estiverem implementados.
3. **IA:** usar IA para rascunhos e personalização controlada; rever referências, respostas e contexto antes de publicar. Gerar e armazenar o conteúdo com versão, modelo/fonte, data e revisão humana. Não chamar “automático” a conteúdo bíblico publicado sem validação.
4. **Acesso:** os tipos existentes no projeto usam `free`, `plus` e `master`, enquanto a proposta comercial diz Premium e Master. Uniformizar nomes e regras de entitlements antes de ligar os cartões aos preços. Confirmar moeda, disponibilidade regional e cobrança; `$1,49`/`$2,99` não devem ser codificados como preço universal.
5. **Grupos:** ranking privado apenas por adesão explícita, com opção de ocultar presença/progresso. Preferir progresso cooperativo e metas semanais; nunca expor quem não leu.
6. **Métricas do piloto:** visualização → início, conclusão por jornada, retorno em 7 dias, dias concluídos sem sequência obrigatória, respostas corretas e custo de geração. Comparar jornadas curtas com as atuais antes de alegar melhoria.

O projeto já tem tipos próprios para jornadas gamificadas em `src/types/readingPlanTypes.ts`, mas a tela atual `src/components/plans/ReadingPlans.tsx` ainda apresenta cartões estáticos e não consome um catálogo estruturado de jornadas. Logo, há alinhamento conceitual, mas a experiência descrita ainda precisa de integração funcional. O motor de jornada em `src/lib/gameJourney.ts` é outro fluxo (mundos/fases); decidir se planos de leitura reutilizam progresso/conquistas ou permanecem um recurso separado.

## Catálogo inicial proposto

Os rótulos Free/Premium abaixo são recomendações de posicionamento, não preços ou regras técnicas já implementadas.

| Jornada | Acesso | Duração | Persona/necessidade | Insígnia |
|---|---|---:|---|---|
| 7 Dias com Jesus | Free | 7 dias | Primeiro contacto; conhecer Jesus em Marcos | Caminho com Jesus |
| Paz para Hoje | Free | 5 dias | Pessoa em busca de consolo e oração | Refúgio |
| A Jornada do Êxodo | Premium | 7 dias | Interesse por narrativa e contexto histórico | Caminho da Liberdade |
| Paulo e a Igreja em Missão | Premium | 7 dias | Curiosidade histórica e vida da igreja | Mensageiro |
| Reis, Profetas e Esperança | Premium | 7 dias | Compreender os ciclos de Israel e Judá | Voz de Esperança |

### 1. 7 Dias com Jesus — Marcos (Free)

**Promessa:** acompanhar os principais movimentos do Evangelho de Marcos numa semana. As divisões são seleções de leitura, não um resumo exaustivo do livro.

| Dia | Tema | Leitura |
|---:|---|---|
| 1 | O início das boas-novas | Marcos 1:1–20 |
| 2 | Autoridade que restaura | Marcos 1:21–45 |
| 3 | Histórias do Reino | Marcos 4:1–34 |
| 4 | Quem é Jesus? | Marcos 4:35–41; 5:21–43 |
| 5 | Compaixão e provisão | Marcos 6:30–44; 7:24–37 |
| 6 | O caminho do serviço | Marcos 8:27–38; 10:35–45 |
| 7 | Cruz e ressurreição | Marcos 15:33–39; 16:1–8 |

### 2. Paz para Hoje — Salmos (Free)

**Promessa:** dar palavras à ansiedade, ao medo e à esperança; não promete substituir cuidado pastoral ou clínico.

| Dia | Tema | Leitura |
|---:|---|---|
| 1 | Levar a preocupação a Deus | Salmo 13 |
| 2 | Refúgio em tempos difíceis | Salmo 46:1–11 |
| 3 | Descanso e cuidado | Salmo 23 |
| 4 | Quando o medo aparece | Salmo 56:1–13 |
| 5 | Esperar com esperança | Salmo 121 |

### 3. A Jornada do Êxodo — Premium

**Promessa:** seguir libertação, travessia e aliança com referências ao mapa e notas de contexto verificadas.

| Dia | Tema | Leitura |
|---:|---|---|
| 1 | O clamor do povo e o chamado de Moisés | Êxodo 2:23–25; 3:1–15 |
| 2 | Confronto com Faraó | Êxodo 5:1–9; 7:1–7 |
| 3 | A Páscoa e a saída | Êxodo 12:1–14, 29–42 |
| 4 | A travessia do mar | Êxodo 14:10–31 |
| 5 | Provisão no deserto | Êxodo 16:1–18; 17:1–7 |
| 6 | Sinai e aliança | Êxodo 19:1–8; 20:1–17 |
| 7 | Presença no caminho | Êxodo 33:12–23; 40:34–38 |

### 4. Paulo e a Igreja em Missão — Premium

**Promessa:** ler episódios de Atos e uma carta, distinguindo o relato de Atos das próprias cartas de Paulo.

| Dia | Tema | Leitura |
|---:|---|---|
| 1 | De perseguidor a testemunha | Atos 9:1–22 |
| 2 | Uma comunidade que envia | Atos 13:1–12 |
| 3 | Boa notícia em novas cidades | Atos 16:6–15 |
| 4 | Coragem em meio à oposição | Atos 17:1–12 |
| 5 | A mensagem no mundo greco-romano | Atos 17:16–34 |
| 6 | Unidade e diversidade na comunidade | 1 Coríntios 12:12–27 |
| 7 | Viver a missão com amor | 1 Coríntios 13:1–13 |

### 5. Reis, Profetas e Esperança — Premium

**Promessa:** perceber escolhas de liderança, denúncia profética e esperança. As leituras são episódios representativos, não uma cronologia completa.

| Dia | Tema | Leitura |
|---:|---|---|
| 1 | Um povo pede um rei | 1 Samuel 8:4–22 |
| 2 | David e a promessa | 2 Samuel 7:8–16 |
| 3 | Sabedoria e responsabilidade | 1 Reis 3:5–14 |
| 4 | Elias confronta a idolatria | 1 Reis 18:17–39 |
| 5 | Justiça que Deus requer | Amós 5:21–24 |
| 6 | Esperança em meio à crise | Isaías 9:1–7 |
| 7 | Um coração renovado | Ezequiel 36:24–28 |

## Formato diário e conteúdo

- **Leitura:** passagem curta, com opção de áudio quando disponível; mostrar livro, capítulo e versículos.
- **Contexto:** 2–4 frases sobre contexto literário/histórico, distinguindo texto bíblico de interpretação. Dar fonte quando houver afirmação arqueológica ou datação.
- **Reflexão:** uma pergunta aberta ligada ao trecho; sem presumir estado emocional ou resposta “correta”.
- **Desafio:** 2–3 perguntas sobre o texto com resposta explicada e referência. Não exigir quiz para marcar leitura concluída.
- **Progresso:** concluir o dia concede XP moderado e progresso; pausa não apaga avanço nem retira insígnia.

### Jornadas Master para grupos — fase seguinte

Em vez de vender um ranking como benefício central, oferecer planos de 5 ou 7 dias com guia do líder, perguntas para conversa, convite por link/código e painel agregado de participação. O líder vê somente os dados que cada participante consentiu em partilhar. Não publicar nomes de quem está atrasado ou ausente.

## Gerador de jornadas: escopo seguro para uma próxima etapa

Um gerador pode receber tema, público, duração e tradução permitida; propor passagens e criar rascunhos de contexto e perguntas. Antes de exportar/publicar, validar automaticamente a existência de cada livro/capítulo/versículo contra os dados bíblicos do app, validar quantidade de dias e schema, e encaminhar para revisão editorial. Guardar versão, idioma, referências, estado de revisão e proveniência. A IA não deve inventar texto bíblico nem apresentar inferências históricas como factos estabelecidos.

Para jornadas personalizadas sobre luto, ansiedade ou sofrimento, usar linguagem cuidadosa, permitir trocar/encerrar o plano e evitar inferir diagnóstico. A experiência deve apontar para apoio humano quando apropriado, sem posicionar a IA como conselheira pastoral ou clínica.

## Próximos passos

1. Aprovar títulos, leituras e nível de acesso com revisão bíblica/editorial.
2. Definir uma única taxonomia de subscrição e as regras de acesso reais.
3. Modelar o catálogo nos tipos já existentes e ligar a tela de descoberta a dados, progresso e estados vazios.
4. Preparar contexto e quiz para apenas duas jornadas piloto; medir antes de expandir.
5. Implementar a experiência Master depois dos controles de consentimento e visibilidade.

## Ampliação do catálogo Free

Após a primeira proposta, o catálogo foi ampliado para que membros Free possam escolher um ritmo compatível com sua vida sem ficarem restritos a jornadas curtas. Foram adicionados:

- **15 dias:** salmos escolhidos para diferentes momentos e sentimentos.
- **30 dias:** leitura narrativa de Marcos e Atos 1–14, ligando Jesus à missão da primeira comunidade.
- **90 dias (trimestre):** os quatro Evangelhos e Atos.
- **180 dias (semestre):** o Novo Testamento completo.
- **365 dias (ano):** a Bíblia completa, do Génesis ao Apocalipse.

Os percursos longos são opcionais e não substituem jornadas temáticas. A conclusão concede bónus de XP e uma insígnia, com valores maiores nos percursos mais longos. O progresso e XP destes planos ainda são guardados localmente e não sincronizam para a conta nem para o XP global do Jogo BiblIA.

