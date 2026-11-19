import React, { useState } from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useAuth } from '../../context/AuthContext';
import { PLANS } from '../../lib/subscriptionService';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast?: (msg: string, icon?: string) => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, showToast }) => {
  const {
    planTier,
    currentPlan,
    isSubscriptionActive,
    paymentsAvailable,
    activatePlan,
  } = useSubscription();

  const { user, openAuthModal } = useAuth();
  const [loadingTier, setLoadingTier] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleSelectPlan = async (tier: 0 | 1 | 2) => {
    if (tier === 0 || (tier === planTier && isSubscriptionActive)) {
      if (showToast) showToast(`Você já está no plano ${currentPlan}!`, 'check_circle');
      onClose();
      return;
    }

    if (!user) {
      if (showToast) showToast('Autentique-se primeiro para assinar um plano.', 'login');
      onClose();
      openAuthModal();
      return;
    }

    setLoadingTier(tier);
    try {
      const res = await activatePlan(tier as 1 | 2);
      if (res.error) {
        if (showToast) showToast(res.error, 'error');
      } else if (res.checkout_url) {
        if (showToast) showToast('A redirecionar para checkout seguro...', 'payment');
      }
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-2xl my-6 max-h-[92vh] overflow-y-auto text-gray-900 dark:text-gray-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 size-9 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-colors"
          title="Fechar"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>

        {/* Header */}
        <div className="text-center pt-2 pb-4">
          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase tracking-wider mb-2">
            BiblIA — PRD v2.1
          </span>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Escolha o Seu Plano
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
            Leitura ilimitada 100% gratuita para todos. Atualize para desbloquear áudio imersivo e sem anúncios.
          </p>
        </div>

        {/* Current User Plan Banner */}
        <div className="mb-4 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">Plano Atual:</span>
            <span className="font-bold text-primary dark:text-teal-400 uppercase">
              {currentPlan}
            </span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isSubscriptionActive
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            {isSubscriptionActive ? 'Ativo' : 'Gratuito'}
          </span>
        </div>

        {/* 3 Plan Cards */}
        <div className="space-y-3.5">
          {PLANS.map((plan) => {
            const isCurrent = plan.tier === planTier;
            const isRecommended = plan.isRecommended;
            const isMaster = plan.tier === 2;

            const planFeatures = plan.features || plan.benefits || [];

            return (
              <div
                key={plan.id || String(plan.tier)}
                className={`relative p-4 rounded-2xl border transition-all ${
                  isRecommended
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10'
                    : isMaster
                    ? 'border-secondary/60 bg-secondary/5 dark:bg-secondary/10'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark'
                }`}
              >
                {isRecommended && (
                  <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-extrabold uppercase tracking-wide shadow-sm">
                    Recomendado
                  </span>
                )}
                {isMaster && (
                  <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-secondary text-slate-950 text-[10px] font-black uppercase tracking-wide shadow-gold-glow border border-secondary/40 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>crown</span>
                    <span>Mais Completo</span>
                  </span>
                )}

                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      {plan.name}
                      {isMaster && (
                        <span className="material-symbols-outlined text-secondary text-base fill-1">
                          diamond
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {plan.tagline || plan.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-gray-900 dark:text-white">
                      {plan.priceFormatted}
                    </div>
                    <div className="text-[10px] text-gray-400">{plan.period}</div>
                  </div>
                </div>

                {/* Features List */}
                <ul className="space-y-1.5 my-3 text-xs text-gray-600 dark:text-gray-300">
                  {planFeatures.map((feat: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[15px] text-primary shrink-0 mt-0.5">
                        check_circle
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                {/* Plan Action Button */}
                <button
                  onClick={() => handleSelectPlan(plan.tier as 0 | 1 | 2)}
                  disabled={loadingTier !== null || (plan.tier > 0 && !paymentsAvailable)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-1.5 ${
                    isCurrent && isSubscriptionActive
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-default'
                      : plan.tier > 0 && !paymentsAvailable
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed shadow-none'
                      : plan.tier === 0
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200'
                      : plan.tier === 1
                      ? 'bg-primary hover:bg-primary-dark text-white'
                      : 'bg-secondary hover:bg-yellow-500 text-slate-950 font-black'
                  }`}
                >
                  {loadingTier === plan.tier ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                      <span>A preparar Stripe...</span>
                    </>
                  ) : isCurrent && (isSubscriptionActive || plan.tier === 0) ? (
                    'Plano Atual'
                  ) : plan.tier > 0 && !paymentsAvailable ? (
                    'Disponível em breve'
                  ) : (
                    `Assinar ${plan.name} (${plan.priceFormatted})`
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-gray-400 text-center mt-4">
          Valores de referência em USD. A cobrança será ativada somente com gateway e webhooks verificados.
        </p>
      </div>
    </div>
  );
};
