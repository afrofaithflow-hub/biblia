/**
 * BiblIA — Catálogo de Jornadas de Leitura
 * 
 * Regras Editoriais:
 * - Jornadas curtas e longas: percursos gratuitos variados e imersões Premium
 * - Pílulas de Contexto histórico/literário verificadas
 * - Reflexão aberta para aplicação prática
 * - Desafio opcional com 2 perguntas de validação textual (não bloqueia leitura)
 * - Leitura integrada via navegação canônica
 * 
 * Data: 17 de novembro de 2026 | Antigravity AI Engine
 */

import type { ReadingPlan } from '../types/readingPlanTypes';
import { EXTENDED_READING_PLANS } from './extendedReadingPlans';

export const READING_PLANS: ReadingPlan[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. 7 Dias com Jesus — Marcos (Free)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'sete-dias-jesus',
    title: '7 Dias com Jesus',
    subtitle: 'Uma semana no Evangelho de Marcos',
    description: 'Acompanhe os principais movimentos do Evangelho mais dinâmico do Novo Testamento. Conheça as ações, os ensinamentos e a autoridade transformadora de Jesus.',
    category: 'primeiros-passos',
    tier: 'free',
    sprintDays: 7,
    icon: 'auto_stories',
    accentColor: '#10b981', // emerald
    badge: {
      icon: '✝️',
      label: 'Caminho com Jesus',
    },
    totalXp: 140, // 20 XP por dia concluído
    days: [
      {
        dayNumber: 1,
        title: 'O início das boas-novas',
        devotionalSnippet: 'Marcos inicia sem genealogias nem narrativas de infância: parte direto para o ministério no deserto. João Batista proclama arrependimento e batismo, e Jesus é ungido pelo Espírito antes de inaugurar o anúncio do Reino de Deus.',
        devotionalSource: 'Evangelho de Marcos — contexto histórico da Judeia do séc. I.',
        reflectionPrompt: 'O que significa para você hoje dar um primeiro passo de renovação e aproximação de Deus?',
        passages: [{ bookId: 'marcos', chapter: 1, verseStart: 1, verseEnd: 20, label: 'Marcos 1:1–20' }],
        quizQuestions: [
          {
            id: 'mc1-q1',
            question: 'Quem pregava no deserto anunciando que vinha alguém mais forte?',
            options: ['Elias', 'João Batista', 'Moisés', 'Isaías'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: 'mc1-q2',
            question: 'Quais foram os primeiros pescadores chamados por Jesus junto ao mar da Galileia?',
            options: ['Simão e André', 'Mateus e Tomé', 'Tiago e Filipe', 'Nicodemos e Lázaro'],
            correctIndex: 0,
            xpReward: 5,
          },
        ],
        xpReward: 20,
      },
      {
        dayNumber: 2,
        title: 'Autoridade que restaura',
        devotionalSnippet: 'Na sinagoga de Cafarnaum, a multidão surpreende-se com o ensino de Jesus, que difere da erudição convencional dos escribas. Em seguida, a autoridade divina manifesta-se em libertação e na cura da sogra de Pedro e de muitos enfermos.',
        devotionalSource: 'Cafarnaum era o centro de atividade urbana de Jesus junto ao mar.',
        reflectionPrompt: 'Em que áreas da sua vida cotidiana você mais sente necessidade do toque restaurador de Jesus?',
        passages: [{ bookId: 'marcos', chapter: 1, verseStart: 21, verseEnd: 45, label: 'Marcos 1:21–45' }],
        quizQuestions: [
          {
            id: 'mc2-q1',
            question: 'Onde Jesus ensinava quando todos ficaram admirados com a sua doutrina?',
            options: ['No palácio de Herodes', 'Na sinagoga de Cafarnaum', 'No deserto de Judá', 'No templo de Samaria'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: 'mc2-q2',
            question: 'Quem Jesus curou ao entrar na casa de Simão e André?',
            options: ['A sogra de Simão', 'Um centurião romano', 'A filha de Jairo', 'Um mendigo cego'],
            correctIndex: 0,
            xpReward: 5,
          },
        ],
        xpReward: 20,
      },
      {
        dayNumber: 3,
        title: 'Histórias do Reino',
        devotionalSnippet: 'Jesus emprega parábolas agrícolas familiares ao público rural galileu. A parábola do semeador revela que a semente da Palavra encontra diferentes disposições de coração, e as parábolas da semente que cresce por si e do grão de mostarda mostram o crescimento paciente do Reino.',
        devotionalSource: 'Ambiente agrícola da Galileia do primeiro século.',
        reflectionPrompt: 'Que distrações ou preocupações têm ameaçado sufocar o crescimento espiritual no seu dia a dia?',
        passages: [{ bookId: 'marcos', chapter: 4, verseStart: 1, verseEnd: 34, label: 'Marcos 4:1–34' }],
        quizQuestions: [
          {
            id: 'mc3-q1',
            question: 'Na parábola do semeador, que semente produziu fruto a trinta, sessenta e cem por um?',
            options: ['A que caiu no caminho', 'A que caiu em boa terra', 'A que caiu entre espinhos', 'A que caiu nas pedras'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: 'mc3-q2',
            question: 'A que pequena semente Jesus compara o Reino de Deus ao descrever o seu crescimento?',
            options: ['Grão de trigo', 'Semente de figo', 'Grão de mostarda', 'Caroço de azeitona'],
            correctIndex: 2,
            xpReward: 5,
          },
        ],
        xpReward: 20,
      },
      {
        dayNumber: 4,
        title: 'Quem é Jesus?',
        devotionalSnippet: 'Ao acalmar o vento e o mar em plena tempestade noturna, e mais adiante ao restaurar a vida da filha de Jairo e atender à mulher aflita com hemorragia, Jesus responde em ações à interrogação dos discípulos: quem é este a quem até a natureza e a morte obedecem?',
        devotionalSource: 'Cruzando as duas margens do mar da Galileia.',
        reflectionPrompt: 'Quando o medo da tempestade surge, onde costuma buscar segurança em primeiro lugar?',
        passages: [
          { bookId: 'marcos', chapter: 4, verseStart: 35, verseEnd: 41, label: 'Marcos 4:35–41' },
          { bookId: 'marcos', chapter: 5, verseStart: 21, verseEnd: 43, label: 'Marcos 5:21–43' },
        ],
        quizQuestions: [
          {
            id: 'mc4-q1',
            question: 'O que Jesus disse ao mar bravio quando os discípulos temiam afundar?',
            options: ['Rema com força', 'Cala-te, aquieta-te', 'Confiai no capitão', 'Lançai as redes'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: 'mc4-q2',
            question: 'Qual era a função de Jairo na comunidade quando buscou Jesus para acudir a sua filha?',
            options: ['Sacerdote supremo', 'Governador romano', 'Chefe da sinagoga', 'Fariseu de Jerusalém'],
            correctIndex: 2,
            xpReward: 5,
          },
        ],
        xpReward: 20,
      },
      {
        dayNumber: 5,
        title: 'Compaixão e provisão',
        devotionalSnippet: 'Diante de multidões cansadas no deserto, Jesus manifesta compaixão e alimenta milhares com poucos pães e peixes. Pouco depois, em território gentio de Tiro e Sídon, acolhe a fé de uma mãe estrangeira siro-fenícia, ampliando os horizontes da misericórdia.',
        devotionalSource: 'Regiões da Galileia e províncias vizinhas de Fenícia e Decápolis.',
        reflectionPrompt: 'De que maneira você pode exercer compaixão prática por alguém que está vulnerável ao seu redor?',
        passages: [
          { bookId: 'marcos', chapter: 6, verseStart: 30, verseEnd: 44, label: 'Marcos 6:30–44' },
          { bookId: 'marcos', chapter: 7, verseStart: 24, verseEnd: 37, label: 'Marcos 7:24–37' },
        ],
        quizQuestions: [
          {
            id: 'mc5-q1',
            question: 'Quantos pães e peixes os discípulos tinham antes da primeira multiplicação?',
            options: ['Cinco pães e dois peixes', 'Sete pães e três peixes', 'Doze pães e quatro peixes', 'Três pães e um peixe'],
            correctIndex: 0,
            xpReward: 5,
          },
          {
            id: 'mc5-q2',
            question: 'De que origem era a mulher que pediu a cura da filha na região de Tiro e Sídon?',
            options: ['Samaritana', 'Romana', 'Siro-fenícia', 'Egípcia'],
            correctIndex: 2,
            xpReward: 5,
          },
        ],
        xpReward: 20,
      },
      {
        dayNumber: 6,
        title: 'O caminho do serviço',
        devotionalSnippet: 'Em Cesareia de Filipe, Pedro confessa que Jesus é o Cristo. Logo em seguida, Jesus inverte as expectativas triunfalistas: quem quiser ser o maior deve ser o que serve a todos, e o Filho do Homem veio para dar a vida em resgate de muitos.',
        devotionalSource: 'Estrada ao norte da Judeia em direção a Jerusalém.',
        reflectionPrompt: 'Onde o conceito bíblico de servir a outros desafia suas ambições pessoais?',
        passages: [
          { bookId: 'marcos', chapter: 8, verseStart: 27, verseEnd: 38, label: 'Marcos 8:27–38' },
          { bookId: 'marcos', chapter: 10, verseStart: 35, verseEnd: 45, label: 'Marcos 10:35–45' },
        ],
        quizQuestions: [
          {
            id: 'mc6-q1',
            question: 'O que Pedro respondeu à pergunta de Jesus: "E vós, quem dizeis que eu sou?"',
            options: ['Tu és João Batista', 'Tu és Elias', 'Tu és o Cristo', 'Tu és um dos profetas'],
            correctIndex: 2,
            xpReward: 5,
          },
          {
            id: 'mc6-q2',
            question: 'Segundo Marcos 10:45, a que propósito veio o Filho do Homem?',
            options: ['Para ser servido', 'Para governar com ferro', 'Para servir e dar a sua vida', 'Para condenar os poderosos'],
            correctIndex: 2,
            xpReward: 5,
          },
        ],
        xpReward: 20,
      },
      {
        dayNumber: 7,
        title: 'Cruz e ressurreição',
        devotionalSnippet: 'No Gólgota, o centurião romano que presencia a morte de Jesus reconhece: "Verdadeiramente este homem era Filho de Deus". No primeiro dia da semana, as mulheres encontram a pedra rolada e o mensageiro que anuncia: Ele ressuscitou, não está aqui!',
        devotionalSource: 'Jerusalém — narração pascal nos manuscritos primitivos de Marcos.',
        reflectionPrompt: 'Como a realidade viva da ressurreição transforma sua esperança quanto ao futuro?',
        passages: [
          { bookId: 'marcos', chapter: 15, verseStart: 33, verseEnd: 39, label: 'Marcos 15:33–39' },
          { bookId: 'marcos', chapter: 16, verseStart: 1, verseEnd: 8, label: 'Marcos 16:1–8' },
        ],
        quizQuestions: [
          {
            id: 'mc7-q1',
            question: 'Quem declarou aos pés da cruz: "Verdadeiramente este homem era o Filho de Deus"?',
            options: ['Pilatos', 'O centurião romano', 'José de Arimateia', 'Simão Cirineu'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: 'mc7-q2',
            question: 'O que o jovem vestido de branco anunciou às mulheres que chegaram ao sepulcro?',
            options: ['O corpo foi levado', 'Ele não está aqui, já ressuscitou', 'Esperai até amanhã', 'Buscai os guardas'],
            correctIndex: 1,
            xpReward: 5,
          },
        ],
        xpReward: 20,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Paz para Hoje — Salmos (Free)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'paz-para-hoje',
    title: 'Paz para Hoje',
    subtitle: '5 dias de consolo e refúgio nos Salmos',
    description: 'Palavras sinceras para momentos de ansiedade, cansaço ou oração pessoal. Encontre descanso e segurança na proteção contínua de Deus.',
    category: 'saude-emocional',
    tier: 'free',
    sprintDays: 5,
    icon: 'spa',
    accentColor: '#8b5cf6', // purple
    badge: {
      icon: '🕊️',
      label: 'Refúgio',
    },
    totalXp: 100, // 20 XP por dia concluído
    days: [
      {
        dayNumber: 1,
        title: 'Levar a preocupação a Deus',
        devotionalSnippet: 'Salmo 13 começa com a queixa honesta do coração abatido: "Até quando, Senhor?". A poesia bíblica não mascara a tristeza nem exige fingimento; pelo contrário, transforma o lamento sincero em confiança na fidelidade de Deus.',
        devotionalSource: 'Salmo individual de lamentação e confiança — tradição davídica.',
        reflectionPrompt: 'Que sentimentos pesados você precisa apresentar a Deus com total honestidade hoje?',
        passages: [{ bookId: 'salmos', chapter: 13, label: 'Salmo 13' }],
        quizQuestions: [
          {
            id: 'sl13-q1',
            question: 'Com que pergunta insistente começa o Salmo 13?',
            options: ['Por que te abates, ó minha alma?', 'Até quando, Senhor?', 'Onde está o meu socorro?', 'Quem subirá ao monte santo?'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: 'sl13-q2',
            question: 'Em que o salmista afirma confiar no versículo 5, mesmo após a aflição?',
            options: ['Na sua própria força', 'Na misericórdia do Senhor', 'No apoio dos amigos', 'Na riqueza'],
            correctIndex: 1,
            xpReward: 5,
          },
        ],
        xpReward: 20,
      },
      {
        dayNumber: 2,
        title: 'Refúgio em tempos difíceis',
        devotionalSnippet: 'Salmo 46 proclama Deus como socorro bem presente nas tribulações, ainda que as montanhas estremeçam e os mares se agitem. A célebre exortação "Aquietai-vos e sabei que eu sou Deus" convida a descansar na soberania divina.',
        devotionalSource: 'Cântico dos filhos de Corá — hino de confiança em Sião.',
        reflectionPrompt: 'O que o ajuda a desacelerar a mente para reconhecer a presença sustentadora de Deus?',
        passages: [{ bookId: 'salmos', chapter: 46, verseStart: 1, verseEnd: 11, label: 'Salmo 46:1–11' }],
        quizQuestions: [
          {
            id: 'sl46-q1',
            question: 'De acordo com o Salmo 46:1, Deus é o nosso refúgio, fortaleza e...?',
            options: ['Juiz implacável', 'Socorro bem presente na angústia', 'Escudo contra o vento', 'Rei distante'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: 'sl46-q2',
            question: 'Qual é o convite formulado no versículo 10 do Salmo 46?',
            options: ['Correi com paciência', 'Aquietai-vos e sabei que eu sou Deus', 'Lutai sem cessar', 'Buscai a glória humana'],
            correctIndex: 1,
            xpReward: 5,
          },
        ],
        xpReward: 20,
      },
      {
        dayNumber: 3,
        title: 'Descanso e cuidado',
        devotionalSnippet: 'O Salmo 23 emprega a imagem do pastor diligente para ilustrar a provisão e o cuidado nos vales escuros da existência. A certeza de que a bondade e a misericórdia seguirão o salmista em todos os dias dissipa o medo da solidão.',
        devotionalSource: 'O saltério davídico clássico de pastoreio e hospedagem sagrada.',
        reflectionPrompt: 'Ao pensar na metáfora do Bom Pastor, que área da sua rotina mais carece de descanso?',
        passages: [{ bookId: 'salmos', chapter: 23, label: 'Salmo 23' }],
        quizQuestions: [
          {
            id: 'sl23-q1',
            question: 'Onde o Senhor faz o salmista repousar, conforme o Salmo 23:2?',
            options: ['Em palácios de marfim', 'Em verdes pastos', 'No alto da montanha', 'À sombra da tenda'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: 'sl23-q2',
            question: 'O que consome o temor mesmo ao passar pelo vale da sombra da morte?',
            options: ['A companhia e a vara/cajado do Pastor', 'A espada de guerra', 'A rapidez dos passos', 'A luz do sol'],
            correctIndex: 0,
            xpReward: 5,
          },
        ],
        xpReward: 20,
      },
      {
        dayNumber: 4,
        title: 'Quando o medo aparece',
        devotionalSnippet: 'Davi compôs o Salmo 56 sob forte hostilidade e perigo iminente. Em vez de ceder ao pânico, formula uma oração inesquecível: "Em me vindo o temor, hei de confiar em ti". A fé bíblica não é a ausência de medo, mas a decisão de confiar apesar dele.',
        devotionalSource: 'Memória poética ligada aos dias de exílio e perseguição em Gate.',
        reflectionPrompt: 'Quando o medo bate à porta, que promessa ou oração ajuda a reorientar seus pensamentos?',
        passages: [{ bookId: 'salmos', chapter: 56, verseStart: 1, verseEnd: 13, label: 'Salmo 56:1–13' }],
        quizQuestions: [
          {
            id: 'sl56-q1',
            question: 'O que o salmista resolve fazer no momento em que o temor surge (v. 3)?',
            options: ['Fugir para outra terra', 'Confiar em Deus', 'Construir muralhas', 'Retaliar os opositores'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: 'sl56-q2',
            question: 'Onde o salmista pede que Deus recolha as suas lágrimas (v. 8)?',
            options: ['No rio sagrado', 'No seu odre / livro de memória', 'No altar de incenso', 'Na taça de ouro'],
            correctIndex: 1,
            xpReward: 5,
          },
        ],
        xpReward: 20,
      },
      {
        dayNumber: 5,
        title: 'Esperar com esperança',
        devotionalSnippet: 'Salmo 121 era cantado pelos peregrinos que subiam as colinas perigosas rumo a Jerusalém. O Senhor é apresentado como guardião constante, que não toscaneja nem dorme, guardando a entrada e a saída desde agora e para sempre.',
        devotionalSource: 'Cântico de Romagem / Degraus — itinerário de peregrinação bíblica.',
        reflectionPrompt: 'Como saber que o guarda de Israel não dorme impacta o seu sono e a sua tranquilidade hoje?',
        passages: [{ bookId: 'salmos', chapter: 121, label: 'Salmo 121' }],
        quizQuestions: [
          {
            id: 'sl121-q1',
            question: 'De onde vem o socorro, segundo a conclusão do Salmo 121:2?',
            options: ['Das colinas vizinhas', 'Do Senhor, que fez os céus e a terra', 'Dos exércitos de Israel', 'Das fortalezas de pedra'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: 'sl121-q2',
            question: 'O que o Salmo 121 afirma a respeito da vigilância do guarda de Israel?',
            options: ['Dorme apenas ao meio-dia', 'Não dormitará nem dormirá', 'Descansa aos sábados', 'Precisa de sentinelas'],
            correctIndex: 1,
            xpReward: 5,
          },
        ],
        xpReward: 20,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. A Jornada do Êxodo — Premium (Plus)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'jornada-exodo',
    title: 'A Jornada do Êxodo',
    subtitle: 'Da opressão à aliança no deserto — 7 dias',
    description: 'Siga a trajetória de libertação, travessia e aliança do povo hebreu com referências históricas e notas de contexto arqueológico verificadas.',
    category: 'historia-biblica',
    tier: 'plus',
    sprintDays: 7,
    icon: 'route',
    accentColor: '#f59e0b', // amber
    badge: {
      icon: '🌊',
      label: 'Caminho da Liberdade',
    },
    totalXp: 175,
    days: [
      {
        dayNumber: 1,
        title: 'O clamor do povo e o chamado de Moisés',
        devotionalSnippet: 'Deus ouve o gemido dos cativos sob a escravidão egípcia e lembra-se da aliança. No deserto de Horebe, a sarça ardente que não se consome revela o nome inefável do Deus vivo: "EU SOU O QUE SOU".',
        devotionalSource: 'Êxodo 2–3 — contexto histórico da dinastia faraônica no delta do Nilo.',
        reflectionPrompt: 'De que modo a compaixão de Deus pelo sofrimento humano fortalece sua esperança em tempos duros?',
        passages: [
          { bookId: 'exodo', chapter: 2, verseStart: 23, verseEnd: 25, label: 'Êxodo 2:23–25' },
          { bookId: 'exodo', chapter: 3, verseStart: 1, verseEnd: 15, label: 'Êxodo 3:1–15' },
        ],
        quizQuestions: [
          {
            id: 'ex1-q1',
            question: 'Em que monte Moisés avistou a sarça que ardia sem se consumir?',
            options: ['Monte Sinai / Horebe', 'Monte Hermom', 'Monte Carmelo', 'Monte Tabor'],
            correctIndex: 0,
            xpReward: 5,
          },
          {
            id: 'ex1-q2',
            question: 'Que nome Deus revelou a Moisés para declarar aos israelitas?',
            options: ['O Senhor dos Exércitos', 'EU SOU O QUE SOU', 'Criador do Nilo', 'O Deus Oculto'],
            correctIndex: 1,
            xpReward: 5,
          },
        ],
        xpReward: 25,
      },
      {
        dayNumber: 2,
        title: 'Confronto com Faraó',
        devotionalSnippet: 'Moisés e Arão apresentam a ordem divina: "Deixa ir o meu povo". A recusa de Faraó e o endurecimento das condições de servidão iniciam a série de juízos que expõem a impotência dos deuses egípcios diante do Criador.',
        devotionalSource: 'O panteão egípcio e a autoridade absoluta dos faraós da época.',
        reflectionPrompt: 'Como você lida com situações em que a resistência ou oposição parecem intransponíveis?',
        passages: [
          { bookId: 'exodo', chapter: 5, verseStart: 1, verseEnd: 9, label: 'Êxodo 5:1–9' },
          { bookId: 'exodo', chapter: 7, verseStart: 1, verseEnd: 7, label: 'Êxodo 7:1–7' },
        ],
        quizQuestions: [
          {
            id: 'ex2-q1',
            question: 'Qual foi a resposta inicial de Faraó à mensagem trazida por Moisés e Arão?',
            options: ['Concedeu três dias de trégua', 'Quem é o Senhor para que eu ouça a sua voz?', 'Mandou consultar os sacerdotes', 'Ofereceu ouro e prata'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: 'ex2-q2',
            question: 'Quem Deus designou como porta-voz e profeta junto a Moisés?',
            options: ['Josué', 'Hur', 'Arão', 'Jetro'],
            correctIndex: 2,
            xpReward: 5,
          },
        ],
        xpReward: 25,
      },
      {
        dayNumber: 3,
        title: 'A Páscoa e a saída',
        devotionalSnippet: 'A instituição da Páscoa (Pêssach) marca a redenção dos hebreus. O sangue do cordeiro colocado nos umbrais das portas protege as famílias, e o povo parte em prontidão, encerrando séculos de cativeiro.',
        devotionalSource: 'Rito pascoal fundacional do calendário hebraico primitivo.',
        reflectionPrompt: 'O que representa para você o conceito bíblico de redenção e recomeço em liberdade?',
        passages: [
          { bookId: 'exodo', chapter: 12, verseStart: 1, verseEnd: 14, label: 'Êxodo 12:1–14' },
          { bookId: 'exodo', chapter: 12, verseStart: 29, verseEnd: 42, label: 'Êxodo 12:29–42' },
        ],
        quizQuestions: [
          {
            id: 'ex3-q1',
            question: 'Onde devia ser aplicado o sangue do cordeiro pascoal na noite da libertação?',
            options: ['Nas roupas dos líderes', 'Nos umbrais e na verga das portas', 'No chão da entrada', 'No altar de terra'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: 'ex3-q2',
            question: 'Como o povo devia comer a refeição da Páscoa naquela noite solene?',
            options: ['Deitados em festa', 'Com os lombos cingidos, prontos para marchar', 'Em jejum prolongado', 'Em silêncio fúnebre'],
            correctIndex: 1,
            xpReward: 5,
          },
        ],
        xpReward: 25,
      },
      {
        dayNumber: 4,
        title: 'A travessia do mar',
        devotionalSnippet: 'Encurralados entre os carros de combate egípcios e o mar, os israelitas entram em desespero. A instrução de Deus por meio de Moisés desafia a lógica humana: "Dize aos filhos de Israel que marchem". As águas se abrem em caminho seguro.',
        devotionalSource: 'Região do Yam Suph (Mar dos Juncos) e rotas migratórias do Sinai.',
        reflectionPrompt: 'Em que momentos você precisou dar um passo de fé antes de enxergar o caminho completamente aberto?',
        passages: [{ bookId: 'exodo', chapter: 14, verseStart: 10, verseEnd: 31, label: 'Êxodo 14:10–31' }],
        quizQuestions: [
          {
            id: 'ex4-q1',
            question: 'O que Moisés disse ao povo assustado diante do mar e dos carros egípcios?',
            options: ['Fugi para os rochedos', 'Não temais; aquietai-vos e vede o livramento do Senhor', 'Preparai vossas lanças', 'Negociai com Faraó'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: 'ex4-q2',
            question: 'O que dividiu o mar durante a noite para abrir caminho seco aos israelitas?',
            options: ['Um terremoto violento', 'Um forte vento oriental soprado por Deus', 'Um dilúvio de chuva', 'A maré natural'],
            correctIndex: 1,
            xpReward: 5,
          },
        ],
        xpReward: 25,
      },
      {
        dayNumber: 5,
        title: 'Provisão no deserto',
        devotionalSnippet: 'Nas agruras da aridez, a escassez de pão e água suscita murmurações. Deus responde com a dádiva cotidiana do maná e água brotando da rocha em Massá e Meribá, ensinando que a sustentação da vida depende da fidelidade diária.',
        devotionalSource: 'Oásis e rotas de pastoreio do planalto do deserto de Sim.',
        reflectionPrompt: 'Como você exercita a gratidão e a dependência de Deus nas necessidades do dia a dia?',
        passages: [
          { bookId: 'exodo', chapter: 16, verseStart: 1, verseEnd: 18, label: 'Êxodo 16:1–18' },
          { bookId: 'exodo', chapter: 17, verseStart: 1, verseEnd: 7, label: 'Êxodo 17:1–7' },
        ],
        quizQuestions: [
          {
            id: 'ex5-q1',
            question: 'Qual era a instrução sobre a quantidade de maná a ser colhida em cada dia comum?',
            options: ['O dobro para a semana inteira', 'Apenas a porção necessária para o dia', 'Dez medidas por família', 'Tudo o que pudessem carregar'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: 'ex5-q2',
            question: 'De onde brotou água para saciar a sede do povo quando chegaram a Refidim?',
            options: ['De um poço cavado na areia', 'Da rocha em Horebe que Moisés feriu com a vara', 'De uma nuvem baixa', 'Do rio Jordão'],
            correctIndex: 1,
            xpReward: 5,
          },
        ],
        xpReward: 25,
      },
      {
        dayNumber: 6,
        title: 'Sinai e aliança',
        devotionalSnippet: 'Diante do monte Sinai cercado de fumaça e trovões, a aliança é solenemente proposta. Os Dez Mandamentos (Decálogo) estabelecem as bases de reverência a Deus e de justiça, solidariedade e proteção social na comunidade.',
        devotionalSource: 'Formato de tratado de suserania e aliança do Antigo Oriente Próximo.',
        reflectionPrompt: 'Quais dos princípios dos Dez Mandamentos mais protegem as relações humanas na sociedade?',
        passages: [
          { bookId: 'exodo', chapter: 19, verseStart: 1, verseEnd: 8, label: 'Êxodo 19:1–8' },
          { bookId: 'exodo', chapter: 20, verseStart: 1, verseEnd: 17, label: 'Êxodo 20:1–17' },
        ],
        quizQuestions: [
          {
            id: 'ex6-q1',
            question: 'O que o povo respondeu a uma voz após ouvir a proposta da aliança (Êxodo 19:8)?',
            options: ['Preferimos leis mais breves', 'Tudo o que o Senhor falou faremos', 'Moisés decidirá por nós', 'Não temos certeza'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: 'ex6-q2',
            question: 'Qual mandamento é acompanhado pela promessa de prolongamento dos dias sobre a terra?',
            options: ['Não furtarás', 'Honra a teu pai e a tua mãe', 'Não cobiçarás', 'Não pronunciarás falso testemunho'],
            correctIndex: 1,
            xpReward: 5,
          },
        ],
        xpReward: 25,
      },
      {
        dayNumber: 7,
        title: 'Presença no caminho',
        devotionalSnippet: 'Moisés suplica pela presença de Deus: "Se a tua presença não for conosco, não nos faças subir daqui". Ao concluir a edificação do Tabernáculo, a glória do Senhor enche o santuário, e a nuvem guia o acampamento em todas as suas jornadas.',
        devotionalSource: 'O Tabernáculo como tenda do encontro e santuário móvel de Israel.',
        reflectionPrompt: 'O que tem prioridade na sua caminhada: os objetivos alcançados ou a presença de Deus ao longo do caminho?',
        passages: [
          { bookId: 'exodo', chapter: 33, verseStart: 12, verseEnd: 23, label: 'Êxodo 33:12–23' },
          { bookId: 'exodo', chapter: 40, verseStart: 34, verseEnd: 38, label: 'Êxodo 40:34–38' },
        ],
        quizQuestions: [
          {
            id: 'ex7-q1',
            question: 'O que Moisés pediu com firmeza a Deus antes de avançar pelo deserto (Êxodo 33)?',
            options: ['Ouro e armas', 'Que a presença divina fosse com eles', 'Rotas mais rápidas', 'Ausência de inimigos'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: 'ex7-q2',
            question: 'O que cobria a Tenda da Congregação quando o povo devia permanecer acampado?',
            options: ['Uma bandeira de linho', 'A nuvem da glória do Senhor', 'Uma tocha acesa pelos sacerdotes', 'Uma trombeta dourada'],
            correctIndex: 1,
            xpReward: 5,
          },
        ],
        xpReward: 25,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Paulo e a Igreja em Missão — Premium (Plus)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'paulo-igreja-missao',
    title: 'Paulo e a Igreja em Missão',
    subtitle: 'Da conversão à expansão do Evangelho — 7 dias',
    description: 'Acompanhe a trajetória de Paulo em Atos dos Apóstolos e na carta aos Coríntios, descobrindo coragem apostólica, unidade comunitária e a centralidade do amor.',
    category: 'historia-biblica',
    tier: 'plus',
    sprintDays: 7,
    icon: 'send',
    accentColor: '#3b82f6', // blue
    badge: {
      icon: '✉️',
      label: 'Mensageiro',
    },
    totalXp: 175,
    days: [
      {
        dayNumber: 1,
        title: 'De perseguidor a testemunha',
        devotionalSnippet: 'No caminho para Damasco, Saulo é surpreendido por uma luz resplandecente e pela voz de Jesus: "Saulo, Saulo, por que me persegues?". O zeloso perseguidor torna-se anunciador incansável daquele que antes combatia.',
        devotionalSource: 'Estrada da Judeia à Síria no primeiro século — narrativa lucana em Atos 9.',
        reflectionPrompt: 'Como a graça transformadora de Deus é capaz de reorientar talentos e convicções do passado?',
        passages: [{ bookId: 'atos', chapter: 9, verseStart: 1, verseEnd: 22, label: 'Atos 9:1–22' }],
        quizQuestions: [
          {
            id: 'at1-q1',
            question: 'A caminho de que cidade Saulo foi confrontado pela aparição de Jesus?',
            options: ['Roma', 'Damasco', 'Antioquia', 'Atenas'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: 'at1-q2',
            question: 'Qual discípulo foi enviado por Deus para orar por Saulo e restaurar-lhe a visão?',
            options: ['Barnabé', 'Estêvão', 'Ananias', 'Silas'],
            correctIndex: 2,
            xpReward: 5,
          },
        ],
        xpReward: 25,
      },
      {
        dayNumber: 2,
        title: 'Uma comunidade que envia',
        devotionalSnippet: 'Na igreja de Antioquia da Síria, líderes de diversas origens cultuam e jejuam. O Espírito Santo ordena: "Separai-me Barnabé e Saulo para a obra a que os tenho chamado". A missão cristã nasce de uma igreja orante e acolhedora.',
        devotionalSource: 'Antioquia da Síria — o primeiro polo gentílico da igreja primitiva.',
        reflectionPrompt: 'Qual é o papel da sua comunidade local em incentivar e enviar pessoas para apoiar os outros?',
        passages: [{ bookId: 'atos', chapter: 13, verseStart: 1, verseEnd: 12, label: 'Atos 13:1–12' }],
        quizQuestions: [
          {
            id: 'at2-q1',
            question: 'O que a liderança da igreja em Antioquia estava fazendo quando o Espírito Santo deu a ordem de envio?',
            options: ['Construindo templos', 'Servindo ao Senhor e jejuando', 'Discutindo com as autoridades', 'Comprando terras'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: 'at2-q2',
            question: 'Quem viajou com Saulo na primeira comitiva missionária partindo de Chipre?',
            options: ['Pedro e João', 'Barnabé (e João Marcos)', 'Timóteo e Lucas', 'Apolo e Áquila'],
            correctIndex: 1,
            xpReward: 5,
          },
        ],
        xpReward: 25,
      },
      {
        dayNumber: 3,
        title: 'Boa notícia em novas cidades',
        devotionalSnippet: 'Guiados pela visão de um homem macedônio que suplicava "Passa à Macedônia e ajuda-nos", Paulo e seus companheiros chegam à Europa. Em Filipos, a comerciante Lídia ouve o Evangelho junto ao rio e abre a sua casa aos apóstolos.',
        devotionalSource: 'Filipos — colônia romana e importante centro comercial macedônio.',
        reflectionPrompt: 'Você costuma estar atento às portas e oportunidades inesperadas que Deus abre ao seu redor?',
        passages: [{ bookId: 'atos', chapter: 16, verseStart: 6, verseEnd: 15, label: 'Atos 16:6–15' }],
        quizQuestions: [
          {
            id: 'at3-q1',
            question: 'Que visão noturna levou Paulo a cruzar o mar em direção à Europa?',
            options: ['Um anjo com uma trombeta', 'Um varão macedônio pedindo ajuda', 'Uma sarça ardente', 'Uma estrela brilhante'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: 'at3-q2',
            question: 'Quem era Lídia, a primeira convertida relatada em solo europeu?',
            options: ['Uma nobre patrícia de Roma', 'Uma vendedora de púrpura da cidade de Tiatira', 'Uma escrava liberta de Atenas', 'Uma poetisa de Corinto'],
            correctIndex: 1,
            xpReward: 5,
          },
        ],
        xpReward: 25,
      },
      {
        dayNumber: 4,
        title: 'Coragem em meio à oposição',
        devotionalSnippet: 'Em Tessalônica e Bereia, a pregação desperta acolhimento sincero, mas também inveja e tumulto popular. Os bereanos destacam-se por uma atitude modelo: examinar diariamente as Escrituras para verificar se o que ouviam era verdadeiro.',
        devotionalSource: 'Cidades gregas da via Inácia no governo romano de Cláudio.',
        reflectionPrompt: 'Qual é a sua disciplina pessoal para examinar e validar nas Escrituras o que você escuta?',
        passages: [{ bookId: 'atos', chapter: 17, verseStart: 1, verseEnd: 12, label: 'Atos 17:1–12' }],
        quizQuestions: [
          {
            id: 'at4-q1',
            question: 'Por que os irmãos da cidade de Bereia foram considerados mais nobres?',
            options: ['Porque eram muito ricos', 'Porque examinavam diariamente as Escrituras com diligência', 'Porque evitaram qualquer estrangeiro', 'Porque sabiam filosofia grega'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: 'at4-q2',
            question: 'Quantos sábados seguidos Paulo debateu com base nas Escrituras na sinagoga de Tessalônica?',
            options: ['Dois', 'Três', 'Sete', 'Dez'],
            correctIndex: 1,
            xpReward: 5,
          },
        ],
        xpReward: 25,
      },
      {
        dayNumber: 5,
        title: 'A mensagem no mundo greco-romano',
        devotionalSnippet: 'No Areópago de Atenas, Paulo dialoga com filósofos estóicos e epicureus. Partindo de um altar "Ao Deus Desconhecido", proclama o Criador que não habita em templos feitos por mãos humanas e chama todos ao arrependimento à luz da ressurreição.',
        devotionalSource: 'O Areópago de Atenas — tribunal e centro de debate filosófico e cívico grego.',
        reflectionPrompt: 'Como dialogar com respeito e clareza sobre sua fé com pessoas de diferentes visões de mundo?',
        passages: [{ bookId: 'atos', chapter: 17, verseStart: 16, verseEnd: 34, label: 'Atos 17:16–34' }],
        quizQuestions: [
          {
            id: 'at5-q1',
            question: 'Que inscrição em um dos altares atenienses serviu de ponto de partida para o discurso de Paulo?',
            options: ['Ao Deus Desconhecido', 'A Zeus Salvador', 'Aos Protetores da Pátria', 'À Sabedoria Eterna'],
            correctIndex: 0,
            xpReward: 5,
          },
          {
            id: 'at5-q2',
            question: 'Que ponto doutrinário central fez com que alguns no Areópago zombassem da pregação?',
            options: ['A doutrina do batismo', 'A ressurreição dos mortos', 'A obediência aos pais', 'A partilha de bens'],
            correctIndex: 1,
            xpReward: 5,
          },
        ],
        xpReward: 25,
      },
      {
        dayNumber: 6,
        title: 'Unidade e diversidade na comunidade',
        devotionalSnippet: 'Em 1 Coríntios 12, Paulo combate divisões e arrogância espiritual com a clássica metáfora do corpo humano. Todos os membros, com suas funções e dons distintos, são indispensáveis para o bem-estar e o funcionamento mútuo da igreja.',
        devotionalSource: 'Corinto — metrópole comercial agitada da província romana da Acaia.',
        reflectionPrompt: 'De que maneira você reconhece e valoriza os talentos diferentes das pessoas do seu grupo?',
        passages: [{ bookId: '1corintios', chapter: 12, verseStart: 12, verseEnd: 27, label: '1 Coríntios 12:12–27' }],
        quizQuestions: [
          {
            id: '1co12-q1',
            question: 'A que Paulo compara a igreja e a variedade dos seus dons em 1 Coríntios 12?',
            options: ['A um navio à vela', 'Ao corpo humano e seus muitos membros', 'A um exército de soldados', 'A uma árvore cheia de frutos'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: '1co12-q2',
            question: 'O que deve acontecer quando um membro do corpo sofre, segundo Paulo (v. 26)?',
            options: ['Deve ser isolado', 'Todos os membros sofrem com ele', 'Apenas os líderes intercedem', 'Segue-se em frente'],
            correctIndex: 1,
            xpReward: 5,
          },
        ],
        xpReward: 25,
      },
      {
        dayNumber: 7,
        title: 'Viver a missão com amor',
        devotionalSnippet: 'O hino ao amor em 1 Coríntios 13 coroa a reflexão apostólica: de nada adiantam dons extraordinários, eloquência ou sacrifícios extremos sem o amor. A fé, a esperança e o amor permanecem, mas o amor é o maior de todos.',
        devotionalSource: 'Texto clássico paulino sobre a virtude soberana da vida cristã.',
        reflectionPrompt: 'Onde o amor prático e paciente mais precisa orientar suas palavras nesta semana?',
        passages: [{ bookId: '1corintios', chapter: 13, verseStart: 1, verseEnd: 13, label: '1 Coríntios 13:1–13' }],
        quizQuestions: [
          {
            id: '1co13-q1',
            question: 'O que o apóstolo afirma ser, caso fale a língua dos homens e dos anjos mas não tenha amor?',
            options: ['Como bronze que soa ou címbalo que retine', 'Um filósofo eminente', 'Uma fonte que secou', 'Um profeta menor'],
            correctIndex: 0,
            xpReward: 5,
          },
          {
            id: '1co13-q2',
            question: 'Das três virtudes que permanecem (fé, esperança e amor), qual é a maior segundo o v. 13?',
            options: ['A esperança', 'A fé', 'O amor', 'Todas são rigorosamente iguais'],
            correctIndex: 2,
            xpReward: 5,
          },
        ],
        xpReward: 25,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Reis, Profetas e Esperança — Premium (Plus)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'reis-profetas-esperanca',
    title: 'Reis, Profetas e Esperança',
    subtitle: 'Liderança, denúncia e redenção em Israel — 7 dias',
    description: 'Compreenda os ciclos históricos da monarquia de Israel e Judá, a firmeza dos profetas na defesa da justiça e a esperança de um novo coração.',
    category: 'historia-biblica',
    tier: 'plus',
    sprintDays: 7,
    icon: 'crown',
    accentColor: '#d97706', // warm amber / gold
    badge: {
      icon: '📜',
      label: 'Voz de Esperança',
    },
    totalXp: 175,
    days: [
      {
        dayNumber: 1,
        title: 'Um povo pede um rei',
        devotionalSnippet: 'Em Ramá, os anciãos de Israel exigem de Samuel um rei "como têm todas as nações". O profeta adverte sobre os custos da centralização do poder e da opressão tributária, mas o povo insiste, iniciando a transição para a monarquia.',
        devotionalSource: 'Período dos Juízes e transição para o Reino Unido de Israel.',
        reflectionPrompt: 'Quando você busca seguir padrões ao seu redor, costuma avaliar as consequências a longo prazo?',
        passages: [{ bookId: '1samuel', chapter: 8, verseStart: 4, verseEnd: 22, label: '1 Samuel 8:4–22' }],
        quizQuestions: [
          {
            id: '1sm8-q1',
            question: 'Qual era a principal justificativa apresentada pelos líderes de Israel para pedir um rei?',
            options: ['Para construir um templo de ouro', 'Para sermos como todas as nações e termos um líder militar', 'Para fugir da fome', 'Por ordem expressa dos sacerdotes'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: '1sm8-q2',
            question: 'O que o Senhor explicou a Samuel quando o profeta se entristeceu com a exigência?',
            options: ['Eles não te rejeitaram a ti, mas a mim para eu não reinar sobre eles', 'Destrói todas as cidades', 'Consagra um sacerdote estrangeiro', 'Foge para o deserto'],
            correctIndex: 0,
            xpReward: 5,
          },
        ],
        xpReward: 25,
      },
      {
        dayNumber: 2,
        title: 'David e a promessa',
        devotionalSnippet: 'Davi expressa o desejo de edificar uma casa para a Arca da Aliança. Pelo profeta Natã, Deus inverte a perspectiva: não é Davi quem construirá uma casa para Deus, mas Deus quem estabelecerá uma linhagem perpétua — alicerce da esperança messiânica.',
        devotionalSource: 'Jerusalém, capital unificada do reino de Davi.',
        reflectionPrompt: 'Como a promessa incondicional de Deus ensina a descansar na soberania e não apenas no esforço pessoal?',
        passages: [{ bookId: '2samuel', chapter: 7, verseStart: 8, verseEnd: 16, label: '2 Samuel 7:8–16' }],
        quizQuestions: [
          {
            id: '2sm7-q1',
            question: 'Qual profeta comunicou a Davi a aliança divina sobre o seu trono e descendência?',
            options: ['Elias', 'Natã', 'Gade', 'Micaías'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: '2sm7-q2',
            question: 'O que Deus prometeu a respeito do reino e do trono de Davi em 2 Samuel 7:16?',
            options: ['Duraria quarenta anos apenas', 'Seria firmado para sempre', 'Seria transferido para o Egito', 'Dependeria de tributos de ouro'],
            correctIndex: 1,
            xpReward: 5,
          },
        ],
        xpReward: 25,
      },
      {
        dayNumber: 3,
        title: 'Sabedoria e responsabilidade',
        devotionalSnippet: 'Em Gibeão, Deus aparece a Salomão em sonho e convida-o a pedir o que desejar. Em vez de riquezas, vida longa ou vitória sobre inimigos, o jovem monarca pede um coração sábio e compreensivo para julgar o povo com justiça.',
        devotionalSource: 'O santuário de Gibeão antes da construção do templo em Jerusalém.',
        reflectionPrompt: 'Se você pudesse pedir uma única graça a Deus para suas decisões hoje, o que pediria?',
        passages: [{ bookId: '1reis', chapter: 3, verseStart: 5, verseEnd: 14, label: '1 Reis 3:5–14' }],
        quizQuestions: [
          {
            id: '1rs3-q1',
            question: 'O que o rei Salomão pediu a Deus quando o Senhor lhe disse "Pede o que queres"?',
            options: ['Vitória militar imediata', 'Coração sábio e prudente para discernir e julgar o povo', 'Riquezas sem fim', 'Vida mais longa que todos os homens'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: '1rs3-q2',
            question: 'Qual foi a reação de Deus ao pedido feito por Salomão?',
            options: ['Reprovou a modéstia', 'Agradou-se e concedeu sabedoria, além de honra e riquezas', 'Pediu sacrifícios de animais', 'Ordenou que jejuasse'],
            correctIndex: 1,
            xpReward: 5,
          },
        ],
        xpReward: 25,
      },
      {
        dayNumber: 4,
        title: 'Elias confronta a idolatria',
        devotionalSnippet: 'No cume do Monte Carmelo, o profeta Elias confronta o rei Acabe e os profetas de Baal diante de todo o povo: "Até quando claudicareis entre dois pensamentos?". O fogo do Senhor desce sobre o altar encharcado de água, confirmando que só o Senhor é Deus.',
        devotionalSource: 'O Monte Carmelo — divisor natural entre o reino do Norte (Israel) e a Fenícia.',
        reflectionPrompt: 'Em que áreas da vida há tendência de hesitar entre os valores de Deus e as pressões do ambiente?',
        passages: [{ bookId: '1reis', chapter: 18, verseStart: 17, verseEnd: 39, label: '1 Reis 18:17–39' }],
        quizQuestions: [
          {
            id: '1rs18-q1',
            question: 'Em que monte ocorreu o célebre confronto entre Elias e os profetas de Baal?',
            options: ['Monte das Oliveiras', 'Monte Carmelo', 'Monte Sinai', 'Monte Sião'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: '1rs18-q2',
            question: 'O que o povo exclamou prostrado com o rosto em terra quando o fogo consumiu o sacrifício?',
            options: ['Baal é rei', 'O Senhor é Deus! O Senhor é Deus!', 'Salomão tinha razão', 'Fujamos para o deserto'],
            correctIndex: 1,
            xpReward: 5,
          },
        ],
        xpReward: 25,
      },
      {
        dayNumber: 5,
        title: 'Justiça que Deus requer',
        devotionalSnippet: 'O profeta Amós, pastor de Tecoa, denuncia a hipocrisia de cultos faustosos acompanhados de exploração aos pobres e corrupção nos tribunais. A exigência profética reverbera pelos séculos: "Corra a justiça como as águas, e a retidão como ribeiro perene".',
        devotionalSource: 'O santuário de Betel no reino de Jeroboão II — séc. VIII a.C.',
        reflectionPrompt: 'Como a sua espiritualidade se traduz em atitudes práticas de integridade e justiça no trato com as pessoas?',
        passages: [{ bookId: 'amos', chapter: 5, verseStart: 21, verseEnd: 24, label: 'Amós 5:21–24' }],
        quizQuestions: [
          {
            id: 'am5-q1',
            question: 'A que elemento natural Amós compara a justiça requerida por Deus em Amós 5:24?',
            options: ['Ao fogo devorador', 'Às águas e a um ribeiro perene que nunca seca', 'A uma árvore florida', 'Ao vento do deserto'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: 'am5-q2',
            question: 'O que Deus afirma através de Amós a respeito das festas religiosas sem integridade de vida?',
            options: ['Que as aborrece e despreza', 'Que precisa de mais música', 'Que as aceita com reservas', 'Que pede ouro em troca'],
            correctIndex: 0,
            xpReward: 5,
          },
        ],
        xpReward: 25,
      },
      {
        dayNumber: 6,
        title: 'Esperança em meio à crise',
        devotionalSnippet: 'No auge das ameaças de invasão assíria sobre o reino de Judá, Isaías proclama que o povo que andava em trevas viu uma grande luz. O anúncio do Príncipe da Paz cujo governo trará justiça sem fim torna-se o horizonte de esperança do povo.',
        devotionalSource: 'Crise siro-efraimita e conflito assírio em Jerusalém no séc. VIII a.C.',
        reflectionPrompt: 'Onde você mais precisa enxergar a luz da esperança divina dissipando as trevas da preocupação?',
        passages: [{ bookId: 'isaias', chapter: 9, verseStart: 1, verseEnd: 7, label: 'Isaías 9:1–7' }],
        quizQuestions: [
          {
            id: 'is9-q1',
            question: 'Quais títulos são atribuídos ao Menino anunciado em Isaías 9:6?',
            options: ['Rei dos Exércitos e Comandante Militar', 'Maravilhoso Conselheiro, Deus Forte, Pai da Eternidade, Príncipe da Paz', 'Sacerdote Supremo de Judá', 'Profeta de Fogo'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: 'is9-q2',
            question: 'O que o texto afirma sobre o crescimento do governo e da paz desse Messias?',
            options: ['Terminará em breve', 'Não haverá fim', 'Ficará limitado a Samaria', 'Será decidido pelos reis vizinhos'],
            correctIndex: 1,
            xpReward: 5,
          },
        ],
        xpReward: 25,
      },
      {
        dayNumber: 7,
        title: 'Um coração renovado',
        devotionalSnippet: 'Às margens do rio Quebar, entre os exilados na Babilônia, Ezequiel recebe a promessa da restauração espiritual. Deus promete retirar o coração de pedra e dar um coração de carne, pondo o Seu Espírito no íntimo para capacitar a uma vida nova.',
        devotionalSource: 'O cativeiro babilônico no séc. VI a.C. e a promessa da Nova Aliança.',
        reflectionPrompt: 'Em que aspectos você deseja que o Espírito Santo amoleça e renove o seu coração hoje?',
        passages: [{ bookId: 'ezequiel', chapter: 36, verseStart: 24, verseEnd: 28, label: 'Ezequiel 36:24–28' }],
        quizQuestions: [
          {
            id: 'ez36-q1',
            question: 'O que Deus promete tirar da carne do seu povo em Ezequiel 36:26?',
            options: ['O cansaço da batalha', 'O coração de pedra, dando em seu lugar um coração de carne', 'A memória do cativeiro', 'A terra dos antepassados'],
            correctIndex: 1,
            xpReward: 5,
          },
          {
            id: 'ez36-q2',
            question: 'O que Deus colocará no íntimo do povo para guiá-lo em seus estatutos?',
            options: ['Tabuletas de bronze', 'O Seu Espírito Santo', 'Um rei estrangeiro', 'Um código de leis mais severo'],
            correctIndex: 1,
            xpReward: 5,
          },
        ],
        xpReward: 25,
      },
    ],
  },
  ...EXTENDED_READING_PLANS,
];

/** Mapa de consulta rápida por ID de plano */
export const PLANS_BY_ID: Record<string, ReadingPlan> = Object.fromEntries(
  READING_PLANS.map((p) => [p.id, p])
);

/** IDs de jornadas acessíveis para utilizadores Free */
export const FREE_PLAN_IDS = READING_PLANS
  .filter((p) => p.tier === 'free')
  .map((p) => p.id);
