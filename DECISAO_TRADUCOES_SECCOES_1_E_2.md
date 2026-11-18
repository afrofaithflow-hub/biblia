# BiblIA — Triagem e decisão sobre traduções bíblicas

**Data:** 17 de Novembro de 2026  
**Fuso horário:** Africa/Maputo  
**Responsável:** Codex  
**Estado:** Triagem documental concluída; tradução de lançamento ainda não aprovada  
**Âmbito:** Secção 1 — Leitura Bíblica; Secção 2 — Áudio Bíblico

## 1. Decisão executiva

Adotar **Bíblia Livre (BLIVRE / `porbr2018`) como candidata prioritária para um piloto técnico e avaliação editorial**, sem a declarar ainda como tradução final do BiblIA. A fonte identifica a edição como português do Brasil, atualizada a partir da tradução de Almeida de 1819, sob CC BY 4.0; exige atribuição e indicação de alterações, se houver, e informa que o texto está em andamento. A licença permite redistribuição e adaptação sob as suas condições, mas não substitui a revisão de adequação ao público nem a verificação do pacote e da versão concreta a distribuir.

O objetivo desta triagem é retirar bloqueios conhecidos sem criar nova dívida: **não importar ainda um corpus completo, não habilitar traduções comerciais e não publicar a promessa de “100% de segurança jurídica”**. A seleção definitiva requer avaliação editorial do público lusófono do BiblIA e validação da versão exata do corpus.

## 2. Avaliação das candidatas

| Candidata | Evidência disponível | Parecer para o BiblIA | Estado |
|---|---|---|---|
| **Bíblia Livre (`porbr2018`)** | eBible identifica autores, dialecto Brasil, licença CC BY 4.0, atribuição obrigatória, data da edição e estado de trabalho em andamento. Disponibiliza capítulos em texto simples. | Melhor candidata imediata para avaliar e testar a ingestão. Confirmar revisão teológica, leitura em Moçambique e a data/hash exatos do pacote antes de integrar. | **Candidata; piloto pendente** |
| **Bíblia Portuguesa Mundial (`porbrbsl`)** | eBible oferece ficheiros de texto, mas descreve a tradução como rascunho em revisão e em português do Brasil. | Não priorizar como texto de lançamento enquanto houver uma opção mais estável para avaliação. Pode servir a testes técnicos isolados se for rotulada como rascunho e se a licença do ficheiro for registada. | **Não aprovada para lançamento** |
| **Almeida histórica / 1819 / 1898 / alegada 1911** | A SBB regista a ARC em 1898 e revisões posteriores. “Almeida histórica 1911” não identifica, por si só, o corpus ou a revisão exata. | Não chamar uma transcrição de “ARC” nem a classificar como domínio público mundial apenas pelo ano. Só reavaliar com edição, origem digital, proveniência e direitos identificados. | **Pendente de identificação** |
| **NVI / ARA / ARC / NVT** | Edições protegidas ou com direitos e usos a confirmar junto do respetivo titular. A Biblica exige autorização escrita para uso de NVI fora das suas diretrizes e licença explícita para IA. As regras da Biblica não determinam as regras da SBB ou de outros titulares. | Manter fora do conteúdo de lançamento até haver autorização escrita cobrindo os usos concretos. Consultar cada titular separadamente. | **Bloqueadas por direitos** |
| **WEB / KJV / RV1909 e outras línguas** | Existem edições com alegações ou declarações de domínio público, mas a situação, o nome da edição, a versão e eventuais marcas variam. | Não ampliar agora para inglês e espanhol. Primeiro fechar a experiência portuguesa e a validação de conteúdo. | **Fora do escopo atual** |

## 3. Correções ao parecer do Gemini

- Atribuição “`https://google.com`” para a Bíblia Livre está errada. A fonte especifica os autores, o título, a referência à edição, o site de origem e a licença. Os créditos da app devem apontar para a fonte e para a licença corretas.
- CC BY 4.0 permite uso comercial e adaptações, desde que sejam cumpridas as condições de atribuição e transparência sobre alterações. Isso não atesta qualidade teológica, adequação ao dialecto moçambicano, proveniência de qualquer pacote recolhido noutro site ou termos da voz/TTS.
- A afirmação de que “Almeida Histórica 1911” é domínio público global não está demonstrada. A edição exata e a transcrição devem ser verificadas antes de distribuição.
- A alegação de que a SBB proíbe TTS não foi demonstrada pelo material consultado. O que está confirmado na página da Biblica aplica-se ao conteúdo Biblica/NVI e não deve ser generalizado para a SBB.
- Nenhuma opção deve ser anunciada como “100% segura juridicamente”. O registo deve descrever as permissões verificadas e manter as questões pendentes visíveis.
- Os créditos genéricos preparados no parecer não devem ser publicados: incluem um endereço incorreto e atribuem direitos e autorizações de IA/TTS sem prova específica.

