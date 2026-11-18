# BiblIA — Plano de Conclusão das Secções 1 e 2

**Data:** 17 de Novembro de 2026  
**Fuso horário:** Africa/Maputo  
**Responsável pela planificação:** Codex  
**Estado:** Implementação principal do leitor, corpus BLIVRE e áudio concluída tecnicamente; homologação do utilizador, revisão editorial e otimização do bundle pendentes  
**Âmbito:** Secção 1 — Leitura Bíblica; Secção 2 — Áudio Bíblico Imersivo

## 1. Recomendação executiva

As Secções 1 e 2 devem ser concluídas como uma só experiência de passagem bíblica: a pessoa escolhe um livro, capítulo, versículo e tradução; consegue ler ou ouvir a partir desse mesmo ponto; pode interromper e retomar; e vê o progresso registado sem que o app invente conteúdo ou marque como concluído aquilo que foi saltado.

A ordem é decisiva: **conteúdo e direitos → referência bíblica comum → progresso → experiência de leitura → áudio sincronizado → vozes e ambientes → homologação**. Produzir áudio ou sofisticar o leitor antes de garantir os textos e as traduções corretos cria retrabalho e risco de apresentar conteúdo incorreto como Escritura.

## Estado de execução — 17/11/2026, 20:33 (Africa/Maputo)

- **Fase 0 — Fontes e direitos:** pacote BLIVRE CC BY 4.0 importado e atribuído; validação técnica feita; revisão editorial local pendente.
- **Fase 1 — Texto e traduções:** Bíblia Livre completa ativada como edição padrão. Edições sem corpus continuam indisponíveis; progresso por referência/versículo, permanência mínima e CTA de leitura implementados. O corpus carrega por livro sob demanda e livros visitados são guardados em IndexedDB para reutilização offline.
- **Fase 2 — Posição e progresso:** parcial. A posição local é guardada pelo versículo visível no leitor e pelo versículo que o áudio começou a narrar. Um capítulo só pode ser concluído quando conteúdo, edição, fonte e numeração estiverem verificados; na leitura textual, o versículo final precisa permanecer na zona de leitura por 2,5 segundos ou ser confirmado manualmente após ser alcançado.
- **Fase 3 — Continuidade de áudio:** parcial. A reprodução retoma do versículo guardado e segue automaticamente para o capítulo seguinte somente se ele estiver integral e verificado na mesma edição. O corpus atual não habilita esse avanço.
- **Fases 4–5:** não iniciadas. Vozes, paisagens sonoras e homologação continuam pendentes.
- **Portas de saída:** nenhuma fase está aprovada. Não foi executada compilação nem homologação nesta etapa.

Esta atualização é um estado de implementação, não uma declaração de conclusão. O diário `bibliadev.md` regista os ficheiros e a assinatura desta execução.

Estimativa inicial: **4 a 7 semanas focadas de engenharia**, assumindo que as fontes e licenças das traduções necessárias ficam disponíveis no início. Negociação de licenças, aquisição de fontes de texto e acesso contratual a fornecedores de TTS são dependências externas e podem alongar o calendário. A estimativa deve ser revista no fim da Fase 0.

## 2. Situação de partida observada

- O leitor permite selecionar NVI, ARA, ARC, NVT e KJV, mas a consulta do capítulo não recebe a tradução selecionada; a preferência altera o estado visual, não o texto apresentado.
- O catálogo de dados contém conteúdo explícito para 15 capítulos. Para capítulos ausentes, `getBibleChapter` cria texto genérico; esse fallback não é texto bíblico e não pode ser apresentado ou narrado como tal.
- A posição persistida pelo leitor contém livro e capítulo, não acompanha o versículo visível. A conclusão de capítulo é acionada manualmente.
- O motor de áudio avança entre versículos no capítulo, mas pára no fim desse capítulo; não mantém uma sequência pelo livro nem regista a conclusão de escuta.
- O motor atual utiliza vozes instaladas no navegador e fixa o idioma de fala em `pt-BR`. Os perfis Davi/Ester/Paulo/Timóteo modulam uma voz do sistema; não garantem quatro timbres distintos. A captura mais recente mostra uma única voz portuguesa instalada.
- Os ambientes anunciados como cordas, harpa e louvor são, em grande parte, síntese tonal por osciladores; não equivalem a gravações desses instrumentos. O catálogo de áudio existente é demonstrativo/local, não constitui ainda um serviço de geração e distribuição de MP3 em nuvem.
- A chamada principal da Home é “Continuar Jornada”. “Ler Capítulo” existe dentro de um cartão secundário e não recebe a referência do Versículo do Dia; pode abrir a última leitura ou o capítulo padrão em vez da passagem mostrada.

