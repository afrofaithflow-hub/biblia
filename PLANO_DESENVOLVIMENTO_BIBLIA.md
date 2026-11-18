# BiblIA — Plano de Desenvolvimento até à Finalização

**Revisão:** 2 — calibrada ao estado observado do projeto  
**Data:** 08 de novembro de 2026  
**Fuso horário:** Africa/Maputo  
**Estado:** Plano de referência; estimativas sujeitas a dependências externas  
**Assinatura:** Codex

## Objetivo de conclusão

Lançar uma aplicação bíblica responsiva, estável e segura para ler e ouvir conteúdo bíblico licenciado, acompanhar planos e progresso, participar na jornada gamificada e usar o assistente IA. Contas, progresso, IA e pagamentos devem usar serviços reais e seguros quando anunciados como funcionalidades ativas. A publicação inclui piloto, monitorização, suporte e recuperação.

## Estado atual considerado

- As 31 variantes do Protótipo 2.1 estão mapeadas e a interface principal está implementada em React/Vite; a responsividade do layout e do modal de fase foi recentemente ajustada.
- O motor de áudio procedural e TTS em português já existe em `src/lib/audioEngine.ts`. A fase de áudio deve integrá-lo com o leitor e conteúdo final, não reconstruir o motor.
- As quatro modalidades de jogo já têm telas. A revisão do código encontrou perguntas fixas de demonstração, sessões incompletas, vidas que não encerram a partida e métricas do Desafio Diário estáticas. O próximo trabalho é aprofundar os fluxos do frontend e definir os dados necessários antes do schema definitivo.
- Auth tem caminho Supabase e fallback de sandbox; persistência de perfil/progresso, IA e pagamentos ainda exigem integração de produção e validação.

## Roteiro otimizado

| Fase | Estimativa | Entregáveis | Critério de saída |
|---|---:|---|---|
| 0. Escopo e dependências | 1–2 dias, em paralelo | Confirmar público e funcionalidades do primeiro lançamento, direitos/fontes do texto bíblico, ambiente Supabase, fornecedor de IA e disponibilidade de pagamento para o mercado-alvo. Registar decisões e responsáveis. | Escopo de MVP, conteúdo e dependências conhecidos; riscos externos com responsável e próximo passo. |
| 1. Aprofundar modalidades de jogo no frontend | 3–5 dias | Tornar Quiz, Verdadeiro/Falso e Completar Versículo sessões completas com questões de dados, avanço, feedback explicativo, pontuação, vidas e estados de conclusão/falha. Tornar o Desafio Diário baseado na data e refletir conclusão/sequência localmente como preparação para sincronização. Atualizar resumo/recompensa para usar o resultado da sessão, sem alegar persistência de servidor. | Percursos completos e coerentes nas quatro modalidades; regras explícitas e dados necessários ao backend identificados. |
| 2. Conteúdo bíblico, leitor e áudio | 4–7 dias | Confirmar fonte e licença do texto; ligar livros/capítulos/versículos ao leitor e ao áudio existente; seleção de versão, retoma e sincronização de leitura/voz. Definir comportamento offline em função do conteúdo e licenças disponíveis. | Leitura e áudio usam conteúdo autorizado e a mesma referência; retoma e erros de carregamento tratados. Motor TTS existente preservado. |
| 3. Supabase: contas, schema e sincronização | 5–8 dias | Configurar ambientes de dev e produção, migrações, RLS, perfil, preferências, progresso bíblico, sessões/resultados de jogo, XP e streak. Migrar fallback de sandbox com separação clara e sincronizar dispositivos. | Percursos de conta e dados persistidos validados; isolamento RLS verificado; esquema suporta os resultados definidos na Fase 1. |
| 4. Assistente IA seguro | 4–6 dias | Edge Function ou backend para o provedor selecionado; segredo fora do browser; limites de uso por plano, referências, tratamento de falha e limites pastorais claros. | Chamada real funciona através do backend, limites são aplicados no servidor e falhas têm estado recuperável. |
| 5. Membresia e pagamentos reais | 5–8 dias, dependente de fornecedor | Escolher gateway e mercados; checkout sandbox, webhooks verificados no servidor, ativação/cancelamento/expiração, reconciliação e remoção do simulador da experiência de produção. | Estados de subscrição só mudam com eventos confiáveis; cenários de sucesso, falha e cancelamento validados no sandbox. |
| 6. Hardening, piloto e lançamento | 5–7 dias | Rever segurança, acessibilidade, desempenho, navegação em dispositivos reais, logs, backups, variáveis de produção, deploy e rollback. Piloto limitado e correção dos bloqueadores observados. | Sem bloqueadores críticos conhecidos; deploy reproduzível, monitorização e suporte preparados; piloto aprovado. |

**Estimativa indicativa:** cerca de **5–7 semanas** de trabalho focado, com assistência de IA e decisões rápidas. É uma meta de execução, não uma garantia: aprovações de conteúdo, configuração de contas/serviços externos ou disponibilidade regional de pagamentos podem alongar o calendário. As fases 1 e 2 podem avançar enquanto se confirmam dependências da fase 0; pagamentos não bloqueiam um lançamento inicial gratuito se essa for a decisão de produto.

## Ordem prática de execução

1. Agora: aprofundar as quatro modalidades no frontend e fechar os formatos de dados para resultados.
2. Em paralelo: confirmar escopo, conteúdo/licenças e fornecedores.
3. Ligar leitura/áudio ao conteúdo autorizado; manter o motor de áudio já implementado.
4. Criar schema e RLS com base nos fluxos e resultados efetivamente definidos.
5. Integrar IA e pagamentos por backend seguro; não expor segredos no bundle frontend.
6. Fazer hardening, piloto e publicação gradual.

## Regras de execução e conclusão

- Cada fase tem critérios de saída observáveis e revisão em mobile, tablet e desktop.
- Funcionalidade simulada deve ser identificada como demonstração e nunca contada como integração real.
- Cada atualização é registada em `bibliadev.md` com data e hora de Maputo, estado e assinatura; manter também a cópia sincronizada `bibliadev`.
- Rever estimativas no fim de cada fase. Registar mudanças de escopo, dependências, bloqueios e decisões sem apagar o histórico.
- Só declarar o BiblIA finalizado depois do piloto, deploy de produção, monitorização, backups e processo de suporte estarem verificados.