## 4. Auditoria rápida do código existente

- `src/data/bibleData.ts` marca NVI como disponível, mas o diário do projeto informa que o catálogo contém 15 registos: apenas Salmos 1 e 23 estão completos; os outros 13 são parciais.
- O mapa de conteúdo está indexado por livro e capítulo, sem separar o texto por ID de tradução. Trocar o rótulo de tradução não basta para entregar um corpus de outra edição.
- O registo `BibleTranslation` não contém fonte, edição/data do corpus, licença, atribuição nem permissões independentes para distribuição offline, TTS, jogos e IA.
- `src/context/AudioContext.tsx` obtém o capítulo por omissão NVI para a validação de conclusão; a identidade de tradução precisa fazer parte do contrato comum entre leitor e áudio antes de se ligar um novo corpus.

Estes pontos não foram alterados nesta triagem. Servem como pendências explícitas da Fase 0/1; não devem ser resolvidos escondendo limitações ou reutilizando o rótulo NVI para texto de outra edição.

## 5. Critérios para fechar a decisão e iniciar a ingestão

1. Revisor bíblico lusófono avalia amostras representativas da Bíblia Livre (por exemplo, Salmos 23, João 3 e Romanos 8) quanto a clareza, fidelidade percebida e adequação ao público do BiblIA.
2. Confirmar o pacote fonte disponibilizado pela eBible, edição/data, formato, hash, 66 livros/1189 capítulos e numeração integral por capítulo.
3. Guardar atribuição e licença junto do corpus e apresentar créditos corretos no produto. Não modificar o texto bíblico como “localização” para português moçambicano sem identificar e declarar claramente qualquer alteração permitida.
4. Separar conteúdo por tradução e não expor uma edição como disponível até os requisitos de conteúdo, direitos e revisão dessa edição passarem.
5. Para cada edição, registar permissões específicas para: distribuição no app, cache/offline, áudio/TTS, reprodução em jogos, citações e uso por IA. Se um uso não estiver confirmado, fica desativado.
6. Avaliar em separado os termos comerciais e de privacidade de qualquer fornecedor de voz ou IA.

## 6. Próxima execução recomendada

Depois de obter a revisão editorial e validar o corpus, executar uma fase fechada de ingestão BLIVRE: importar a fonte oficial, gerar manifesto de origem/licença/hash, validar cobertura e versículos, separar o texto por edição e testar Salmos 23:1–6 no leitor e áudio. Só depois expandir a importação para os 66 livros. NVI, ARA, ARC e NVT permanecem fora do lançamento até que o titular confirme por escrito os usos necessários.

**Aquisição da fonte nesta etapa:** a página oficial lista o pacote `porbr2018_readaloud.zip`, mas o download a partir do ambiente local falhou porque `ebible.org` não pôde ser resolvido pelo sistema. Nenhum ZIP foi criado e a cobertura integral do pacote ainda não foi verificada. Repetir a aquisição a partir de uma conexão funcional antes de planear a conversão/importação.

## Fontes consultadas

- eBible, [Bíblia Livre (`porbr2018`)](https://www.ebible.org/details.php?id=porbr2018).
- Creative Commons, [CC BY 4.0 — resumo da licença](https://creativecommons.org/licenses/by/4.0/deed.en) e [texto legal](https://creativecommons.org/licenses/by/4.0/legalcode).
- eBible, [Bíblia Portuguesa Mundial (`porbrbsl`)](https://www.ebible.org/Scriptures/details.php?id=porbrbsl).
- SBB, [Almeida Revista e Corrigida](https://www.sbb.org.br/a-biblia-sagrada/as-traducoes-da-sbb/almeida-revista-e-corrigida/) e [cronologia de Almeida](https://www.sbb.org.br/nova-almeida/o/a-nova-almeida-atualizada/nova-almeida/o).
- Biblica, [Permissões, apps, áudio e IA](https://www.biblica.com/permissions/).
- eBible, [World English Bible Classic](https://ebible.org/bible/details.php?id=eng-web).
