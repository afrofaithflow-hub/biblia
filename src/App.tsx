import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext';
import { AudioProvider, useAudio } from './context/AudioContext';
import { ThemeProvider } from './context/ThemeContext';
import { HomeScreen } from './components/home/HomeScreen';
import { BibleReader } from './components/bible/BibleReader';
import { AudioPlayer } from './components/audio/AudioPlayer';
import { MiniAudioPlayer } from './components/audio/MiniAudioPlayer';
import { GameDashboard } from './components/gamification/GameDashboard';
import { WorldMap } from './components/gamification/WorldMap';
import { LevelSelectionScreen } from './components/gamification/LevelSelectionScreen';
import { GameDailyChallenge } from './components/gamification/GameDailyChallenge';
import { GameLeaderboard } from './components/gamification/GameLeaderboard';
import { GameStats } from './components/gamification/GameStats';
import { GameLessonSummary } from './components/gamification/GameLessonSummary';
import { GameLessonHost } from './components/gamification/GameLessonHost';
import { RewardModal } from './components/gamification/RewardModal';
import { OnboardingScreen } from './components/onboarding/OnboardingScreen';
import { AIAssistant } from './components/ai/AIAssistant';
import { ReadingPlans } from './components/plans/ReadingPlans';
import { ClanHub } from './components/clans/ClanHub';
import { ProfileScreen } from './components/profile/ProfileScreen';
import { PricingModal } from './components/pricing/PricingModal';
import { AuthModal } from './components/auth/AuthModal';
import { Toast } from './components/shared/Toast';
import { WebhookSimulatorDrawer } from './components/sandbox/WebhookSimulatorDrawer';

/** Tab-level screens — sub-screens belong to their parent tab */
const GAME_SUB_SCREENS = new Set([
  'screen-mapa-mundos',
  'screen-selecao-nivel',
  'screen-jogo-licao',
  'screen-jogo-quiz',
  'screen-jogo-tf',
  'screen-jogo-fill',
  'screen-desafio-diario',
  'screen-ranking',
  'screen-estatisticas',
  'screen-resumo-licao',
  'screen-recompensa',
]);

const FULLSCREEN_MODES = new Set([
  'screen-onboarding',
  'screen-jogo-licao',
  'screen-jogo-quiz',
  'screen-jogo-tf',
  'screen-jogo-fill',
  'screen-desafio-diario',
  'screen-recompensa',
  'screen-resumo-licao',
]);

/** Returns the active tab key for the bottom nav */
function getActiveTab(screen: string): string {
  if (screen === 'screen-home') return 'home';
  if (screen === 'screen-biblia') return 'biblia';
  if (screen === 'screen-audio') return 'audio';
  if (screen === 'screen-ai') return 'ia';
  if (screen === 'screen-planos') return 'planos';
  if (GAME_SUB_SCREENS.has(screen) || screen === 'screen-game-dashboard') return 'jogo';
  if (screen === 'screen-perfil' || screen === 'screen-clans') return 'perfil';
  return '';
}

/* ── Animated Screen Wrapper ── */
const ScreenView: React.FC<{ screenKey: string; children: React.ReactNode }> = ({
  screenKey,
  children,
}) => {
  const [animKey, setAnimKey] = useState(screenKey);

  useEffect(() => {
    setAnimKey(screenKey);
  }, [screenKey]);

  return (
    <div key={animKey} className="flex-1 flex flex-col h-full overflow-hidden screen-enter">
      {children}
    </div>
  );
};

/* ── Nav Tab Button ── */
interface NavTabProps {
  id: string;
  icon: string;
  label: string;
  active: boolean;
  color?: 'teal' | 'gold' | 'purple';
  badge?: boolean;
  onClick: () => void;
}

