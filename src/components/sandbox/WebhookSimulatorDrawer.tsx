import React, { useState } from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { SubscriptionStatus } from '../../types/biblia';

export const WebhookSimulatorDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    planTier,
    planName,
    isSubscriptionActive,
    subscriptionStatus,
    remainingDownloadsToday,
    activatePlan,
    simulateWebhookEvent,
    webhookLogs,
  } = useSubscription();

  return (
    <>
      {/* Floating Toggle Button (Top Right Safe Anchor) */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-3 right-3 z-40 px-2.5 py-1 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-blue-400 shadow-xl backdrop-blur flex items-center gap-1.5 transition-all opacity-70 hover:opacity-100"
        title="Painel Sandbox de Subscrições & Webhooks"
      >
        <i className="fa-solid fa-code text-[10px]" />
        <span>Sandbox</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      </button>

      {/* Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#0e1422] border-l border-slate-800 h-full p-4 overflow-y-auto flex flex-col justify-between shadow-2xl">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 text-xs">
                    <i className="fa-solid fa-flask" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Simulador Sandbox</h3>
                    <p className="text-[10px] text-slate-400">PRD Final v2.1 — Supabase & Webhooks</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>

              {/* Current State Summary */}
              <div className="my-3 p-3 rounded-xl bg-[#161f36] border border-slate-700/80 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Plano Atual:</span>
                  <span className="font-bold text-white uppercase">{planName} (Tier {planTier})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status Subscrição:</span>
                  <span className="font-bold text-emerald-400 uppercase">{subscriptionStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cota Downloads Hoje:</span>
                  <span className="font-bold text-blue-400">
                    {planTier === 2 ? 'Ilimitado (MASTER)' : `${remainingDownloadsToday}/5 restantes`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ativo no Backend:</span>
                  <span className={`font-bold ${isSubscriptionActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {isSubscriptionActive ? 'SIM (Acesso Concedido)' : 'NÃO (Acesso FREE)'}
                  </span>
                </div>
              </div>

              {/* Fast Plan Switcher */}
              <div className="mb-4">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Alternar Plano Imediato
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => simulateWebhookEvent('expired')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                      planTier === 0
                        ? 'bg-slate-700 border-slate-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    FREE ($0)
                  </button>
                  <button
                    onClick={() => activatePlan(1)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                      planTier === 1
                        ? 'bg-blue-600 border-blue-400 text-white shadow'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    PREMIUM ($1.49)
                  </button>
                  <button
                    onClick={() => activatePlan(2)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                      planTier === 2
                        ? 'bg-amber-500 border-amber-300 text-black shadow font-black'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    MASTER ($2.99)
                  </button>
                </div>
              </div>

              {/* Webhook Lifecycle Events Simulator */}
              <div className="mb-4">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Disparar Webhook do Fornecedor
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => simulateWebhookEvent('active')}
                    className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60 text-left"
                  >
                    <p className="font-bold">payment.succeeded</p>
                    <p className="text-[10px] text-emerald-400/80">Status: active</p>
                  </button>
                  <button
                    onClick={() => simulateWebhookEvent('past_due')}
                    className="p-2 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 hover:bg-amber-900/60 text-left"
                  >
                    <p className="font-bold">payment.failed</p>
                    <p className="text-[10px] text-amber-400/80">Status: past_due</p>
                  </button>
                  <button
                    onClick={() => simulateWebhookEvent('cancelled')}
                    className="p-2 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-300 hover:bg-purple-900/60 text-left"
                  >
                    <p className="font-bold">customer.cancel</p>
                    <p className="text-[10px] text-purple-400/80">Status: cancelled</p>
                  </button>
                  <button
                    onClick={() => simulateWebhookEvent('expired')}
                    className="p-2 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:bg-rose-900/60 text-left"
                  >
                    <p className="font-bold">sub.expired</p>
                    <p className="text-[10px] text-rose-400/80">Volta para FREE</p>
                  </button>
                </div>
              </div>

              {/* Live Webhook Events Audit Log */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Log de Eventos & Idempotência ({webhookLogs.length})
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {webhookLogs.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">Nenhum evento registrado ainda.</p>
                  ) : (
                    webhookLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono"
                      >
                        <div className="flex justify-between items-center text-slate-400 mb-0.5">
                          <span className="text-blue-400">{log.event_type}</span>
                          <span>{log.timestamp}</span>
                        </div>
                        <p className="text-slate-300">
                          Result: <span className="text-emerald-400">{log.status_result}</span> (Idempotent)
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 text-center">
              Backend Supabase RLS & Cotas ativas em memória
            </div>
          </div>
        </div>
      )}
    </>
  );
};
