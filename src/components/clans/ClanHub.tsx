import React, { useState, useEffect, useCallback } from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useAuth } from '../../context/AuthContext';
import {
  getMyChurchGroups,
  createChurchGroup,
  joinChurchGroupByCode,
  leaveChurchGroup,
} from '../../lib/gameSocialService';
import type { ChurchGroup } from '../../types/biblia';
import { MasterBadge } from '../shared/MasterBadge';

interface ClanHubProps {
  onNavigate: (screen: string) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const ClanHub: React.FC<ClanHubProps> = ({ onNavigate, showToast }) => {
  const { user, openAuthModal } = useAuth();
  const { planTier } = useSubscription();

  const [groups, setGroups] = useState<ChurchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [confirmLeaveGroup, setConfirmLeaveGroup] = useState<ChurchGroup | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMotto, setNewGroupMotto] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const loadGroups = useCallback(async () => {
    if (!user) {
      setGroups([]);
      return;
    }
    setLoading(true);
    try {
      const list = await getMyChurchGroups();
      setGroups(list);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('signin');
      return;
    }
    if (newGroupName.trim().length < 3) {
      showToast('O nome do grupo deve ter pelo menos 3 caracteres.', 'info');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createChurchGroup(newGroupName, newGroupMotto);
      showToast(res.message, res.success ? 'groups' : 'error');
      if (res.success) {
        setIsCreateModalOpen(false);
        setNewGroupName('');
        setNewGroupMotto('');
        await loadGroups();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('signin');
      return;
    }
    if (!joinCode.trim()) return;

    setSubmitting(true);
    try {
      const res = await joinChurchGroupByCode(joinCode);
      showToast(res.message, res.success ? 'check_circle' : 'error');
      if (res.success) {
        setIsJoinModalOpen(false);
        setJoinCode('');
        await loadGroups();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmLeave = async () => {
    if (!confirmLeaveGroup) return;
    setSubmitting(true);
    try {
      const res = await leaveChurchGroup(confirmLeaveGroup.id);
      showToast(res.message, res.success ? 'check_circle' : 'error');
      setConfirmLeaveGroup(null);
      if (res.success) {
        await loadGroups();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const copyGroupCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      showToast(`Código ${code} copiado!`, 'content_copy');
    } catch {
      showToast(`Código do grupo: ${code}`, 'info');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 font-display transition-colors duration-200">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-surface-light dark:bg-surface-dark transition-colors">
        <button
          onClick={() => onNavigate('screen-perfil')}
          className="size-9 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
          title="Voltar ao Perfil"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </button>

        <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
          Grupos & Células
        </h2>

        <div className="size-9 flex items-center justify-center">
          {planTier === 2 && <MasterBadge size="sm" showText={false} />}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-28 space-y-4 max-w-md mx-auto w-full no-scrollbar">
        {/* Ações Principais */}
        <div className="p-4 rounded-3xl bg-surface-light dark:bg-surface-dark border border-sacred-brand/25 dark:border-sacred-neon/25 shadow-soft space-y-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-sacred-brand dark:text-sacred-neon block mb-0.5">
              Comunidade Real
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Caminhe com a sua Igreja, Família ou Célula
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
              Crie um grupo e partilhe o código, ou entre num grupo existente com o código recebido.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => {
                if (!user) {
                  showToast('Entre ou crie uma conta para criar um grupo.', 'login');
                  openAuthModal('signin');
                  return;
                }
                setIsCreateModalOpen(true);
              }}
              className="py-2.5 px-3 rounded-xl bg-sacred-brand hover:bg-sacred-brand-dark text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>Criar Grupo</span>
            </button>
            <button
              onClick={() => {
                if (!user) {
                  showToast('Entre ou crie uma conta para participar de um grupo.', 'login');
                  openAuthModal('signin');
                  return;
                }
                setIsJoinModalOpen(true);
              }}
              className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-sacred-brand text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">key</span>
              <span>Entrar com Código</span>
            </button>
          </div>
        </div>

        {/* Estado se visitante */}
        {!user ? (
          <div className="p-6 rounded-2xl bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-800 text-center space-y-3 shadow-soft">
            <span className="material-symbols-outlined text-4xl text-sacred-brand dark:text-sacred-neon">
              groups
            </span>
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Conecte uma conta para ver os seus grupos
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Grupos são privados por código de convite. Entre ou crie a sua conta gratuita para participar com outros irmãos.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => openAuthModal('signin')}
                className="flex-1 btn-duo-primary text-xs py-2.5 font-bold"
              >
                Entrar
              </button>
              <button
                onClick={() => openAuthModal('signup')}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                Criar Conta
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[16px]">church</span>
              <span>Meus Grupos ({groups.length})</span>
            </h3>

            {loading ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                A carregar grupos...
              </div>
            ) : groups.length === 0 ? (
              <div className="p-6 rounded-2xl bg-surface-light dark:bg-surface-dark border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
                <span className="material-symbols-outlined text-3xl text-slate-400">diversity_3</span>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Ainda não faz parte de nenhum grupo
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Crie o primeiro grupo da sua igreja ou insira o código partilhado por um amigo.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {groups.map((group) => {
                  const pct =
                    group.weekly_goal_xp > 0
                      ? Math.min(100, Math.round((group.current_weekly_xp / group.weekly_goal_xp) * 100))
                      : 0;

                  return (
                    <div
                      key={group.id}
                      className="p-4 rounded-2xl bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-800 space-y-3 shadow-soft"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                            <span className="material-symbols-outlined text-[20px]">church</span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                {group.name}
                              </h4>
                              {group.my_role === 'leader' && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-300 text-[9px] font-black uppercase">
                                  Líder
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {group.motto}
                            </p>
                          </div>
                        </div>

                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1 shrink-0">
                          <span className="material-symbols-outlined text-[14px]">groups</span>
                          <span>{group.member_count}</span>
                        </span>
                      </div>

                      <div>
                        <div className="bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-sacred-brand dark:bg-sacred-neon h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 flex justify-between">
                          <span>{group.current_weekly_xp} / {group.weekly_goal_xp} XP esta semana</span>
                          <span>{pct}%</span>
                        </p>
                      </div>

                      <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                        <button
                          onClick={() => void copyGroupCode(group.group_code)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-700"
                          title="Copiar código para convidar membros"
                        >
                          <span className="material-symbols-outlined text-[14px]">content_copy</span>
                          <span>{group.group_code}</span>
                        </button>

                        <button
                          onClick={() => setConfirmLeaveGroup(group)}
                          className="text-[11px] font-bold text-rose-500 hover:underline px-2 py-1"
                        >
                          Sair do grupo
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal Criar Grupo */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <form
            onSubmit={handleCreateGroup}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-3xl p-5 shadow-2xl space-y-3.5 text-left"
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-sacred-brand text-[18px]">church</span>
                <span>Criar Grupo ou Célula</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="size-7 rounded-full bg-gray-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Nome do Grupo
              </label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={60}
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Ex: Célula Esperança"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Propósito / Lema (Opcional)
              </label>
              <textarea
                rows={2}
                maxLength={160}
                value={newGroupMotto}
                onChange={(e) => setNewGroupMotto(e.target.value)}
                placeholder="Ex: Crescendo juntos na Palavra"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 text-xs text-slate-900 dark:text-white outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="pt-1 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || newGroupName.trim().length < 3}
                className="btn-duo-primary px-5 py-2.5 text-xs font-bold disabled:opacity-50"
              >
                {submitting ? 'A criar...' : 'Criar Grupo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Entrar com Código */}
      {isJoinModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsJoinModalOpen(false)}
        >
          <form
            onSubmit={handleJoinGroup}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-3xl p-5 shadow-2xl space-y-3.5 text-left"
          >
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Entrar num Grupo por Código
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Peça ao líder ou amigo o código do grupo (ex: GRP-1A2B3C).
            </p>
            <input
              type="text"
              required
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="GRP-XXXXXX"
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white outline-none focus:border-primary"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsJoinModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || !joinCode.trim()}
                className="btn-duo-primary px-5 py-2.5 text-xs font-bold disabled:opacity-50"
              >
                {submitting ? 'A entrar...' : 'Confirmar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Confirmar Saída */}
      {confirmLeaveGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setConfirmLeaveGroup(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-3xl p-5 shadow-2xl space-y-4 text-left"
          >
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Sair de "{confirmLeaveGroup.name}"?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Poderá voltar a entrar mais tarde usando o código do grupo.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmLeaveGroup(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmLeave}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50"
              >
                {submitting ? 'A sair...' : 'Sair do Grupo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
