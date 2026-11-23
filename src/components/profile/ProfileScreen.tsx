import React, { useState, useEffect } from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useTheme, ThemeMode } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getUserProgressTracks } from '../../lib/gameSession';
import { getLocalUserDataSummary } from '../../lib/guestMigrationService';

interface ProfileScreenProps {
  onNavigate: (screen: string) => void;
  showToast: (msg: string, icon?: string) => void;
}

interface ReminderConfig {
  enabled: boolean;
  time: string;
}

const REMINDER_STORAGE_KEY = 'biblia_devotional_reminder_v1';

function loadReminderConfig(): ReminderConfig {
  try {
    const raw = localStorage.getItem(REMINDER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ReminderConfig>;
      return {
        enabled: Boolean(parsed.enabled),
        time: typeof parsed.time === 'string' && /^\d{2}:\d{2}$/.test(parsed.time) ? parsed.time : '07:00',
      };
    }
  } catch {
    // ignore
  }
  return { enabled: false, time: '07:00' };
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onNavigate, showToast }) => {
  const {
    profile,
    currentPlan,
    isSubscriptionActive,
    openPricingModal,
    cancelSubscription,
  } = useSubscription();

  const { themeMode, setThemeMode } = useTheme();
  const { user, openAuthModal, signOut, updateDisplayName } = useAuth();
  const tracks = getUserProgressTracks();

  const [loadingPortal, setLoadingPortal] = useState(false);

  // Modal Editar Perfil
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Modal Armazenamento & Cache Real
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [storageUsageLabel, setStorageUsageLabel] = useState('A calcular...');
  const [cacheCount, setCacheCount] = useState(0);
  const [clearingCache, setClearingCache] = useState(false);

  // Modal Lembrete Devocional
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminder, setReminder] = useState<ReminderConfig>(loadReminderConfig);

  const displayName =
    String(user?.user_metadata?.display_name || profile.display_name || '').trim() ||
    (user?.email ? user.email.split('@')[0] : 'Visitante');
  const userEmail = user?.email || 'Progresso guardado neste dispositivo';

  const refreshStorageStats = async () => {
    try {
      if (navigator.storage?.estimate) {
        const est = await navigator.storage.estimate();
        const usedMb = ((est.usage || 0) / (1024 * 1024)).toFixed(2);
        setStorageUsageLabel(`${usedMb} MB utilizados neste dispositivo`);
      } else {
        setStorageUsageLabel('Espaço local gerido pelo navegador');
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        setCacheCount(keys.length);
      }
    } catch {
      setStorageUsageLabel('Espaço local gerido pelo navegador');
    }
  };

  useEffect(() => {
    if (showStorageModal) {
      void refreshStorageStats();
    }
  }, [showStorageModal]);

  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    try {
      const res = await cancelSubscription();
      if (res.error) {
        showToast(res.error, 'info');
      } else {
        showToast('A abrir portal de pagamentos...', 'open_in_new');
      }
    } finally {
      setLoadingPortal(false);
    }
  };

  const handleSaveProfileName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editName.trim().length < 2) {
      showToast('O nome deve ter pelo menos 2 caracteres.', 'info');
      return;
    }
    setSavingName(true);
    try {
      const { error } = await updateDisplayName(editName);
      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast('Perfil atualizado com sucesso!', 'check_circle');
        setShowEditProfile(false);
      }
    } finally {
      setSavingName(false);
    }
  };

  const handleClearTempCaches = async () => {
    setClearingCache(true);
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
        await refreshStorageStats();
        showToast(
          keys.length > 0
            ? `${keys.length} cache(s) temporária(s) limpa(s). Os seus dados de leitura foram mantidos.`
            : 'Não existem caches temporárias para limpar.',
          'cleaning_services'
        );
      } else {
        showToast('Cache temporária não disponível neste navegador.', 'info');
      }
    } finally {
      setClearingCache(false);
    }
  };

  const handleSaveReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reminder.enabled && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission().catch(() => {});
      }
    }
    try {
      localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(reminder));
    } catch {
      // ignore
    }
    setShowReminderModal(false);
    showToast(
      reminder.enabled
        ? `Preferência de lembrete guardada para as ${reminder.time}.`
        : 'Lembrete devocional desativado.',
      'notifications'
    );
  };

  const localSummary = getLocalUserDataSummary();
  const notificationPermission =
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-bg-canvas dark:bg-dark-canvas text-slate-800 dark:text-slate-100 font-display transition-colors duration-200">
      {/* Top Header */}
      <header className="shrink-0 flex items-center justify-between p-4 pt-4 bg-bg-canvas/95 dark:bg-dark-canvas/95 backdrop-blur-md border-b border-slate-200/60 dark:border-dark-border z-10">
        <button
          onClick={() => onNavigate('screen-home')}
          className="flex size-10 items-center justify-center rounded-full text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          title="Voltar ao Início"
        >
          <span className="material-symbols-outlined text-xl">arrow_back_ios_new</span>
        </button>
        <h2 className="text-slate-900 dark:text-white text-base font-bold tracking-tight">
          Perfil & Membresia
        </h2>
        <div className="size-10 flex items-center justify-center">
          {user ? (
            <button
              onClick={async () => {
                await signOut();
                showToast('Sessão encerrada com sucesso.', 'logout');
              }}
              className="text-slate-400 hover:text-rose-500 transition-colors p-1"
              title="Terminar Sessão"
            >
              <span className="material-symbols-outlined text-xl">logout</span>
            </button>
          ) : (
            <button
              onClick={() => openAuthModal('signin')}
              className="text-sacred-brand dark:text-sacred-neon hover:brightness-110 transition-colors p-1"
              title="Entrar na Conta"
            >
              <span className="material-symbols-outlined text-xl">login</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 flex flex-col items-center px-4 sm:px-6 pt-3 pb-36 overflow-y-auto no-scrollbar w-full max-w-md mx-auto">
        {/* User Identity Section */}
        <section className="flex flex-col items-center gap-3 mb-6 w-full animate-fade-in text-center">
          <div
            onClick={() => {
              if (user) {
                setEditName(displayName);
                setShowEditProfile(true);
              } else {
                openAuthModal('signin');
              }
            }}
            className="relative group cursor-pointer"
            title={user ? 'Editar Nome de Perfil' : 'Conectar Conta'}
          >
            <div className="p-1 rounded-full border-2 border-gold-radiant/60 dark:border-gold-radiant/40 shadow-sm">
              <div className="size-24 rounded-full shadow-soft flex items-center justify-center bg-sacred-brand/15 text-sacred-brand dark:bg-slate-800 dark:text-sacred-neon font-black text-3xl">
                {user ? displayName.charAt(0).toUpperCase() : <span className="material-symbols-outlined text-4xl">person</span>}
              </div>
            </div>
            <div className="absolute bottom-1 right-1 bg-sacred-brand text-white rounded-full p-1.5 border-2 border-bg-canvas dark:border-dark-canvas flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[13px]">edit</span>
            </div>
          </div>

          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
              {displayName}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">{userEmail}</p>

            {!user ? (
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  onClick={() => openAuthModal('signin')}
                  className="px-4 py-1.5 rounded-full text-xs font-bold bg-sacred-brand text-white hover:brightness-110 transition-all inline-flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">login</span>
                  <span>Entrar</span>
                </button>
                <button
                  onClick={() => openAuthModal('signup')}
                  className="px-4 py-1.5 rounded-full text-xs font-bold bg-sacred-light dark:bg-sacred-deep/60 text-sacred-brand dark:text-sacred-neon hover:brightness-105 transition-all inline-flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">person_add</span>
                  <span>Criar Conta</span>
                </button>
              </div>
            ) : (
              <div className="mt-2 flex items-center justify-center gap-2">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="material-symbols-outlined text-[12px]">check_circle</span>
                  <span>Conta Sincronizada</span>
                </div>
                <button
                  onClick={() => {
                    setEditName(displayName);
                    setShowEditProfile(true);
                  }}
                  className="text-[11px] font-bold text-sacred-brand dark:text-sacred-neon hover:underline"
                >
                  Editar nome
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Membership Status Card */}
        <section className="w-full mb-6 text-left">
          <div className="bg-white dark:bg-dark-card-base rounded-2xl p-5 shadow-soft border border-slate-200/80 dark:border-dark-border relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sacred-brand/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500 mb-0.5">
                    Estado Atual
                  </p>
                  <h3 className="text-base font-extrabold text-sacred-brand dark:text-sacred-neon leading-tight">
                    Caminhando com a Palavra
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    {currentPlan === 'MASTER'
                      ? 'Plano Master Mensal'
                      : currentPlan === 'PREMIUM'
                      ? 'Plano Premium Mensal'
                      : 'Plano Gratuito (Free)'}
                  </p>

                  {profile.active_subscription && (
                    <div className="mt-2 text-[11px] space-y-0.5">
                      {profile.active_subscription.cancel_at_period_end ? (
                        <p className="text-amber-500 font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">event_busy</span>
                          <span>Cancelamento agendado até {new Date(profile.active_subscription.current_period_end).toLocaleDateString('pt')}</span>
                        </p>
                      ) : (
                        <p className="text-emerald-500 font-medium flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">check_circle</span>
                          <span>Válido até {new Date(profile.active_subscription.current_period_end).toLocaleDateString('pt')}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="bg-sacred-light dark:bg-sacred-deep/50 p-2.5 rounded-xl text-sacred-brand dark:text-sacred-neon">
                  <span className="material-symbols-outlined text-2xl">spa</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-gold-talent text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                      bolt
                    </span>
                    <span>{tracks.streakDays} {tracks.streakDays === 1 ? 'Dia' : 'Dias'} de Graça</span>
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">Ofensiva Semanal</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-gold-talent to-gold-radiant h-full rounded-full"
                    style={{ width: `${Math.min(100, (tracks.streakDays / 7) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mission Statement */}
        <section className="w-full mb-6 px-3 text-center">
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-3xl">format_quote</span>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 font-serif italic max-w-xs mx-auto">
              "Esta aplicação é sustentada por pessoas que creem no poder transformador da Palavra de Deus para todas as nações."
            </p>
            <div className="w-12 h-1 rounded-full bg-sacred-brand/20 dark:bg-sacred-neon/30 mt-1" />
          </div>
        </section>

        {/* Support & Upgrade CTA */}
        <section className="w-full mb-6">
          {isSubscriptionActive ? (
            <button
              onClick={handleManageSubscription}
              disabled={loadingPortal}
              className="w-full py-3.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700"
            >
              {loadingPortal ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  <span>A aceder ao portal...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">manage_accounts</span>
                  <span>Gerir Subscrição ou Cancelar</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={openPricingModal}
              className="w-full btn-duo-primary dark:btn-duo-primary-dark text-sm py-4 flex items-center justify-center gap-2.5"
            >
              <span className="material-symbols-outlined text-xl">volunteer_activism</span>
              <span>Apoiar & Conhecer Planos</span>
            </button>
          )}
          <p className="text-center text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Contribua para manter a Bíblia acessível e apoiar novas traduções.
          </p>
        </section>

        {/* Theme Mode Selector */}
        <section className="w-full mb-6 text-left">
          <div className="bg-white dark:bg-dark-card-base rounded-2xl p-4 shadow-soft border border-slate-200/80 dark:border-dark-border">
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500 mb-2.5">
              Tema do Aplicativo
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'claro', label: 'Claro', icon: 'light_mode', color: 'text-amber-500' },
                { key: 'escuro', label: 'Escuro', icon: 'dark_mode', color: 'text-sacred-neon' },
                { key: 'sistema', label: 'Sistema', icon: 'devices', color: 'text-slate-400' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => {
                    setThemeMode(opt.key as ThemeMode);
                    showToast(`Tema ${opt.label} ativado!`, opt.icon);
                  }}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    themeMode === opt.key
                      ? 'border-sacred-brand dark:border-sacred-neon bg-sacred-light/60 dark:bg-sacred-neon/15 text-sacred-brand dark:text-sacred-neon shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className={`material-symbols-outlined text-lg ${opt.color}`}>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Settings List */}
        <section className="w-full mb-6 text-left">
          <div className="bg-white dark:bg-dark-card-base rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 shadow-soft border border-slate-200/80 dark:border-dark-border overflow-hidden">
            <button
              onClick={() => setShowStorageModal(true)}
              className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg text-slate-400">storage</span>
                <span>Armazenamento & Cache Offline</span>
              </div>
              <span className="material-symbols-outlined text-base text-slate-400">chevron_right</span>
            </button>

            <button
              onClick={() => onNavigate('screen-clans')}
              className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg text-slate-400">groups</span>
                <span>Grupos & Células</span>
              </div>
              <span className="material-symbols-outlined text-base text-slate-400">chevron_right</span>
            </button>

            <button
              onClick={() => setShowReminderModal(true)}
              className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg text-slate-400">notifications</span>
                <span>Lembrete Devocional Diário</span>
              </div>
              <span className="text-[11px] text-sacred-brand dark:text-sacred-neon font-bold">
                {reminder.enabled ? reminder.time : 'Desativado'}
              </span>
            </button>
          </div>
        </section>
      </main>

      {/* Modal Editar Perfil */}
      {showEditProfile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowEditProfile(false)}
        >
          <form
            onSubmit={handleSaveProfileName}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-dark-card-base rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-dark-border space-y-4 text-left"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Editar Perfil</h3>
              <button
                type="button"
                onClick={() => setShowEditProfile(false)}
                className="size-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">Nome de exibição</label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={50}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:border-sacred-brand"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">E-mail da conta</label>
              <input
                type="text"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-xs text-slate-400"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEditProfile(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingName}
                className="btn-duo-primary px-5 py-2 text-xs font-bold disabled:opacity-50"
              >
                {savingName ? 'A guardar...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Armazenamento Real */}
      {showStorageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowStorageModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-dark-card-base rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-dark-border space-y-4 text-left"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Armazenamento do Dispositivo
              </h3>
              <button
                type="button"
                onClick={() => setShowStorageModal(false)}
                className="size-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 space-y-1.5 text-xs">
              <p className="font-bold text-slate-800 dark:text-slate-100">{storageUsageLabel}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Caches PWA detetadas: <strong>{cacheCount}</strong> · Registos locais: {localSummary.bookmarksCount} favoritos, {localSummary.notesCount} notas, {localSummary.highlightsCount} destaques.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowStorageModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
              >
                Fechar
              </button>
              <button
                type="button"
                disabled={clearingCache}
                onClick={() => void handleClearTempCaches()}
                className="flex-1 py-2.5 rounded-xl bg-sacred-brand text-white text-xs font-bold disabled:opacity-50"
              >
                {clearingCache ? 'A limpar...' : 'Limpar Cache'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lembrete Devocional */}
      {showReminderModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowReminderModal(false)}
        >
          <form
            onSubmit={handleSaveReminder}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-dark-card-base rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-dark-border space-y-4 text-left"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Lembrete Devocional Diário
              </h3>
              <button
                type="button"
                onClick={() => setShowReminderModal(false)}
                className="size-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 cursor-pointer">
              <span className="text-xs font-bold">Ativar lembrete diário</span>
              <input
                type="checkbox"
                checked={reminder.enabled}
                onChange={(e) => setReminder((prev) => ({ ...prev, enabled: e.target.checked }))}
                className="size-4 accent-sacred-brand"
              />
            </label>

            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">Horário preferido</label>
              <input
                type="time"
                value={reminder.time}
                onChange={(e) => setReminder((prev) => ({ ...prev, time: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:border-sacred-brand"
              />
            </div>

            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Permissão de notificações neste navegador:{' '}
              <strong>
                {notificationPermission === 'granted'
                  ? 'Concedida'
                  : notificationPermission === 'denied'
                  ? 'Bloqueada nas definições do navegador'
                  : notificationPermission === 'default'
                  ? 'A aguardar autorização'
                  : 'Não suportada neste navegador'}
              </strong>. As preferências ficam guardadas neste dispositivo.
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReminderModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
              >
                Cancelar
              </button>
              <button type="submit" className="btn-duo-primary px-5 py-2 text-xs font-bold">
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
