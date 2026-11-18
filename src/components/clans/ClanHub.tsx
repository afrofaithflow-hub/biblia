import React, { useState } from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { Clan } from '../../types/biblia';
import { MasterBadge } from '../shared/MasterBadge';

interface ClanHubProps {
  onNavigate: (screen: string) => void;
  showToast: (msg: string, icon?: string) => void;
}

const INITIAL_CLANS: Clan[] = [
  {
    id: 'clan-siao',
    name: 'Clã Monte Sião',
    description: 'Irmãos dedicados ao estudo dos Salmos e oração de intercessão contínua.',
    leader_id: 'usr-mateus',
    leader_name: 'Pr. Mateus (MASTER)',
    member_count: 48,
    badge_url: 'shield',
    created_at: '2026-01-10',
  },
  {
    id: 'clan-galileia',
    name: 'Pescadores de Homens',
    description: 'Evangelismo, missões digitais e memorização diária dos Evangelhos.',
    leader_id: 'usr-joao',
    leader_name: 'Missionário Daniel (MASTER)',
    member_count: 32,
    badge_url: 'anchor',
    created_at: '2026-02-14',
  },
];

export const ClanHub: React.FC<ClanHubProps> = ({ onNavigate, showToast }) => {
  const [clans, setClans] = useState<Clan[]>(INITIAL_CLANS);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newClanName, setNewClanName] = useState('');
  const [newClanDesc, setNewClanDesc] = useState('');
  const [joinedClanId, setJoinedClanId] = useState<string | null>(null);

  const {
    profile,
    planTier,
    canCreateClan,
    canJoinClan,
    openPricingModal,
  } = useSubscription();

  const handleCreateClan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateClan) {
      showToast('Apenas assinantes MASTER podem fundar e liderar clãs!', 'crown');
      openPricingModal();
      return;
    }

    if (!newClanName.trim()) return;

    const newClan: Clan = {
      id: `clan-${Date.now()}`,
      name: newClanName.trim(),
      description: newClanDesc.trim() || 'Comunidade bíblica ativa no BiblIA.',
      leader_id: profile.id,
      leader_name: `${profile.display_name} (MASTER)`,
      member_count: 1,
      badge_url: 'crown',
      created_at: new Date().toISOString(),
    };

    setClans([newClan, ...clans]);
    setJoinedClanId(newClan.id);
    setIsCreateModalOpen(false);
    setNewClanName('');
    setNewClanDesc('');
    showToast(`Clã "${newClan.name}" criado com sucesso! Liderança ativa.`, 'crown');
  };

  const handleJoinClan = (clan: Clan) => {
    if (!canJoinClan) {
      showToast('Entrada em clãs requer plano PREMIUM ou MASTER!', 'lock');
      openPricingModal();
      return;
    }

    if (joinedClanId === clan.id) {
      showToast(`Você já é membro do ${clan.name}.`, 'check_circle');
      return;
    }

    setJoinedClanId(clan.id);
    showToast(`Bem-vindo ao ${clan.name}! Membresia confirmada.`, 'groups');
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

        <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Comunidade & Clãs</h2>

        <div className="size-9 flex items-center justify-center">
          {planTier === 2 && <MasterBadge size="sm" showText={false} />}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-28 space-y-4 max-w-md mx-auto w-full no-scrollbar">
        {/* Leadership Banner (MASTER privilege) */}
        <div className="p-4 rounded-3xl bg-surface-light dark:bg-surface-dark border-2 border-secondary/40 shadow-soft flex items-center justify-between">
          <div className="pr-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-secondary block mb-0.5">
              Privilégio MASTER
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Fundar e Liderar um Clã</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
              Crie seu grupo, lidere planos conjuntos e una irmãos na oração.
            </p>
          </div>
          <button
            onClick={() => {
              if (canCreateClan) {
                setIsCreateModalOpen(true);
              } else {
                showToast('Apenas assinantes MASTER podem criar clãs!', 'crown');
                openPricingModal();
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-secondary hover:bg-amber-600 text-slate-950 text-xs font-black shadow-md whitespace-nowrap active:scale-95 transition-all shrink-0"
          >
            {canCreateClan ? 'Criar Clã' : 'Obter MASTER'}
          </button>
        </div>

        {/* Existing Clans List */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[16px]">shield</span>
            <span>Clãs Disponíveis para Participação</span>
          </h3>

          <div className="space-y-3">
            {clans.map((clan) => {
              const isJoined = joinedClanId === clan.id;

              return (
                <div
                  key={clan.id}
                  className="p-4 rounded-2xl bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-800 hover:border-primary/40 transition-all space-y-2.5 shadow-soft"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-base">
                        <span className="material-symbols-outlined text-[20px]">
                          {clan.badge_url === 'anchor' ? 'anchor' : 'shield'}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">{clan.name}</h4>
                        <p className="text-[10px] text-secondary font-medium">{clan.leader_name}</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">groups</span>
                      <span>{clan.member_count} membros</span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{clan.description}</p>

                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                    {isJoined ? (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 py-1 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        <span>Membro deste Clã</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleJoinClan(clan)}
                        className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold shadow flex items-center gap-1.5 active:scale-95 transition-all"
                      >
                        <span className="material-symbols-outlined text-[14px]">person_add</span>
                        <span>Entrar no Clã</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Create Clan Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleCreateClan}
            className="w-full max-w-sm bg-surface-light dark:bg-surface-dark border border-secondary/40 rounded-3xl p-5 shadow-2xl space-y-3.5"
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[18px]">crown</span>
                <span>Fundar Novo Clã (MASTER)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="size-7 rounded-full bg-gray-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center text-xs"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Nome do Clã
              </label>
              <input
                type="text"
                required
                value={newClanName}
                onChange={(e) => setNewClanName(e.target.value)}
                placeholder="Ex: Guerreiros de Judá"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Propósito / Descrição
              </label>
              <textarea
                rows={3}
                value={newClanDesc}
                onChange={(e) => setNewClanDesc(e.target.value)}
                placeholder="Descreva a missão espiritual do seu clã..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-secondary hover:bg-amber-600 text-slate-950 font-black text-xs shadow-soft"
              >
                Confirmar Liderança
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