## 3. Decisões de produto a congelar antes de implementar

1. **Traduções do lançamento:** definir quais versões estarão realmente disponíveis. Uma tradução só aparece como selecionável quando houver texto integral e direito confirmado para a distribuição pretendida. Se a licença ou cobertura faltar, ocultar ou desativar a versão com explicação clara.
2. **Padrão de português de áudio:** decidir a prioridade entre português moçambicano, português europeu e português brasileiro. O app deve mostrar a variante real da voz, não inferi-la pelo nome de um perfil.
3. **Progresso:** a posição de retoma é comum entre leitura e áudio; os eventos de conclusão registam a modalidade para distinguir “lido”, “ouvido” e “lido e ouvido”. Ambos podem contar para o progresso do livro, mas a interface mantém a origem explícita.
4. **Continuidade:** o áudio pode avançar automaticamente dentro do livro selecionado. No fim do livro, pára, assinala a conclusão e oferece a escolha do próximo livro; não atravessa silenciosamente para outro livro.
5. **Camadas de áudio:** manter narração e ambiente como camadas separadas para permitir volume, opção sem trilha e mistura com redução do ambiente durante a fala. Isso também evita gerar um MP3 por combinação de voz e fundo.
6. **Fornecedor TTS:** não escolher por preço nominal ou promessa de “cinema”. Fazer uma prova comparativa com a mesma amostra bíblica, no português escolhido, incluindo pronúncia, cadência, estabilidade, direitos de uso, limites e custo por hora final. Só depois selecionar fornecedor e plano.
7. **Limites de escopo:** IA explicativa, RAG, funcionalidades sociais, clãs, rankings e novas mecânicas de jogo não fazem parte do fecho destas secções.

## 4. Modelo funcional comum

### 4.1 Referência e conteúdo

Adoptar uma referência canónica estável: `book_id + chapter_number + verse_number`, complementada pelo identificador de versículo da edição quando a versificação diferir. A versão selecionada identifica o texto a mostrar e a narrar; não altera a identidade da posição de leitura.

O serviço de conteúdo deve devolver texto real e metadados da edição. Não deve fabricar um capítulo, completar lacunas com prosa genérica nem narrar texto de fallback. Para qualquer passagem sem conteúdo ou direito confirmado, apresentar indisponibilidade explícita e oferecer apenas ações realmente suportadas.

### 4.2 Posição, avanço e conclusão

Separar três conceitos no estado persistido:

- **Posição atual:** último versículo aberto/escutado, usado para retomar.
- **Progresso observado:** capítulos e versículos visitados ou ouvidos, com modalidade e data.
- **Conclusão:** capítulo concluído por leitura confirmada ou por escuta natural até ao último versículo.

No texto, a posição atualiza-se ao acompanhar o versículo visível. A leitura só se conclui quando o versículo final permanece na zona de leitura por 2,5 segundos ou após confirmação manual depois de chegar a esse versículo; o scroll rápido não basta. No áudio, marcar cada versículo como ouvido apenas no fim natural da fala; saltar, procurar no scrubber ou cancelar uma fala não conta como escuta concluída. A conclusão de áudio ocorre depois do último versículo terminar.

