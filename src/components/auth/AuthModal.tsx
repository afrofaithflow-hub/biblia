import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, icon?: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, showToast }) => {
  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithOAuth,
    resetPassword,
    isConfigured,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          setErrorMsg(error.message || 'Erro ao entrar. Verifique seus dados.');
        } else {
          showToast('Bem-vindo(a) de volta ao BiblIA!', 'check_circle');
          onClose();
        }
      } else if (mode === 'signup') {
        if (!displayName.trim()) {
          setErrorMsg('Por favor, informe seu nome.');
          setLoading(false);
          return;
        }
        const { error } = await signUpWithEmail(email, password, displayName);
        if (error) {
          setErrorMsg(error.message || 'Erro ao criar conta.');
        } else {
          showToast('Conta criada com sucesso! Graça e paz.', 'check_circle');
          onClose();
        }
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) {
          setErrorMsg(error.message || 'Erro ao enviar e-mail de recuperação.');
        } else {
          showToast('Instruções de recuperação enviadas para o seu e-mail.', 'mail');
          setMode('signin');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple' | 'facebook') => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const { error } = await signInWithOAuth(provider);
      if (error) {
        setErrorMsg(error.message || `Erro no login com ${provider}.`);
      } else {
        showToast(`Conectado via ${provider === 'google' ? 'Google' : 'Apple'}!`, 'check_circle');
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao conectar conta social.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-display">
      <div className="relative w-full max-w-sm bg-surface-light dark:bg-surface-dark rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-gray-800 transition-colors">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 size-8 rounded-full bg-gray-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors"
          title="Fechar"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {/* Brand Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center size-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-2">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              menu_book
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {mode === 'signin'
              ? 'Acessar o BiblIA'
              : mode === 'signup'
              ? 'Comece sua Jornada'
              : 'Recuperar Acesso'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {mode === 'signin'
              ? 'Entre para sincronizar suas leituras e conquistas'
              : mode === 'signup'
              ? 'Crie seu perfil e junte-se à comunidade'
              : 'Digite seu e-mail para redefinir sua senha'}
          </p>
          {!isConfigured && (
            <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-secondary border border-secondary/30">
              Modo Convidado / Sandbox Ativo
            </span>
          )}
        </div>

        {/* Tab Toggle (Sign in / Sign up) */}
        {mode !== 'forgot' && (
          <div className="flex bg-gray-100 dark:bg-slate-900 rounded-xl p-1 mb-4">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-surface-light dark:bg-surface-dark text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-surface-light dark:bg-surface-dark text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Criar Conta
            </button>
          </div>
        )}

        {/* OAuth Buttons */}
        {mode !== 'forgot' && (
          <div className="space-y-2 mb-4">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/60 shadow-sm transition-all"
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
            <button
              type="button"
              onClick={() => handleOAuth('apple')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-black text-white text-xs font-bold hover:bg-gray-900 shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[17px]">phone_iphone</span>
              <span>Continuar com Apple</span>
            </button>
            <button
              type="button"
              onClick={() => handleOAuth('facebook')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-blue-600/30 bg-[#1877F2] text-white text-xs font-bold hover:bg-[#166fe5] shadow-sm transition-all"
            >
              <svg className="size-4 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>Continuar com Facebook</span>
            </button>

            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ou</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
            <span className="leading-tight">{errorMsg}</span>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Nome de Exibição
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex: João da Silva"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary transition-all"
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@exemplo.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary transition-all"
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Senha
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMsg(null);
                    }}
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    Esqueceu?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Pelo menos 6 caracteres"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary transition-all"
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 rounded-xl bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-extrabold text-xs shadow-soft active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
            ) : mode === 'signin' ? (
              <>
                <span>Entrar no BiblIA</span>
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </>
            ) : mode === 'signup' ? (
              <>
                <span>Cadastrar Gratuitamente</span>
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </>
            ) : (
              <span>Enviar Link de Recuperação</span>
            )}
          </button>
        </form>

        {/* Back to sign in for forgot mode */}
        {mode === 'forgot' && (
          <div className="text-center mt-3">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
              }}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
              <span>Voltar ao Login</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
