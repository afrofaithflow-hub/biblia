# BiblIA — Fase de Dados Reais, Conta Opcional e Migração de Visitante

**Estado:** planeado. Nenhuma implementação desta fase é considerada concluída enquanto existir um valor de progresso, conta, ranking, amizade ou subscrição apresentado como se fosse real mas vier de um mock.

## 1. Objetivo

Transformar o BiblIA de protótipo local em aplicação *offline-first* com uma fonte de dados verificável:

- uma pessoa pode usar leitura, áudio e jornada sem criar conta;
- progresso local não se perde ao criar conta;
- uma conta preserva e sincroniza dados entre dispositivos;
- jogo, leitura, perfil, ranking, desafio diário e amizades leem dados coerentes;
- a interface mostra vazio, carregamento, modo offline ou erro de forma honesta — nunca números inventados.

## 2. Decisões de produto aprovadas

### Acesso inicial

- **Visitante local por defeito:** não há formulário obrigatório no primeiro acesso e não será criado utilizador anónimo no servidor nesta fase.
- **Conta como proteção de valor:** pedir para “Guardar meu progresso” somente após uma conquista útil: primeira fase terminada, três dias de sequência, criação de nota/favorito, ranking, amizade, clã, IA, compra ou troca de dispositivo.
- **Linguagem da interface:** usar “Guardar meu progresso” e “Entrar na minha conta”, em vez de forçar “Registar” logo ao abrir a app.

### Métodos de conta do primeiro lançamento

1. **Google** — botão principal em Android/web.
2. **E-mail + código de seis dígitos (OTP)** — alternativa universal, sem palavra-passe.
3. **Apple** — obrigatório antes da distribuição iOS, quando o canal iOS for iniciado.

Ficam fora deste lançamento: palavra-passe, telefone/SMS e Facebook Login. Facebook, WhatsApp e Messenger serão canais de partilha de convite, não identidade de conta nem fonte da lista de amigos.

### Convites e amizades

- Cada convite cria um código/link único, com expiração, limite de uso e criador identificável.
- O destinatário entra pelo método que preferir; ao aceitar, a amizade é criada no BiblIA.
- QR Code é o método presencial; partilha nativa é o método móvel; copiar link é o fallback universal.
- Não importar contactos nem lista de amigos de Facebook/Google.

## 3. Fonte de verdade por domínio

| Domínio | Fonte canónica | Cache/local | Regra de conflito |
|---|---|---|---|
| Sessão/autenticação | Supabase Auth | sessão segura do cliente | sessão válida vence |
| Perfil e plano | `profiles`, `subscriptions` | cache apenas para mostrar último estado | servidor vence |
| Leitura, favoritos, notas e destaques | tabelas de utilizador com RLS | dispositivo para offline | união por referência; última edição vence em notas |
| Jogo, XP, estrelas e fases | tentativas idempotentes + RPC do servidor | fila offline de tentativas | servidor recalcula recompensas por tentativa válida |
| Revisão espaçada | fila individual no servidor | fila local até sincronizar | chave `user_id + question_id`; maior prioridade de revisão vence |
| Ranking e ligas | snapshots calculados no servidor | nunca inventar posições | servidor vence |
| Amigos/grupos | relações bilaterais e convites no servidor | nenhum dado social fictício | servidor vence |
| Preferências de leitura/áudio | conta quando houver conta; dispositivo como preferência ativa | `localStorage` | preferência local ativa; sincronização opcional |

## 4. Fase D0 — Inventário e remoção de mocks

### Trabalho

1. Catalogar cada valor fixo, `setTimeout` simulador, perfil fictício, ranking estático, dados de fase pré-concluída, convite fictício e fallback que pareça real.
2. Classificar cada origem em: conteúdo canónico, cache offline, estado de carregamento, estado vazio ou mock a remover.
3. Remover valores de demonstração de progresso inicial, incluindo XP, talentos, vidas, streak e estrelas.
4. Substituir cada ecrã por estados explícitos: `a carregar`, `sem dados ainda`, `offline pendente de sincronização` e `erro com tentar novamente`.

### Porta de aceitação

- Pesquisa do código sem resultados para simuladores ativos de progresso/ranking/conta.
- Conta nova começa com estado real vazio; visitante começa com progresso local limpo e explicável.
- Nenhum botão anuncia amigos, subscrição, ranking ou sincronização sem dados reais disponíveis.

## 5. Fase D1 — Supabase, schema e RLS

### Trabalho

1. Criar/ligar o projeto Supabase de desenvolvimento.
2. Aplicar as migrações existentes e consolidar diferenças entre os catálogos de jogo.
3. Criar as tabelas ainda ausentes para progresso de leitura, favoritos, notas, destaques, preferências de conta e migração de visitante.
4. Criar `guest_migrations`/`device_claims` com `installation_id`, `user_id`, estado, data e chave de idempotência.
5. Rever todas as políticas RLS com cenários de visitante, utilizador autenticado e acesso indevido.
6. Criar uma função segura de sincronização de lote; o browser nunca escolhe XP, talentos, nível ou posição no ranking.

### Porta de aceitação

- Acesso direto à base com utilizador A não revela nem altera dados do utilizador B.
- Uma tentativa repetida não duplica XP, talentos, estrelas ou itens de revisão.
- Todas as alterações privilegiam operações idempotentes e filas offline recuperáveis.

