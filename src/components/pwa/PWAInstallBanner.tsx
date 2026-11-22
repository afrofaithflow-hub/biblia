import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

interface PWAInstallBannerProps {
  showToast: (message: string, icon?: string) => void;
}

const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ showToast }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Verifica se já está instalado como PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Verifica se o utilizador já dispensou o banner antes
    const dismissed = localStorage.getItem('biblia-pwa-dismissed');
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Aguarda 3 segundos antes de mostrar para não ser intrusivo
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowBanner(false);
      showToast('BiblIA instalado com sucesso!', 'check_circle');
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [showToast]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast('A instalar o BiblIA…', 'download');
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('biblia-pwa-dismissed', Date.now().toString());
  };

  if (!showBanner || isInstalled || !deferredPrompt) return null;

  return (
    <div
      className="fixed bottom-[88px] left-3 right-3 z-50 mx-auto max-w-sm animate-slide-up"
      role="dialog"
      aria-label="Instalar BiblIA"
    >
      <div className="relative flex items-center gap-3 rounded-2xl border border-sacred-neon/30 bg-dark-card-base/95 p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        {/* Icon */}
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sacred-deep to-sacred-brand shadow-inner">
          <span className="material-symbols-outlined text-2xl text-sacred-neon" style={{ fontVariationSettings: "'FILL' 1" }}>
            menu_book
          </span>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-white leading-tight">Instalar BiblIA</p>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
            Acesso offline · Leitura rápida · Sem browser
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            onClick={handleInstall}
            className="rounded-xl bg-sacred-neon px-3 py-1.5 text-xs font-extrabold text-slate-950 transition-all active:scale-95 hover:brightness-105"
          >
            Instalar
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-xl px-3 py-1 text-[10px] font-semibold text-slate-500 hover:text-slate-300 transition-colors"
          >
            Agora não
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-slate-700 text-slate-400 hover:text-white transition-colors"
          aria-label="Fechar"
        >
          <span className="material-symbols-outlined text-xs">close</span>
        </button>
      </div>
    </div>
  );
};

export default PWAInstallBanner;
