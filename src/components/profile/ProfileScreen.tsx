import React from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useTheme, ThemeMode } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

interface ProfileScreenProps {
  onNavigate: (screen: string) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onNavigate, showToast }) => {
  const {
    currentPlan,
    planTier,
    isSubscriptionActive,
    openPricingModal,
    cancelSubscription,
  } = useSubscription();

  const { themeMode, setThemeMode } = useTheme();
  const { user, openAuthModal, signOut } = useAuth();

  const displayName =
    user?.user_metadata?.display_name || (user?.email ? user.email.split('@')[0] : 'João');
  const userEmail = user?.email || 'joao.pereira@biblia.app';

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto no-scrollbar bg-bg-canvas dark:bg-dark-canvas text-slate-800 dark:text-slate-100 font-display transition-colors duration-200 pb-28">
      {/* Top Header */}
      <header className="flex items-center justify-between p-4 pt-5 bg-transparent sticky top-0 z-10 backdrop-blur-md border-b border-slate-200/60 dark:border-dark-border">
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
              onClick={openAuthModal}
              className="text-sacred-brand dark:text-sacred-neon hover:brightness-110 transition-colors p-1"
              title="Conectar Conta"
            >
              <span className="material-symbols-outlined text-xl">login</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-6 pt-2 overflow-y-auto no-scrollbar w-full max-w-md mx-auto">
        {/* User Identity Section (Protótipo 2.1 — Gold Ring Avatar) */}
        <section className="flex flex-col items-center gap-3 mb-6 w-full animate-fade-in text-center">
          <div
            onClick={openAuthModal}
            className="relative group cursor-pointer"
            title={user ? 'Alterar Foto' : 'Conectar Conta'}
          >
            <div className="p-1 rounded-full border-2 border-gold-radiant/60 dark:border-gold-radiant/40 shadow-sm">
              <div
                className="size-24 rounded-full bg-cover bg-center shadow-soft flex items-center justify-center bg-slate-200 dark:bg-slate-800"
                style={{
                  backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuAK9KKr7Y21m-qaMZTLU1Jes5mmeftJGVnlQAExsiE6fEeWw1hnhju4LfZbAHhwG9tCCulmsTgAUuGAB_9zvWf0tIu5aWDvlYtCCi3onDkuKGbdDZ6U_QPxOdaZM8whk8_2lR99ha5i-KasXafoufTX6shzhPzle63_pJUBx9djSurblSHUFJKHgMF_vZYSM0FDST6zjgVgbWQ_ny9eiwWtDec2_f1yd76QJXB1ZkDmxiHvkAutfXzktV5eSZq9na_li7Cq9NQS4pc')`,
                }}
              />
            </div>
            <div className="absolute bottom-1 right-1 bg-sacred-brand text-white rounded-full p-1.5 border-2 border-bg-canvas dark:border-dark-canvas flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[13px]">edit</span>
            </div>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white capitalize">
              {displayName}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">{userEmail}</p>

            {!user ? (
              <button
                onClick={openAuthModal}
                className="mt-2 px-3 py-1 rounded-full text-xs font-bold bg-sacred-light dark:bg-sacred-deep/60 text-sacred-brand dark:text-sacred-neon hover:brightness-105 transition-all inline-flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">login</span>
                <span>Fazer Login ou Criar Conta</span>
              </button>
            ) : (
              <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="material-symbols-outlined text-[12px]">check_circle</span>
                <span>Conta Sincronizada</span>
              </div>
            )}
          </div>
        </section>

        {/* Membership Status Card (Protótipo 2.1 — Estado Actual) */}
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
                      ? 'Plano Master Ilimitado'
                      : currentPlan === 'PREMIUM'
                      ? 'Plano Premium Mensal'
                      : 'Plano Gratuito (Free)'}
                  </p>
                </div>
                <div className="bg-sacred-light dark:bg-sacred-deep/50 p-2.5 rounded-xl text-sacred-brand dark:text-sacred-neon">
                  <span className="material-symbols-outlined text-2xl">spa</span>
                </div>
              </div>

              {/* Gamification Streak Nod */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-gold-talent text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                      bolt
                    </span>
                    <span>7 Dias de Graça</span>
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">Ofensiva Semanal</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-gold-talent to-gold-radiant h-full rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mission Statement (Protótipo 2.1 — Quote) */}
        <section className="w-full mb-6 px-3 text-center">
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-3xl">format_quote</span>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 font-serif italic max-w-xs mx-auto">
              "Esta aplicação é sustentada por pessoas que creem no poder transformador da Palavra de Deus para todas as nações."
            </p>
            <div className="w-12 h-1 rounded-full bg-sacred-brand/20 dark:bg-sacred-neon/30 mt-1"></div>
          </div>
        </section>

        {/* Support & Upgrade CTA Button */}
        <section className="w-full mb-6">
          <button
            onClick={openPricingModal}
            className="w-full btn-duo-primary dark:btn-duo-primary-dark text-sm py-4 flex items-center justify-center gap-2.5"
          >
            <span className="material-symbols-outlined text-xl">volunteer_activism</span>
            <span>Apoiar & Fazer Crescer o Movimento</span>
          </button>
          <p className="text-center text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Contribua para manter a Bíblia acessível e apoiar traduções em línguas africanas.
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
              onClick={() => showToast('Cache de áudio otimizado (0 MB limpos).', 'cleaning_services')}
              className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg text-slate-400">storage</span>
                <span>Armazenamento & Áudio Offline</span>
              </div>
              <span className="material-symbols-outlined text-base text-slate-400">chevron_right</span>
            </button>

            <button
              onClick={() => onNavigate('screen-clans')}
              className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg text-slate-400">groups</span>
                <span>Clãs & Grupos de Oração</span>
              </div>
              <span className="material-symbols-outlined text-base text-slate-400">chevron_right</span>
            </button>

            <button
              onClick={() => showToast('Notificações devocionais ativadas para as 07:00.', 'notifications')}
              className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg text-slate-400">notifications</span>
                <span>Lembrete Devocional Diário</span>
              </div>
              <span className="text-[11px] text-sacred-brand dark:text-sacred-neon font-bold">07:00</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};