O estado deve ser idempotente, sobreviver a encerramentos e permitir sincronização com a conta Supabase. Em modo offline, guardar operações localmente e sincronizar depois. A migração de uma conta anónima para uma conta autenticada deve preservar posição e conclusões sem duplicá-las.

## 5. Fases de execução e portas de saída

### Fase 0 — Fecho de decisões, fontes e direitos

**Estimativa:** 2–4 dias de engenharia, além do tempo externo para direitos/fornecedores.

**Entregáveis:** matriz de versões e cobertura; fonte e licença de cada texto; variante linguística do áudio; glossário de pronúncia para nomes bíblicos; decisão de como representar referências com versificação diferente; orçamento-alvo por utilizador e por hora de áudio; critérios da prova de vozes.

**Porta de saída:** nenhuma versão é anunciada sem conteúdo e autorização confirmados. Se os direitos não estiverem resolvidos, limitar o lançamento às versões autorizadas e documentar a cobertura real.

### Fase 1 — Integridade do texto e serviço de traduções

**Estimativa:** 5–10 dias, assumindo que o conteúdo autorizado está disponível em formato utilizável.

**Entregáveis:** serviço de consulta por livro/capítulo/versão; validação de cobertura de livros, capítulos e numeração; remoção do fallback de prosa inventada; tratamento de edição indisponível; versão e fonte do conteúdo; troca de tradução que atualiza imediatamente o capítulo e mantém a referência corrente.

**Porta de saída:** cada texto exibido corresponde à edição ativa; nenhuma passagem é gerada como substituto; referências do leitor e do áudio resolvem para a mesma passagem. KJV, se mantida, é conteúdo inglês real e identificado como tal.

### Fase 2 — Posição de leitura, progresso e Home

**Estimativa:** 4–7 dias.

**Entregáveis:** guardar/retomar por versículo; indicador de progresso do livro e do capítulo; ações distintas de marcar/concluir leitura; estado reversível por confirmação/toast; seleção de livro/capítulo/versículo; navegação entre capítulos e livros; sincronização local-first com Supabase; atualização de progresso após login.

Na Home, a ação prioritária passa a ser **“Continuar leitura”**, com referência e versão verdadeiras. “Ouvir daqui” é a ação paralela e usa o mesmo versículo. O cartão do Versículo do Dia abre exatamente a referência indicada. Progresso, sequência e recomendação deixam de ser valores fixos de demonstração.

**Porta de saída:** concluir uma leitura, fechar o app e reabri-lo leva ao estado correto; trocar versão não perde a posição; a Home nunca encaminha para uma passagem diferente da que exibe.

### Fase 3 — Áudio sincronizado e sequência pelo livro

**Estimativa:** 4–7 dias para fluxo; depende da decisão de TTS e alinhamento para a camada de áudio final.

**Entregáveis:** iniciar áudio na posição comum; destacar o versículo que está a ser narrado; avançar automaticamente entre versículos; avançar capítulo a capítulo dentro do mesmo livro quando “Continuar neste livro” estiver ativo; registar escuta natural; retomar depois de pausa, interrupção ou troca de tela; parar no fim do livro e oferecer próxima ação.

Controlos de anterior/próximo devem atualizar áudio, texto destacado e progresso em conjunto. Mudança de capítulo/versão/voz durante reprodução deve cancelar a fala antiga sem marcar o versículo cancelado como ouvido.

**Porta de saída:** cenário completo Salmos 23:1–6, transição a Salmos 24:1, retoma em Salmos 24 após reabrir e paragem/conclusão em Salmos 150. Se algum capítulo estiver sem conteúdo disponível, o fluxo deve parar com estado explícito, não avançar para texto de fallback.

### Fase 4 — Vozes, pronúncia e paisagens sonoras

**Estimativa:** 4–8 dias para avaliação e integração; pode depender de contratação e limites do fornecedor.