const NavTab: React.FC<NavTabProps> = ({ icon, label, active, color = 'teal', badge, onClick }) => {
  const activeColor =
    color === 'purple' ? 'text-purple-600 dark:text-purple-400'
    : color === 'gold' ? 'text-secondary'
    : 'text-primary';
  const indicatorColor =
    color === 'purple' ? 'bg-purple-600 shadow-[0_0_10px_rgba(147,51,234,0.6)]'
    : color === 'gold' ? 'bg-secondary shadow-[0_0_10px_rgba(212,175,55,0.5)]'
    : 'bg-primary shadow-[0_0_10px_rgba(45,122,124,0.5)]';

  return (
    <li className="flex-1">
      <button
        onClick={onClick}
        className={`relative flex flex-col items-center gap-0.5 py-1 px-1.5 w-full transition-all duration-200 ripple rounded-xl
          ${active ? activeColor : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}
        `}
      >
        {/* Ambient glow behind active icon */}
        {active && color === 'purple' && (
          <span className="absolute top-1 left-1/2 -translate-x-1/2 w-7 h-7 bg-purple-500/20 rounded-full blur-md" />
        )}

        <span
          className={`material-symbols-outlined text-[22px] relative z-10 transition-all duration-250
            ${active ? 'scale-110' : 'scale-100'}
          `}
          style={{
            fontVariationSettings: active ? "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
          }}
        >
          {icon}
        </span>

        <span className={`text-[9.5px] leading-tight font-${active ? 'extrabold' : 'medium'} relative z-10 tracking-tight`}>
          {label}
        </span>

        {/* Active indicator line */}
        {active && (
          <span className={`nav-indicator ${indicatorColor}`} />
        )}

        {/* Badge dot */}
        {badge && !active && (
          <span className="absolute top-0.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-surface-dark" />
        )}
      </button>
    </li>
  );
};

