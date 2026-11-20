import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getLocalUserDataSummary } from '../../lib/guestMigrationService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, icon?: string) => void;
}

type AuthStep = 'choose' | 'otp_verify';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, showToast }) => {
  const {
    signInWithOAuth,
    signInWithOtp,
    verifyOtp,
    isConfigured,
  } = useAuth();

  const [step, setStep] = useState<AuthStep>('choose');
  const [email, setEmail] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Resumo de dados locais a migrar
  const localSummary = getLocalUserDataSummary();
  const hasLocalData =
    localSummary.bookmarksCount > 0 ||
    localSummary.notesCount > 0 ||
    localSummary.highlightsCount > 0 ||
    localSummary.hasReadingProgress ||
    localSummary.offlineAttemptsCount > 0;

  // Temporizador de reenvio de OTP
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  if (!isOpen) return null;

  // Enviar código OTP por e-mail
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      const { error } = await signInWithOtp(email);
      if (error) {
        setErrorMsg(error.message || 'Falha ao enviar código. Tente novamente.');
      } else {
        setStep('otp_verify');
        setCountdown(60);
        showToast('Código de 6 dígitos enviado para o seu e-mail!', 'mail');
      }
    } catch {
      setErrorMsg('Erro de rede ao contactar o servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Validar código OTP de 6 dígitos
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpToken.trim() || otpToken.length < 6) {
      setErrorMsg('Digite o código completo de 6 dígitos recebido no e-mail.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      const { error } = await verifyOtp(email, otpToken);
      if (error) {
        setErrorMsg('Código incorreto ou expirado. Verifique e tente novamente.');
      } else {
        showToast('Bem-vindo(a) ao BiblIA! Progresso guardado.', 'check_circle');
        onClose();
      }
    } catch {
      setErrorMsg('Erro ao validar o código.');
    } finally {
      setLoading(false);
    }
  };

  // Reenviar código OTP
  const handleResend = async () => {
    if (countdown > 0 || loading) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await signInWithOtp(email);
      if (error) {
        setErrorMsg('Não foi possível reenviar agora.');
      } else {
        setCountdown(60);
        showToast('Novo código enviado com sucesso!', 'mail');
      }
    } finally {
      setLoading(false);
    }
  };

  // Login com Google
  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const { error } = await signInWithOAuth('google');
      if (error) {
        setErrorMsg(error.message || 'Falha ao autenticar com o Google.');
      }
    } catch {
      setErrorMsg('Erro ao conectar ao Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in font-display">
      <div className="relative w-full max-w-sm bg-white dark:bg-[#112321] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-dark-border transition-colors">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors"
          title="Fechar"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {/* ── Header ── */}
        <div className="text-center pt-1 pb-4">
          <div className="size-12 rounded-2xl bg-sacred-brand/10 dark:bg-sacred-neon/15 text-sacred-brand dark:text-sacred-neon mx-auto flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-2xl">
              {step === 'otp_verify' ? 'mark_email_read' : 'cloud_sync'}
            </span>
          </div>

          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {step === 'otp_verify' ? 'Confirme o Código' : 'Guardar meu Progresso'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            {step === 'otp_verify'
              ? `Insira o código de 6 dígitos enviado para ${email}`
              : 'Sincronize as suas leituras, notas e fases entre todos os seus dispositivos.'}
          </p>
        </div>

        {/* ── Aviso Pré-Migração do Visitante ── */}
        {hasLocalData && step === 'choose' && (
          <div className="mb-4 p-3 rounded-2xl bg-sacred-light/60 dark:bg-sacred-deep/40 border border-sacred-brand/20 dark:border-sacred-neon/20 flex items-start gap-2.5 text-left">
            <span className="material-symbols-outlined text-sacred-brand dark:text-sacred-neon text-lg shrink-0 mt-0.5">
              verified
            </span>
            <div className="text-[11px] leading-snug text-slate-700 dark:text-teal-200">
              <span className="font-bold">Progresso protegido: </span>
              As suas fases concluídas e notas deste telemóvel serão vinculadas à sua conta.
            </div>
          </div>
        )}

        {/* ── Error Banner ── */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2 animate-shake">
            <span className="material-symbols-outlined text-base shrink-0">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── ETAPA 1: ESCOLHA (Google ou E-mail OTP) ── */}
        {step === 'choose' && (
          <div className="space-y-4">
            {/* Google One-Click Button */}
            <button
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-white dark:bg-dark-card-base border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 text-slate-800 dark:text-white font-bold text-xs shadow-sm hover:shadow transition-all flex items-center justify-center gap-2.5 active:scale-[0.98]"
            >
              <svg className="size-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continuar com Google</span>
            </button>

            {/* Separador */}
            <div className="flex items-center gap-3 my-2 text-slate-400">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              <span className="text-[10px] uppercase font-bold tracking-wider">ou com e-mail</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            </div>

            {/* Formulário de E-mail Sem Palavra-passe (OTP) */}
            <form onSubmit={handleRequestOtp} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1 text-left">
                  Seu E-mail
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                    mail
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@gmail.com"
                    required
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white outline-none focus:border-sacred-brand dark:focus:border-sacred-neon transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full btn-duo-primary dark:btn-duo-primary-dark text-xs py-3.5 font-bold flex items-center justify-center gap-2 shadow-duo-primary disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                    <span>A enviar código...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">send</span>
                    <span>Receber código por e-mail</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ── ETAPA 2: DIGITAÇÃO DO CÓDIGO OTP (6 DÍGITOS) ── */}
        {step === 'otp_verify' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-2 text-center">
                Código de Verificação
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                autoFocus
                className="w-full text-center text-2xl tracking-[0.5em] font-mono font-bold py-3 px-4 rounded-xl border-2 border-sacred-brand dark:border-sacred-neon bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-sacred-neon/40 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otpToken.length < 6}
              className="w-full btn-duo-primary dark:btn-duo-primary-dark text-xs py-3.5 font-bold flex items-center justify-center gap-2 shadow-duo-primary disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  <span>A validar código...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">lock_open</span>
                  <span>Confirmar e Entrar</span>
                </>
              )}
            </button>

            {/* Ações de Reenvio e Voltar */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={() => setStep('choose')}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-semibold text-[11px]"
              >
                ← Trocar e-mail
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={countdown > 0 || loading}
                className={`font-bold text-[11px] ${
                  countdown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-sacred-brand dark:text-sacred-neon hover:underline'
                }`}
              >
                {countdown > 0 ? `Reenviar em ${countdown}s` : 'Reenviar código'}
              </button>
            </div>
          </form>
        )}

        <p className="text-[10px] text-slate-400 text-center mt-5 leading-relaxed">
          Sem palavra-passe. Acesso seguro e direto com código temporário ou conta Google.
        </p>
      </div>
    </div>
  );
};