**Entregáveis:** amostras comparáveis de TTS; teste de pronúncia e cadência com falantes do público-alvo; seleção de uma voz de sistema como fallback sem prometer timbres que o dispositivo não tem; prévia audível antes da escolha; rótulos honestos para voz sintética e variante de português; dicionário de pronúncia; trilhas ambientais licenciadas e diferenciadas; controlo “Sem ambiente”; volume baixo por padrão e redução automática durante a fala; correção da sobreposição da gaveta com a navegação inferior.

Se a geração for pré-produzida, guardar áudio por capítulo e metadados de alinhamento por versículo. Se não houver alinhamento fiável, gerar segmentos por versículo para a cobertura contratada. A escolha deve considerar sincronização real, não apenas qualidade subjetiva do timbre.

**Porta de saída:** prova cega de amostras com o utilizador e pelo menos cinco ouvintes representativos; voz inteligível em telemóvel e auscultadores; cada ambiente é claramente diferente e não encobre a narração; todas as gravações e trilhas têm direito de distribuição confirmado.

### Fase 5 — Homologação e fecho das Secções 1 e 2

**Estimativa:** 3–5 dias.

**Entregáveis:** matriz executada em mobile, tablet e desktop; teste offline/online; teste com todas as traduções habilitadas; troca entre leitura e áudio no mesmo ponto; leitura/escuta interrompida e retomada; capítulo saltado não marcado como concluído; capítulo e livro concluídos corretamente; navegação por teclado/leitor de ecrã; verificação de legibilidade, volume e consumo de dados; compilação, erros, telemetria e instruções de suporte.

**Porta de saída:** todos os cenários passam; dados não canónicos ausentes não aparecem; custos e limites do TTS estão medidos; o utilizador homologa a qualidade visual e sonora; diários `bibliadev.md` e `bibliadev` sincronizados, data/hora de Maputo, alterações, evidências, pendências e assinaturas Codex/Antigravity. Só então ambas as secções podem ser marcadas como concluídas.

## 6. Critérios globais de aceitação

1. Cada tradução habilitada troca de facto o texto em todos os pontos relevantes — leitor, favoritos/partilha quando aplicável e áudio.
2. Não há prosa sintética apresentada como Bíblia; não há áudio para texto sem origem/edição confirmadas.
3. Leitura e áudio partilham referência e posição, mas distinguem “lido” de “ouvido”.
4. Retoma é exata por versículo e persiste entre sessões/dispositivos autenticados, com comportamento offline definido.
5. O áudio acompanha o texto, conclui apenas o que terminou naturalmente e continua pelo livro até ao último capítulo selecionado.
6. Vozes, sotaques, fundos, preço, direitos e limitações são comunicados de forma honesta.
7. A Home abre a referência certa e apresenta a leitura como ação de primeira classe.
8. A homologação do utilizador é parte do fecho; uma build limpa, sozinha, não fecha nenhuma destas secções.

## 7. Fora de escopo e riscos

- IA explicativa/RAG, apologética, rankings, amigos, clãs, monetização geral e novas modalidades de jogo ficam fora deste plano.
- Direitos de texto e de áudio são o principal risco de calendário. A disponibilidade pública de um ficheiro não significa automaticamente autorização para redistribuí-lo ou gerar narração comercial.
- Provedores TTS, preços e modelos mudam; a decisão deve ser registada como ADR com data, versão do modelo, preço e alternativa de migração.
- “Voz humanizada” deve ser uma promessa baseada em amostra aprovada, não um nome de plano ou perfil sem suporte real.
- O cache reduz chamadas repetidas, mas não elimina custos de armazenamento, transferência, jobs, suporte, regeneração e retenção.

## 8. Governação de execução

Executar uma fase de cada vez. Cada fase começa com uma lista fechada de tarefas e termina com evidências e assinatura. Não se inicia a seguinte se a porta de saída não passou. Mudança de escopo ou nova tecnologia exige atualizar este plano e o diário antes da implementação. O estado final exige homologação explícita do utilizador; Codex e Antigravity registam as respetivas contribuições separadamente.
