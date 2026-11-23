import React, { useState, useEffect } from 'react';
import { useAuth, type AuthModalTab } from '../../context/AuthContext';
import { getLocalUserDataSummary } from '../../lib/guestMigrationService';
import { translateAuthError } from '../../lib/authErrors';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, icon?: string) => void;
}

type AuthView =
  | 'signin'
  | 'signup'
  | 'signup_confirm_email'
  | 'otp_request'
  | 'otp_verify'
  | 'forgot_password'
  | 'forgot_sent'
  | 'update_password';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, showToast }) => {
  const {
    isConfigured,
    authModalInitialTab,
    isPasswordRecovery,
    clearPasswordRecovery,
    signInWithEmail,
    signUpWithEmail,
    signInWithOtp,
    verifyOtp,
    signInWithOAuth,
    resetPassword,
    updatePassword,
  } = useAuth();

  const [view, setView] = useState<AuthView>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Inicializa vista quando abre ou muda modo de recuperação de senha
  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setPassword('');
    setConfirmPassword('');
    setOtpToken('');
    setShowPassword(false);

    if (isPasswordRecovery) {
      setView('update_password');
    } else {
      setView(authModalInitialTab === 'signup' ? 'signup' : 'signin');
    }
  }, [isOpen, authModalInitialTab, isPasswordRecovery]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  if (!isOpen) return null;

  const localSummary = getLocalUserDataSummary();
  const hasLocalData =
    localSummary.bookmarksCount > 0 ||
    localSummary.notesCount > 0 ||
    localSummary.highlightsCount > 0 ||
    localSummary.hasReadingProgress ||
    localSummary.offlineAttemptsCount > 0;

  const switchTab = (tab: AuthModalTab) => {
    setErrorMsg(null);
    setPassword('');
    setConfirmPassword('');
    setView(tab);
  };

  const handleClose = () => {
    setErrorMsg(null);
    setPassword('');
    setConfirmPassword('');
    setOtpToken('');
    if (isPasswordRecovery) clearPasswordRecovery();
    onClose();
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const { error } = await signInWithOAuth('google');
      if (error) {
        setErrorMsg(translateAuthError(error));
      }
    } catch (err) {
      setErrorMsg(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Informe um endereço de e-mail válido.');
      return;
    }
    if (!password) {
      setErrorMsg('Informe a sua palavra-passe.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      const { error } = await signInWithEmail(email, password);
      if (error) {
        setErrorMsg(translateAuthError(error));
      } else {
        showToast('Bem-vindo(a) de volta ao BiblIA!', 'check_circle');
      }
    } catch (err) {
      setErrorMsg(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName.trim().length < 2) {
      setErrorMsg('Digite o seu nome (pelo menos 2 caracteres).');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Informe um endereço de e-mail válido.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('A palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('As palavras-passe não coincidem.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await signUpWithEmail(email, password, displayName);
      if (res.error) {
        setErrorMsg(translateAuthError(res.error));
      } else if (res.needsEmailConfirmation) {
        setView('signup_confirm_email');
        showToast('Conta criada! Confirme o e-mail enviado.', 'mark_email_read');
      } else {
        showToast('Conta criada com sucesso! Progresso sincronizado.', 'check_circle');
      }
    } catch (err) {
      setErrorMsg(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      const { error } = await signInWithOtp(email, displayName.trim() || undefined);
      if (error) {
        setErrorMsg(translateAuthError(error));
      } else {
        setView('otp_verify');
        setCountdown(60);
        showToast('Código de 6 dígitos enviado para o seu e-mail!', 'mail');
      }
    } catch (err) {
      setErrorMsg(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpToken.trim() || otpToken.trim().length < 6) {
      setErrorMsg('Digite o código completo de 6 dígitos recebido no e-mail.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      const { error } = await verifyOtp(email, otpToken, displayName.trim() || undefined);
      if (error) {
        setErrorMsg(translateAuthError(error));
      } else {
        showToast('Sessão iniciada com sucesso! Progresso sincronizado.', 'check_circle');
      }
    } catch (err) {
      setErrorMsg(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || loading) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await signInWithOtp(email);
      if (error) {
        setErrorMsg(translateAuthError(error));
      } else {
        setCountdown(60);
        showToast('Novo código enviado com sucesso!', 'mail');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Informe o e-mail da sua conta.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) {
        setErrorMsg(translateAuthError(error));
      } else {
        setView('forgot_sent');
      }
    } catch (err) {
      setErrorMsg(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setErrorMsg('A nova palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('As palavras-passe não coincidem.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      const { error } = await updatePassword(password);
      if (error) {
        setErrorMsg(translateAuthError(error));
      } else {
        showToast('Palavra-passe atualizada com sucesso!', 'lock_reset');
      }
    } catch (err) {
      setErrorMsg(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const showAuthTabs = view === 'signin' || view === 'signup';

  const headerTitle =
    view === 'signup'
      ? 'Criar Conta no BiblIA'
      : view === 'signup_confirm_email'
      ? 'Confirme o seu E-mail'
      : view === 'otp_request'
      ? 'Entrar com Código'
      : view === 'otp_verify'
      ? 'Confirme o Código'
      : view === 'forgot_password'
      ? 'Recuperar Palavra-passe'
      : view === 'forgot_sent'
      ? 'E-mail Enviado'
      : view === 'update_password'
      ? 'Nova Palavra-passe'
      : 'Entrar no BiblIA';

  const headerIcon =
    view === 'otp_verify' || view === 'signup_confirm_email' || view === 'forgot_sent'
      ? 'mark_email_read'
      : view === 'forgot_password' || view === 'update_password'
      ? 'lock_reset'
      : view === 'signup'
      ? 'person_add'
      : 'cloud_sync';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in font-display overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="relative w-full max-w-sm bg-white dark:bg-[#112321] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-dark-border transition-colors my-auto">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors"
          title="Fechar"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {/* Header */}
        <div className="text-center pt-1 pb-3">
          <div className="size-12 rounded-2xl bg-sacred-brand/10 dark:bg-sacred-neon/15 text-sacred-brand dark:text-sacred-neon mx-auto flex items-center justify-center mb-2.5">
            <span className="material-symbols-outlined text-2xl">{headerIcon}</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {headerTitle}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            {view === 'otp_verify'
              ? `Insira o código de 6 dígitos enviado para ${email}`
              : view === 'signup_confirm_email'
              ? `Enviámos um link de confirmação para ${email}`
              : view === 'forgot_sent'
              ? `Verifique a caixa de entrada de ${email} para redefinir a sua senha.`
              : 'Sincronize as suas leituras, notas, amigos e progresso em qualquer dispositivo.'}
          </p>
        </div>

        {/* Estado se Supabase não estiver configurado no ambiente */}
        {!isConfigured ? (
          <div className="space-y-4 py-2 text-center">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
              O serviço de contas online ainda não está ligado neste ambiente. Pode continuar a ler, estudar e jogar localmente — o seu progresso fica guardado no dispositivo.
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-full btn-duo-primary dark:btn-duo-primary-dark text-xs py-3 font-bold"
            >
              Continuar no Dispositivo
            </button>
          </div>
        ) : (
          <>
            {/* Abas Entrar / Criar Conta */}
            {showAuthTabs && (
              <div className="mb-4 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => switchTab('signin')}
                  className={`py-2 rounded-xl text-xs font-extrabold transition-all ${
                    view === 'signin'
                      ? 'bg-white dark:bg-[#1a3330] text-sacred-brand dark:text-sacred-neon shadow-sm'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => switchTab('signup')}
                  className={`py-2 rounded-xl text-xs font-extrabold transition-all ${
                    view === 'signup'
                      ? 'bg-white dark:bg-[#1a3330] text-sacred-brand dark:text-sacred-neon shadow-sm'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Criar Conta
                </button>
              </div>
            )}

            {/* Aviso Pré-Migração do Visitante */}
            {hasLocalData && showAuthTabs && (
              <div className="mb-4 p-2.5 rounded-2xl bg-sacred-light/60 dark:bg-sacred-deep/40 border border-sacred-brand/20 dark:border-sacred-neon/20 flex items-start gap-2 text-left">
                <span className="material-symbols-outlined text-sacred-brand dark:text-sacred-neon text-base shrink-0 mt-0.5">
                  verified
                </span>
                <p className="text-[11px] leading-snug text-slate-700 dark:text-teal-200">
                  <span className="font-bold">Progresso protegido: </span>
                  Leituras, notas e fases deste dispositivo serão vinculados à sua conta.
                </p>
              </div>
            )}

            {/* Error Banner */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2 text-left">
                <span className="material-symbols-outlined text-base shrink-0">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* ── VISTA 1: ENTRAR (Google + E-mail/Senha + links OTP/Reset) ── */}
            {view === 'signin' && (
              <div className="space-y-3.5">
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-2xl bg-white dark:bg-dark-card-base border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 text-slate-800 dark:text-white font-bold text-xs shadow-sm hover:shadow transition-all flex items-center justify-center gap-2.5 active:scale-[0.98]"
                >
                  <svg className="size-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Continuar com Google</span>
                </button>

                <div className="flex items-center gap-3 text-slate-400">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                  <span className="text-[10px] uppercase font-bold tracking-wider">ou com e-mail</span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                </div>

                <form onSubmit={handlePasswordSignIn} className="space-y-3 text-left">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="exemplo@gmail.com"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white outline-none focus:border-sacred-brand dark:focus:border-sacred-neon"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        Palavra-passe
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMsg(null);
                          setView('forgot_password');
                        }}
                        className="text-[11px] font-bold text-sacred-brand dark:text-sacred-neon hover:underline"
                      >
                        Esqueci a palavra-passe
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white outline-none focus:border-sacred-brand dark:focus:border-sacred-neon"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        tabIndex={-1}
                      >
                        <span className="material-symbols-outlined text-base">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-duo-primary dark:btn-duo-primary-dark text-xs py-3 font-bold flex items-center justify-center gap-2 shadow-duo-primary disabled:opacity-50"
                  >
                    {loading ? 'A entrar...' : 'Entrar na Conta'}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setView('otp_request');
                  }}
                  className="w-full py-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-sacred-brand dark:hover:text-sacred-neon transition-colors"
                >
                  Entrar sem palavra-passe (código de 6 dígitos por e-mail)
                </button>
              </div>
            )}

            {/* ── VISTA 2: CRIAR CONTA ── */}
            {view === 'signup' && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-2xl bg-white dark:bg-dark-card-base border border-slate-300 dark:border-slate-700 hover:border-slate-400 text-slate-800 dark:text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2.5 active:scale-[0.98]"
                >
                  <svg className="size-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Registar com Google</span>
                </button>

                <div className="flex items-center gap-3 text-slate-400">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                  <span className="text-[10px] uppercase font-bold tracking-wider">ou preencha os dados</span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                </div>

                <form onSubmit={handlePasswordSignUp} className="space-y-2.5 text-left">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Seu Nome
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ex: Maria Silva"
                      required
                      maxLength={50}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white outline-none focus:border-sacred-brand dark:focus:border-sacred-neon"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="exemplo@gmail.com"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white outline-none focus:border-sacred-brand dark:focus:border-sacred-neon"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Palavra-passe
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mín. 6 chars"
                        required
                        minLength={6}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white outline-none focus:border-sacred-brand dark:focus:border-sacred-neon"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Confirmar
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repetir senha"
                        required
                        minLength={6}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white outline-none focus:border-sacred-brand dark:focus:border-sacred-neon"
                      />
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                      className="rounded accent-sacred-brand"
                    />
                    Mostrar palavra-passe
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-duo-primary dark:btn-duo-primary-dark text-xs py-3 font-bold flex items-center justify-center gap-2 shadow-duo-primary disabled:opacity-50"
                  >
                    {loading ? 'A criar conta...' : 'Criar Minha Conta'}
                  </button>
                </form>
              </div>
            )}

            {/* ── VISTA 3: CONFIRMAÇÃO DE E-MAIL APÓS SIGN UP ── */}
            {view === 'signup_confirm_email' && (
              <div className="space-y-4 text-center">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Abra o e-mail de confirmação enviado para <strong>{email}</strong> e clique no link de ativação. Depois pode entrar normalmente.
                </p>
                <button
                  type="button"
                  onClick={() => switchTab('signin')}
                  className="w-full btn-duo-primary dark:btn-duo-primary-dark text-xs py-3 font-bold"
                >
                  Ir para Entrar
                </button>
              </div>
            )}

            {/* ── VISTA 4: PEDIR CÓDIGO OTP SEM SENHA ── */}
            {view === 'otp_request' && (
              <form onSubmit={handleRequestOtp} className="space-y-3.5 text-left">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Seu E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@gmail.com"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white outline-none focus:border-sacred-brand"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full btn-duo-primary dark:btn-duo-primary-dark text-xs py-3 font-bold disabled:opacity-50"
                >
                  {loading ? 'A enviar código...' : 'Enviar Código de 6 Dígitos'}
                </button>
                <button
                  type="button"
                  onClick={() => switchTab('signin')}
                  className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  ← Voltar para Entrar com palavra-passe
                </button>
              </form>
            )}

            {/* ── VISTA 5: VERIFICAR CÓDIGO OTP ── */}
            {view === 'otp_verify' && (
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
                    className="w-full text-center text-2xl tracking-[0.5em] font-mono font-bold py-3 px-4 rounded-xl border-2 border-sacred-brand dark:border-sacred-neon bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otpToken.length < 6}
                  className="w-full btn-duo-primary dark:btn-duo-primary-dark text-xs py-3 font-bold disabled:opacity-50"
                >
                  {loading ? 'A validar...' : 'Confirmar e Entrar'}
                </button>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setView('otp_request')}
                    className="text-slate-500 hover:text-slate-700 dark:text-slate-400 font-bold"
                  >
                    ← Alterar e-mail
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={countdown > 0 || loading}
                    className={`font-bold ${
                      countdown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-sacred-brand dark:text-sacred-neon'
                    }`}
                  >
                    {countdown > 0 ? `Reenviar em ${countdown}s` : 'Reenviar código'}
                  </button>
                </div>
              </form>
            )}

            {/* ── VISTA 6: ESQUECI A PALAVRA-PASSE ── */}
            {view === 'forgot_password' && (
              <form onSubmit={handleForgotPassword} className="space-y-3.5 text-left">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    E-mail da conta
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@gmail.com"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white outline-none focus:border-sacred-brand"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full btn-duo-primary dark:btn-duo-primary-dark text-xs py-3 font-bold disabled:opacity-50"
                >
                  {loading ? 'A enviar...' : 'Enviar Link de Recuperação'}
                </button>
                <button
                  type="button"
                  onClick={() => switchTab('signin')}
                  className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  ← Voltar
                </button>
              </form>
            )}

            {view === 'forgot_sent' && (
              <div className="space-y-4 text-center">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Se existir uma conta para <strong>{email}</strong>, receberá um link seguro para definir uma nova palavra-passe.
                </p>
                <button
                  type="button"
                  onClick={() => switchTab('signin')}
                  className="w-full btn-duo-primary dark:btn-duo-primary-dark text-xs py-3 font-bold"
                >
                  Voltar a Entrar
                </button>
              </div>
            )}

            {/* ── VISTA 7: DEFINIR NOVA PALAVRA-PASSE (PASSWORD_RECOVERY) ── */}
            {view === 'update_password' && (
              <form onSubmit={handleUpdatePassword} className="space-y-3 text-left">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Nova palavra-passe
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white outline-none focus:border-sacred-brand"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Confirmar nova palavra-passe
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repetir palavra-passe"
                    required
                    minLength={6}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white outline-none focus:border-sacred-brand"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-duo-primary dark:btn-duo-primary-dark text-xs py-3 font-bold disabled:opacity-50"
                >
                  {loading ? 'A guardar...' : 'Guardar Nova Palavra-passe'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};