const AppContent: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState('screen-home');
  const [prevScreen, setPrevScreen] = useState('screen-home');
  const [toast, setToast] = useState<{ message: string; icon?: string } | null>(null);
  const screenRef = useRef<string>('screen-home');

  const { isPricingModalOpen, closePricingModal } = useSubscription();
  const { isPlaying } = useAudio();
  const { isAuthModalOpen, closeAuthModal } = useAuth();

  const navigate = (screen: string) => {
    setPrevScreen(screenRef.current);
    screenRef.current = screen;
    setCurrentScreen(screen);
  };

  const showToast = (message: string, icon = 'check_circle') => {
    setToast({ message, icon });
    setTimeout(() => setToast(null), 2800);
  };

  const activeTab = getActiveTab(currentScreen);
  const showBottomNav = !FULLSCREEN_MODES.has(currentScreen);

  // Sincronização canônica de jogo (G3 Supabase Offline-First)
  useEffect(() => {
    import('./lib/gameSyncService')
      .then(({ flushOfflineAttemptsQueue, pullRemoteProgress, syncRemoteReviewQueue }) => {
        flushOfflineAttemptsQueue();
        pullRemoteProgress();
        syncRemoteReviewQueue();
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col w-full h-[100dvh] min-h-[100dvh] bg-bg-canvas dark:bg-dark-canvas text-slate-900 dark:text-slate-100 font-display overflow-hidden transition-colors duration-300">
      {/* Ambient background glow blobs */}
      <div className="fixed top-1/4 -left-16 w-80 h-80 bg-sacred-brand/5 dark:bg-sacred-neon/5 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="fixed bottom-1/4 -right-20 w-72 h-72 bg-gold-radiant/5 rounded-full blur-3xl pointer-events-none -z-0" />

      {/* Screen Content with animated transitions */}
      <div className="flex-1 flex flex-col overflow-hidden relative w-full">
          <ScreenView screenKey={currentScreen}>
            {currentScreen === 'screen-home' && (
              <HomeScreen onNavigate={navigate} showToast={showToast} />
            )}
            {currentScreen === 'screen-biblia' && (
              <BibleReader onNavigate={navigate} showToast={showToast} />
            )}
            {currentScreen === 'screen-audio' && (
              <AudioPlayer onNavigate={navigate} showToast={showToast} />
            )}
            {currentScreen === 'screen-game-dashboard' && (
              <GameDashboard onNavigate={navigate} showToast={showToast} />
            )}
            {currentScreen === 'screen-mapa-mundos' && (
              <WorldMap onNavigate={navigate} showToast={showToast} />
            )}
            {currentScreen === 'screen-selecao-nivel' && (
              <LevelSelectionScreen onNavigate={navigate} showToast={showToast} />
            )}
            {currentScreen === 'screen-jogo-licao' && (
              <GameLessonHost onNavigate={navigate} showToast={showToast} />
            )}
            {currentScreen === 'screen-jogo-quiz' && (
              <GameLessonHost onNavigate={navigate} showToast={showToast} defaultMode="quiz" />
            )}
            {currentScreen === 'screen-jogo-tf' && (
              <GameLessonHost onNavigate={navigate} showToast={showToast} defaultMode="true-false" />
            )}
            {currentScreen === 'screen-jogo-fill' && (
              <GameLessonHost onNavigate={navigate} showToast={showToast} defaultMode="fill-blanks" />
            )}
            {currentScreen === 'screen-desafio-diario' && (
              <GameDailyChallenge onNavigate={navigate} showToast={showToast} />
            )}
            {currentScreen === 'screen-ranking' && (
              <GameLeaderboard onNavigate={navigate} showToast={showToast} />
            )}
            {currentScreen === 'screen-estatisticas' && (
              <GameStats onNavigate={navigate} showToast={showToast} />
            )}
            {currentScreen === 'screen-resumo-licao' && (
              <GameLessonSummary onNavigate={navigate} showToast={showToast} />
            )}
            {currentScreen === 'screen-recompensa' && (
              <RewardModal onContinue={() => navigate('screen-resumo-licao')} />
            )}
            {currentScreen === 'screen-onboarding' && (
              <OnboardingScreen
                onComplete={() => navigate('screen-home')}
                showToast={showToast}
              />
            )}
            {currentScreen === 'screen-ai' && (
              <AIAssistant onNavigate={navigate} showToast={showToast} />
            )}
            {currentScreen === 'screen-planos' && (
              <ReadingPlans onNavigate={navigate} showToast={showToast} />
            )}
            {currentScreen === 'screen-clans' && (
              <ClanHub onNavigate={navigate} showToast={showToast} />
            )}
            {currentScreen === 'screen-perfil' && (
              <ProfileScreen onNavigate={navigate} showToast={showToast} />
            )}
          </ScreenView>
        </div>

        {/* Mini Audio Player */}
        {currentScreen !== 'screen-audio' && isPlaying && (
          <MiniAudioPlayer onExpand={() => navigate('screen-audio')} />
        )}

        {/* ── Bottom Navigation Bar (Adaptativa Claro & Noturno com Safe Area) ── */}
        {showBottomNav && (
          <nav className="glass-surface dark:bg-[#081413]/95 border-t border-slate-200/80 dark:border-[#1a3330] pb-safe z-30 shrink-0 h-[72px] px-2 relative w-full transition-colors duration-300">
            <div className="max-w-md md:max-w-xl lg:max-w-2xl mx-auto w-full h-full">
              <ul className="flex justify-around items-center w-full h-full">
                {/* 1. Início */}
                <li className="flex-1">
                  <button
                    onClick={() => navigate('screen-home')}
                    className={`w-full flex flex-col items-center justify-center gap-1 transition-colors ${
                      activeTab === 'home'
                        ? 'text-sacred-brand dark:text-sacred-neon font-bold'
                        : 'text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-2xl"
                      style={{ fontVariationSettings: activeTab === 'home' ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      home
                    </span>
                    <span className="text-[11px] tracking-tight">Início</span>
                  </button>
                </li>

                {/* 2. Ouvir (Áudio Bíblia Funcional) */}
                <li className="flex-1">
                  <button
                    onClick={() => navigate('screen-audio')}
                    className={`w-full flex flex-col items-center justify-center gap-1 relative transition-colors ${
                      activeTab === 'audio'
                        ? 'text-sacred-brand dark:text-sacred-neon font-bold'
                        : 'text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-2xl"
                      style={{ fontVariationSettings: activeTab === 'audio' ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      headphones
                    </span>
                    {isPlaying && activeTab !== 'audio' && (
                      <span className="absolute top-0 right-4 size-2 rounded-full bg-emerald-500 animate-ping" />
                    )}
                    <span className="text-[11px] tracking-tight">Ouvir</span>
                  </button>
                </li>

                {/* 3. Botão Central Flutuante — Jornada / Game (Stitch Design Guide: 54px com Dark Glow) */}
                <li className="flex-1 flex justify-center">
                  <div className="relative -top-4 flex flex-col items-center">
                    <button
                      onClick={() => navigate('screen-game-dashboard')}
                      className={`size-[54px] rounded-full transition-transform active:scale-95 flex items-center justify-center shadow-duo-primary ${
                        activeTab === 'jogo'
                          ? 'bg-gradient-to-tr from-sacred-brand to-sacred-neon text-white dark:text-slate-950 border-4 border-white dark:border-[#081413] shadow-glow-teal ring-2 ring-sacred-neon/50'
                          : 'bg-gradient-to-tr from-sacred-deep to-sacred-brand text-white border-4 border-white dark:border-[#081413] hover:brightness-110 shadow-sm'
                      }`}
                      title="Jornada & Game Bíblico"
                    >
                      <span
                        className="material-symbols-outlined text-2xl"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        sports_esports
                      </span>
                    </button>
                    <span className="text-[11px] font-bold text-sacred-brand dark:text-sacred-neon mt-0.5">
                      Jornada
                    </span>
                  </div>
                </li>

                {/* 4. Leitura Bíblica */}
                <li className="flex-1">
                  <button
                    onClick={() => navigate('screen-biblia')}
                    className={`w-full flex flex-col items-center justify-center gap-1 transition-colors ${
                      activeTab === 'biblia'
                        ? 'text-sacred-brand dark:text-sacred-neon font-bold'
                        : 'text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-2xl"
                      style={{ fontVariationSettings: activeTab === 'biblia' ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      menu_book
                    </span>
                    <span className="text-[11px] tracking-tight">Leitura</span>
                  </button>
                </li>

                {/* 5. Perfil & Membresia */}
                <li className="flex-1">
                  <button
                    onClick={() => navigate('screen-perfil')}
                    className={`w-full flex flex-col items-center justify-center gap-1 transition-colors ${
                      activeTab === 'perfil'
                        ? 'text-sacred-brand dark:text-sacred-neon font-bold'
                        : 'text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-2xl"
                      style={{ fontVariationSettings: activeTab === 'perfil' ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      person
                    </span>
                    <span className="text-[11px] tracking-tight">Perfil</span>
                  </button>
                </li>
              </ul>
            </div>
          </nav>
        )}

        {/* Toast */}
        <Toast message={toast?.message || null} icon={toast?.icon} />

        {/* Pricing Modal */}
        <PricingModal
          isOpen={isPricingModalOpen}
          onClose={closePricingModal}
          showToast={showToast}
        />

        {/* Auth Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={closeAuthModal}
          showToast={showToast}
        />

        {/* Sandbox Webhook Simulator (Apenas Ambiente DEV) */}
        {import.meta.env.DEV && <WebhookSimulatorDrawer />}

      </div>
  );
};

export const App: React.FC = () => (
  <ThemeProvider>
    <AuthProvider>
      <SubscriptionProvider>
        <AudioProvider>
          <AppContent />
        </AudioProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