## 6. Fase D2 — Visitante local e migração de progresso

### Trabalho

1. Gerar um `installation_id` local estável, sem e-mail ou identificação pessoal.
2. Guardar eventos locais com identificadores próprios: tentativa de jogo, leitura, nota, favorito, destaque e preferências.
3. No momento de criar/entrar na conta, apresentar resumo antes da migração: “X fases, Y favoritos, Z dias de sequência serão guardados”.
4. Enviar a migração uma vez, por lote e com recibo; poder continuar após rede falhar.
5. Aplicar as regras de união:
   - leituras, favoritos e destaques: unir sem duplicar;
   - notas: última edição vence, mantendo cópia local em conflito raro;
   - tentativas: enviar IDs únicos e recalcular recompensa no servidor;
   - XP/talentos: nunca somar agregados locais; derivar apenas de tentativas aceites;
   - sequência: servidor valida dias e fuso de Maputo.
6. Só limpar dados de visitante depois de confirmação persistida no servidor.

### Porta de aceitação

- Jogar offline, criar conta e entrar noutro aparelho preserva o progresso sem duplicar recompensas.
- Entrar numa conta existente não apaga leitura nem favorito local sem aviso.
- Falha de rede no meio da migração pode ser retomada sem perda.

## 7. Fase D3 — Entrar e criar conta

### Interface

- Modal/folha “Guardar meu progresso” com duas ações principais: **Continuar com Google** e **Receber código por e-mail**.
- Ecrã OTP: endereço, seis dígitos, reenvio com temporizador, trocar e-mail, erro claro e acessibilidade total.
- Ecrã “Entrar” usa os mesmos métodos: não duplicar os fluxos de Sign in e Sign up.
- Perfil inclui: estado da conta, método ligado, adicionar e-mail/Google, terminar sessão e eliminar conta.

### Configuração

- Configurar URLs autorizadas de desenvolvimento e produção, redirect seguro e modelo de e-mail BiblIA.
- Configurar Google OAuth com domínio, consentimento e ambiente de produção.
- Configurar Apple somente no marco iOS.
- Limitar pedidos de OTP, aplicar CAPTCHA/Turnstile se métricas indicarem abuso e nunca revelar se um e-mail já existe antes da verificação.

### Porta de aceitação

- Nova pessoa cria conta por Google ou OTP e mantém os dados de visitante.
- Pessoa existente entra sem criar segunda conta.
- Conta sem método não pode ficar sem alternativa de recuperação; remoção de identidade exige outra identidade ligada.

## 8. Fase D4 — Sincronização offline-first e estados de interface

### Trabalho

1. Criar fila única para alterações offline, com ordem, tentativa, repetição limitada e estado visível.
2. Sincronizar ao recuperar rede, abrir a app e terminar uma sessão importante.
3. Substituir listas de demonstração por consultas reais paginadas: ranking, amigos, revisões, histórico e fases.
4. Exibir selo discreto de “Guardado neste dispositivo” ou “Sincronizado” quando isso for material à decisão da pessoa.
5. Registrar erros técnicos sem mostrar detalhes sensíveis ao utilizador.

### Porta de aceitação

- Desligar rede não bloqueia leitura nem jogo local.
- Recuperar rede sincroniza sem duplicar nem alterar resultados válidos.
- Ranking e amigos mostram estado vazio real até existir dado suficiente.

## 9. Fase D5 — Convites, amigos e partilha

### Trabalho

1. Reutilizar as relações, convites e bloqueios já definidos no schema social, removendo quaisquer cartões simulados.
2. Criar convite por link/código, QR Code e partilha nativa.
3. Usar partilha nativa para permitir ao utilizador escolher Facebook, WhatsApp, Messenger, SMS ou outro destino instalado; incluir fallback de copiar link.
4. Validar expiração, máximo de usos, auto-convite, bloqueio mútuo e aceitação idempotente.
5. Exigir conta para criar/aceitar amizade, mas não para receber/abrir o convite.

### Porta de aceitação

- Um convite enviado por Facebook funciona mesmo que ambos usem Google ou OTP para as respetivas contas BiblIA.
- Aceitar duas vezes não cria amizade duplicada.
- Bloqueio e denúncia impedem reconexão indevida.

## 10. Sequência de execução

1. D0 — inventário e remoção de mocks.
2. D1 — projeto Supabase, migrações e RLS.
3. D2 — eventos locais e migração de visitante.
4. D3 — Google e OTP por e-mail.
5. D4 — sincronização e todos os estados reais de interface.
6. D5 — convites por link/QR/partilha.
7. Auditoria: testes de dois utilizadores, dois dispositivos, offline, conta existente, bloqueio, convite expirado e tentativa duplicada.

## 11. Critério de conclusão

A fase só termina quando uma pessoa conseguir usar a app como visitante, criar ou recuperar uma conta, preservar os dados anteriores, continuar em outro dispositivo e convidar um amigo por link/QR sem Facebook Login. O perfil, jogo, leitura, ranking, amigos e desafios devem apresentar apenas dados reais, cache claramente identificado ou estado vazio/erro explícito.

## 12. Fora do escopo desta fase

- Completar conteúdo de todos os sete mundos;
- pagamentos reais;
- IA teológica com fornecedor ativo;
- importação de contactos ou lista de amigos de redes sociais;
- chat privado entre amigos;
- palavra-passe e autenticação por SMS.
