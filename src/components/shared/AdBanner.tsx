import React from 'react';
import { useSubscription } from '../../context/SubscriptionContext';

export const AdBanner: React.FC = () => {
  const { hasNoAds, openPricingModal } = useSubscription();

  // If user has PREMIUM or MASTER, ads are completely hidden (PRD v2.1)
  if (hasNoAds) return null;

  return (
    <div className="mx-4 my-2 p-3 rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
      <div className="flex items-center gap-2.5">
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 uppercase tracking-wide">
          Anúncio
        </span>
        <div>
          <p className="font-semibold text-gray-900 dark:text-white text-[11px]">Livraria Evangélica Semeador</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">Comentários bíblicos com 20% de desconto</p>
        </div>
      </div>
      <button
        onClick={openPricingModal}
        className="text-[11px] font-bold text-primary hover:text-primary-dark underline underline-offset-2 flex items-center gap-1 shrink-0"
        title="Remover anúncios com PREMIUM"
      >
        <span>Remover</span>
        <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
      </button>
    </div>
  );
};
