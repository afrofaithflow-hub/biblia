import React, { useState, useEffect } from 'react';
import { getUserProgressTracks } from '../../lib/gameSession';
import {
  getFriendsList,
  getLeagueRanking,
  generateInviteCode,
  acceptInviteCode,
  joinChurchGroupByCode,
  blockUser,
  reportUser,
  type LeagueEntry,
} from '../../lib/gameSocialService';
import type { SocialFriend } from '../../types/gameContracts';

interface GameLeaderboardProps {
  onNavigate: (screen: string) => void;
  showToast: (msg: string, icon?: string) => void;
}

type LeagueTab = 'global' | 'friends' | 'groups';
type InviteMethod = 'qr' | 'link' | 'code' | 'handle';

const INVITE_OPTIONS: { id: InviteMethod; icon: string; label: string; desc: string; color: string }[] = [
  { id: 'qr', icon: 'qr_code_2', label: 'Código QR', desc: 'Gera QR Code para escanear', color: 'bg-sacred-brand/10 text-sacred-brand border-sacred-brand/30' },
  { id: 'link', icon: 'link', label: 'Link Único', desc: 'Copia link para WhatsApp ou e-mail', color: 'bg-gold-radiant/10 text-gold-radiant border-gold-radiant/30' },
  { id: 'code', icon: 'church', label: 'Código de Igreja', desc: 'Entre num grupo local com código', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-300 dark:text-indigo-300 dark:border-indigo-700' },
  { id: 'handle', icon: 'alternate_email', label: 'Busca por @nome', desc: 'Pesquise o nome do utilizador', color: 'bg-slate-200/60 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
];

const DIVISION_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  seed: { label: 'Semente', color: 'text-orange-600 dark:text-orange-400', icon: 'eco' },
  path: { label: 'Caminho', color: 'text-slate-500', icon: 'footprint' },
  disciple: { label: 'Discípulo', color: 'text-amber-500', icon: 'military_tech' },
  messenger: { label: 'Mensageiro', color: 'text-sky-500', icon: 'diamond' },
  celestial: { label: 'Celestial', color: 'text-purple-500', icon: 'auto_awesome' },
};

export const GameLeaderboard: React.FC<GameLeaderboardProps> = ({ onNavigate, showToast }) => {
  const [tab, setTab] = useState<LeagueTab>('global');
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [activeModal, setActiveModal] = useState<InviteMethod | null>(null);
  const [generatedInvite, setGeneratedInvite] = useState<{ code: string; shareUrl: string } | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [friends, setFriends] = useState<SocialFriend[]>([]);
  const [ranking, setRanking] = useState<LeagueEntry[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(true);

  const tracks = getUserProgressTracks();
  const division = DIVISION_LABELS[tracks.weeklyLeague] ?? DIVISION_LABELS.disciple;

  // Carrega dados reais de acordo com a aba activa
  useEffect(() => {
    if (tab === 'global') {
      setLoadingRanking(true);
      getLeagueRanking()
        .then(setRanking)
        .catch(() => setRanking([]))
        .finally(() => setLoadingRanking(false));
    } else if (tab === 'friends') {
      getFriendsList().then(setFriends).catch(() => setFriends([]));
    }
  }, [tab]);

  const handleInvite = async (method: InviteMethod) => {
    setShowInvitePanel(false);
    if (method === 'link') {
      const invite = await generateInviteCode();
      if (invite) {
        setGeneratedInvite(invite);

        // Suporte a Partilha Nativa Móvel (WhatsApp, Messenger, SMS, etc.)
        if (typeof navigator !== 'undefined' && navigator.share) {
          try {
            await navigator.share({
              title: 'Junte-se a mim no BiblIA',
              text: `Estou a aprender a Palavra no BiblIA. Conecte-se comigo pelo código ${invite.code}:`,
              url: invite.shareUrl,
            });
            showToast('Convite partilhado!', 'share');
            return;
          } catch {
            // Se o utilizador cancelar a folha de partilha nativa, prossegue para cópia
          }
        }

        if (navigator.clipboard) {
          await navigator.clipboard.writeText(invite.shareUrl);
          showToast(`Link copiado: ${invite.shareUrl}`, 'content_copy');
        } else {
          showToast(`Código gerado: ${invite.code}`, 'check_circle');
        }
      }
    } else if (method === 'qr') {
      const invite = await generateInviteCode();
      if (invite) {
        setGeneratedInvite(invite);
        setActiveModal('qr');
      }
    } else if (method === 'code') {
      setInputCode('');
      setActiveModal('code');
    } else if (method === 'handle') {
      setInputCode('');
      setActiveModal('handle');
    }
  };

  const handleCodeSubmit = async () => {
    if (!inputCode.trim()) return;

    if (activeModal === 'code') {
      // Aceita código de amigo ou grupo
      if (inputCode.toUpperCase().startsWith('BIBLIA-')) {
        const res = await acceptInviteCode(inputCode);
        showToast(res.message, res.success ? 'check_circle' : 'info');
      } else {
        const res = await joinChurchGroupByCode(inputCode);
        showToast(res.message, res.success ? 'check_circle' : 'info');
      }
      setActiveModal(null);
      getFriendsList().then(setFriends).catch(() => { });
    } else if (activeModal === 'handle') {
      const res = await acceptInviteCode(`BIBLIA-${inputCode.trim()}`);
      showToast(`Pedido enviado a @${inputCode.trim()}`, 'send');
      setActiveModal(null);
    }
  };

  const handleBlockFriend = async (friendId: string, name: string) => {
    if (window.confirm(`Deseja bloquear ${name}? Não receberá mais interações desta pessoa.`)) {
      const res = await blockUser(friendId);
      showToast(res.message, 'block');
      getFriendsList().then(setFriends).catch(() => { });
    }
  };

  const handleReportFriend = async (friendId: string, name: string) => {
    const reason = window.prompt(`Denunciar ${name}:\n1. Nome inapropriado\n2. Assédio\n3. Spam\n\nDigite 1, 2 ou 3:`);
    if (reason) {
      const mapReason = reason === '1' ? 'inappropriate_name' : reason === '2' ? 'harassment' : 'spam';
      const res = await reportUser(friendId, mapReason);
      showToast(res.message, 'security');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-bg-canvas dark:bg-dark-canvas text-slate-800 dark:text-slate-100 font-display transition-colors duration-200">
      {/* ── Header ── */}
      <header className="flex items-center justify-between p-4 pb-2 shrink-0">
        <button
          onClick={() => onNavigate('screen-game-dashboard')}
          className="size-9 rounded-full bg-white dark:bg-slate-800 shadow-soft flex items-center justify-center text-slate-500"
          title="Voltar"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </button>

        <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
          Liga Semanal
        </h2>

        <button
          onClick={() => setShowInvitePanel(true)}
          className="size-9 rounded-full bg-sacred-brand/10 text-sacred-brand flex items-center justify-center hover:bg-sacred-brand/20 transition-colors"
          title="Convidar amigos"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
        </button>
      </header>

      {/* ── Tabs: Global / Amigos / Grupos ── */}
      <div className="px-4 pb-2 shrink-0">
        <div className="flex bg-slate-100 dark:bg-slate-900 rounded-2xl p-1">
          {(['global', 'friends', 'groups'] as LeagueTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${tab === t ? 'bg-sacred-brand text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              {t === 'global' ? 'Liga Global' : t === 'friends' ? 'Amigos' : 'Grupos'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Liga info banner ── */}
      {tab === 'global' && (
        <div className="mx-4 mb-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-sacred-brand to-sacred-deep text-white flex items-center justify-between shrink-0">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-extrabold opacity-80">Sua Divisão</p>
            <p className="font-black flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{division.icon}</span>
              {division.label}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] opacity-80">Talentos desta semana</p>
            <p className="text-lg font-black">{tracks.weeklyTalents.toLocaleString('pt')}</p>
          </div>
        </div>
      )}

      {/* ── Painel "Convidar Amigos" com as 4 opções seguras ── */}
      {tab === 'friends' && (
        <div className="mx-4 mb-3 p-4 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 shadow-soft shrink-0">
          <p className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-sacred-brand">group_add</span>
            Adicionar Amigos
          </p>
          <div className="grid grid-cols-2 gap-2">
            {INVITE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleInvite(opt.id)}
                className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all active:scale-95 ${opt.color}`}
              >
                <span className="material-symbols-outlined text-xl">{opt.icon}</span>
                <span className="text-xs font-bold leading-tight">{opt.label}</span>
                <span className="text-[10px] opacity-70 leading-tight">{opt.desc}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
            A amizade é bilateral e voluntária. Nenhum contacto ou dado é partilhado sem a sua autorização explícita.
          </p>
        </div>
      )}

      {/* ── Área de Rolagem ── */}
      <main className="flex-1 overflow-y-auto no-scrollbar px-4 pb-24">
        {tab === 'global' ? (
          loadingRanking ? (
            <div className="py-16 text-center text-slate-400">
              <span className="material-symbols-outlined text-3xl animate-spin mb-2">progress_activity</span>
              <p className="text-xs font-medium">A carregar classificação da liga...</p>
            </div>
          ) : ranking.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="size-16 rounded-2xl bg-sacred-brand/10 dark:bg-sacred-neon/10 text-sacred-brand dark:text-sacred-neon mx-auto flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl">leaderboard</span>
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Ainda sem pontuações nesta semana
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                Complete lições na Jornada bíblica para conquistar talentos e ser o primeiro a figurar no ranking semanal da sua liga!
              </p>
              <button
                onClick={() => onNavigate('screen-game-dashboard')}
                className="mt-2 btn-duo-primary dark:btn-duo-primary-dark text-xs py-3 px-6 font-bold shadow-duo-primary"
              >
                Começar Lição
              </button>
            </div>
          ) : (
            <>
              {/* Pódio Top 3 Dinâmico */}
              <div className="flex justify-center items-end gap-3 pt-4 pb-6">
                {/* #2 (Se existir) */}
                {ranking[1] && (
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div className="size-16 rounded-full border-2 border-slate-300 dark:border-slate-600 overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-black text-xs text-slate-700 dark:text-slate-200">
                        {ranking[1].avatarUrl ? (
                          <img src={ranking[1].avatarUrl} alt={ranking[1].displayName} className="size-full object-cover" />
                        ) : (
                          ranking[1].displayName.charAt(0)
                        )}
                      </div>
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 rounded-full text-[10px] font-black bg-slate-600 text-white">#2</span>
                    </div>
                    <p className="text-xs font-bold mt-1.5 text-center truncate max-w-[80px]">{ranking[1].displayName}</p>
                    <p className="text-[10px] font-black text-sacred-brand dark:text-sacred-neon">{ranking[1].weeklyTalents.toLocaleString('pt')} T</p>
                  </div>
                )}

                {/* #1 Champion */}
                {ranking[0] && (
                  <div className="flex flex-col items-center -translate-y-3">
                    <div className="relative">
                      <div className="size-20 rounded-full border-4 border-gold-radiant overflow-hidden shadow-gold-glow animate-glow-pulse bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-black text-sm text-slate-800 dark:text-slate-100">
                        {ranking[0].avatarUrl ? (
                          <img src={ranking[0].avatarUrl} alt={ranking[0].displayName} className="size-full object-cover" />
                        ) : (
                          ranking[0].displayName.charAt(0)
                        )}
                      </div>
                      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 size-7 rounded-full bg-gold-radiant text-slate-950 flex items-center justify-center font-black text-xs shadow-gold-glow border-2 border-white dark:border-surface-dark">👑</span>
                    </div>
                    <p className="text-sm font-black mt-2 text-center truncate max-w-[100px]">{ranking[0].displayName}</p>
                    <p className="text-xs font-black text-gold-radiant">{ranking[0].weeklyTalents.toLocaleString('pt')} T</p>
                  </div>
                )}

                {/* #3 (Se existir) */}
                {ranking[2] && (
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div className="size-16 rounded-full border-2 border-amber-700/60 overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-black text-xs text-slate-700 dark:text-slate-200">
                        {ranking[2].avatarUrl ? (
                          <img src={ranking[2].avatarUrl} alt={ranking[2].displayName} className="size-full object-cover" />
                        ) : (
                          ranking[2].displayName.charAt(0)
                        )}
                      </div>
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 rounded-full text-[10px] font-black bg-amber-800 text-white">#3</span>
                    </div>
                    <p className="text-xs font-bold mt-1.5 text-center truncate max-w-[80px]">{ranking[2].displayName}</p>
                    <p className="text-[10px] font-black text-sacred-brand dark:text-sacred-neon">{ranking[2].weeklyTalents.toLocaleString('pt')} T</p>
                  </div>
                )}
              </div>

              {/* Lista restante (> #3) */}
              <div className="space-y-2">
                {ranking.slice(3).map((item) => (
                  <div
                    key={item.userId}
                    className="p-3 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-soft flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-center text-xs font-black text-slate-400">{item.rank}</span>
                      {item.avatarUrl ? (
                        <img src={item.avatarUrl} alt={item.displayName} className="size-10 rounded-full object-cover" />
                      ) : (
                        <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-black text-xs text-slate-600 dark:text-slate-300">
                          {item.displayName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{item.displayName}</h4>
                        <p className="text-[10px] text-slate-400">Posição #{item.rank}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-sacred-brand dark:text-sacred-neon block">{item.weeklyTalents.toLocaleString('pt')}</span>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Talentos</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )
        ) : tab === 'friends' ? (
          /* ── Aba Amigos Bilaterais ── */
          <div className="space-y-2 pt-1">
            {friends.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">group_off</span>
                <p className="text-xs">Ainda não tem amigos adicionados.</p>
                <p className="text-[11px] mt-1">Gere um link ou código acima para convidar!</p>
              </div>
            ) : (
              friends.map((friend, idx) => (
                <div
                  key={friend.id}
                  className="p-3.5 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-soft flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="size-10 rounded-full bg-sacred-brand/10 border border-sacred-brand/30 flex items-center justify-center font-bold text-sacred-brand text-sm">
                        {friend.avatarUrl ? (
                          <img src={friend.avatarUrl} alt={friend.displayName} className="size-full rounded-full object-cover" />
                        ) : (
                          friend.displayName.charAt(0)
                        )}
                      </div>
                      {friend.isMutual && (
                        <span className="absolute bottom-0 right-0 size-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-surface-dark" title="Amizade mútua ativa" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{friend.displayName}</h4>
                      <p className="text-[10px] text-slate-400">Nível {friend.walkLevel} da Caminhada</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right mr-1">
                      <span className="text-xs font-black text-gold-radiant block">{friend.weeklyTalents} T</span>
                      <span className="text-[9px] text-slate-400">Semana</span>
                    </div>

                    {/* Botão de Moderação / Segurança */}
                    <button
                      onClick={() => handleBlockFriend(friend.id, friend.displayName)}
                      className="p-1 rounded-full text-slate-300 hover:text-rose-500 transition-colors"
                      title="Bloquear utilizador"
                    >
                      <span className="material-symbols-outlined text-[18px]">block</span>
                    </button>
                    <button
                      onClick={() => handleReportFriend(friend.id, friend.displayName)}
                      className="p-1 rounded-full text-slate-300 hover:text-amber-500 transition-colors"
                      title="Denunciar utilizador"
                    >
                      <span className="material-symbols-outlined text-[18px]">flag</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* ── Aba Grupos Locais / Tribos Cooperativas ── */
          <div className="pt-2 space-y-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-soft">
              <div className="flex items-center gap-3 mb-3">
                <div className="size-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl text-indigo-600 dark:text-indigo-300">church</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Célula Graça e Paz</h4>
                  <p className="text-[10px] text-slate-400">Código: GRACA-2026 · Meta semanal: 2.000 XP</p>
                </div>
              </div>
              <div className="bg-gray-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: '72%' }} />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 flex justify-between">
                <span>1.450 / 2.000 XP coletivos</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">72%</span>
              </p>
            </div>

            <button
              onClick={() => handleInvite('code')}
              className="w-full py-3.5 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-50/50 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Entrar num grupo ou célula com código
            </button>
          </div>
        )}
      </main>

      {/* ── Rodapé: posição do utilizador ── */}
      <div className="p-3 bg-white dark:bg-surface-dark border-t border-gray-200 dark:border-gray-800 shadow-2xl shrink-0">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-sm font-black text-sacred-brand">#{tracks.leagueRank}</span>
              <span className="text-[9px] uppercase font-bold text-slate-400">Posição</span>
            </div>
            <div className="size-10 rounded-full border-2 border-sacred-brand/50 bg-sacred-brand/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-sacred-brand text-[20px]">person</span>
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-white">Você ({division.label})</p>
              <p className="text-[10px] text-slate-400">Nível {tracks.walkLevel} · Top 15%</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-black text-gold-radiant flex items-center gap-1 justify-end">
              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>monetization_on</span>
              {tracks.weeklyTalents.toLocaleString('pt')}
            </span>
            <span className="text-[9px] text-slate-400 font-bold">Talentos</span>
          </div>
        </div>
      </div>

      {/* ── Sheet de Opções de Convite ── */}
      {showInvitePanel && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm" onClick={() => setShowInvitePanel(false)}>
          <div className="w-full bg-white dark:bg-surface-dark rounded-t-3xl p-6 pb-10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mb-5" />
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-4">Convidar Amigos</h3>
            <div className="grid grid-cols-2 gap-3">
              {INVITE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleInvite(opt.id)}
                  className={`flex flex-col items-start gap-1.5 p-4 rounded-2xl border text-left transition-all active:scale-95 ${opt.color}`}
                >
                  <span className="material-symbols-outlined text-2xl">{opt.icon}</span>
                  <span className="text-sm font-bold">{opt.label}</span>
                  <span className="text-[11px] opacity-70 leading-tight">{opt.desc}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-4 text-center leading-relaxed">
              A amizade é sempre bilateral e nunca automática. Os seus contactos não são acedidos sem autorização.
            </p>
          </div>
        </div>
      )}

      {/* ── Modal Interativo (QR Code / Código) ── */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-sm bg-white dark:bg-surface-dark rounded-3xl p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            {activeModal === 'qr' && generatedInvite && (
              <div className="text-center space-y-3">
                <div className="size-12 rounded-full bg-sacred-brand/10 text-sacred-brand mx-auto flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">qr_code_2</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Seu Código QR</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Aproxime a câmara de outro telemóvel para conectar.</p>

                {/* QR Code SVG Visual */}
                <div className="size-48 mx-auto p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-inner flex items-center justify-center">
                  <svg className="size-full" viewBox="0 0 100 100" fill="currentColor">
                    <path d="M10 10h30v30h-30z M15 15v20h20v-20z M20 20h10v10h-10z M60 10h30v30h-30z M65 15v20h20v-20z M70 20h10v10h-10z M10 60h30v30h-30z M15 65v20h20v-20z M20 70h10v10h-10z M50 20h5v5h-5z M50 35h5v5h-5z M50 50h10v5h-10z M70 50h5v10h-5z M85 50h5v5h-5z M60 65h10v5h-10z M80 65h10v5h-10z M50 80h15v5h-15z M75 80h15v5h-15z" />
                  </svg>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-sm font-bold tracking-widest text-slate-800 dark:text-slate-100">
                  {generatedInvite.code}
                </div>
              </div>
            )}

            {(activeModal === 'code' || activeModal === 'handle') && (
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sacred-brand text-2xl">
                    {activeModal === 'code' ? 'church' : 'alternate_email'}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {activeModal === 'code' ? 'Entrar com Código' : 'Buscar por @nome'}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeModal === 'code'
                    ? 'Insira o código de convite de um amigo (BIBLIA-XXXX) ou o código da sua igreja.'
                    : 'Digite o nome de utilizador para enviar um pedido bilateral.'}
                </p>

                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder={activeModal === 'code' ? 'Ex: BIBLIA-7A8K ou GRACA-2026' : 'Ex: joao_silva'}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold uppercase tracking-wider outline-none focus:border-sacred-brand transition-colors"
                />

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCodeSubmit}
                    disabled={!inputCode.trim()}
                    className="flex-1 btn-duo-primary py-3 text-xs font-bold shadow-duo-primary disabled:opacity-50"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-slate-600 text-center"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
