import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export interface SpiritualAvatar {
  id: string;
  name: string;
  symbol: string;
  verse: string;
  bgGradient: string;
  textColor: string;
  url: string;
}

export const SPIRITUAL_AVATARS: SpiritualAvatar[] = [
  {
    id: 'lion-of-judah',
    name: 'Leão de Judá',
    symbol: 'pets',
    verse: 'Apocalipse 5:5',
    bgGradient: 'from-amber-600 to-yellow-500',
    textColor: 'text-amber-100',
    url: 'avatar:lion-of-judah',
  },
  {
    id: 'dove-of-peace',
    name: 'Pomba da Paz',
    symbol: 'flutter',
    verse: 'Mateus 3:16',
    bgGradient: 'from-teal-600 to-cyan-500',
    textColor: 'text-teal-100',
    url: 'avatar:dove-of-peace',
  },
  {
    id: 'scripture-scroll',
    name: 'A Palavra',
    symbol: 'menu_book',
    verse: 'Salmos 119:105',
    bgGradient: 'from-emerald-700 to-emerald-500',
    textColor: 'text-emerald-100',
    url: 'avatar:scripture-scroll',
  },
  {
    id: 'lamp-and-light',
    name: 'Lâmpada & Farol',
    symbol: 'wb_incandescent',
    verse: 'Provérbios 6:23',
    bgGradient: 'from-yellow-600 to-amber-400',
    textColor: 'text-yellow-100',
    url: 'avatar:lamp-and-light',
  },
  {
    id: 'olive-branch',
    name: 'Oliveira Verde',
    symbol: 'eco',
    verse: 'Salmos 52:8',
    bgGradient: 'from-lime-700 to-emerald-600',
    textColor: 'text-lime-100',
    url: 'avatar:olive-branch',
  },
  {
    id: 'crown-of-life',
    name: 'Coroa da Vida',
    symbol: 'crown',
    verse: 'Tiago 1:12',
    bgGradient: 'from-purple-800 to-amber-500',
    textColor: 'text-purple-100',
    url: 'avatar:crown-of-life',
  },
  {
    id: 'boat-of-faith',
    name: 'Barco da Fé',
    symbol: 'sailing',
    verse: 'Marcos 4:39',
    bgGradient: 'from-sky-700 to-blue-500',
    textColor: 'text-sky-100',
    url: 'avatar:boat-of-faith',
  },
  {
    id: 'holy-mountain',
    name: 'Monte Santo',
    symbol: 'landscape',
    verse: 'Salmos 121:1',
    bgGradient: 'from-slate-800 to-slate-600',
    textColor: 'text-slate-200',
    url: 'avatar:holy-mountain',
  },
];

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string;
  displayName: string;
  onAvatarSaved: (newUrl: string) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  isOpen,
  onClose,
  currentAvatarUrl,
  displayName,
  onAvatarSaved,
  showToast,
}) => {
  const { user, updateAvatarUrl } = useAuth();

  // Foto do email / Google OAuth
  const googlePhotoUrl =
    user?.user_metadata?.picture ||
    user?.user_metadata?.avatar_url ||
    (user?.email ? `https://www.gravatar.com/avatar/${encodeURIComponent(user.email.toLowerCase().trim())}?d=mp` : '');

  const [selectedUrl, setSelectedUrl] = useState<string>(currentAvatarUrl || googlePhotoUrl || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await updateAvatarUrl(selectedUrl);
      if (res.error) {
        showToast(res.error.message, 'error');
      } else {
        onAvatarSaved(selectedUrl);
        showToast('Foto de perfil atualizada com sucesso!', 'check_circle');
        onClose();
      }
    } catch {
      showToast('Não foi possível guardar o avatar agora.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl transition-all dark:border-white/10 dark:bg-[#12121c]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sacred-brand dark:text-sacred-neon">account_circle</span>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Escolher Foto & Avatar</h3>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 space-y-5 overflow-y-auto py-4 pr-1">
          {/* SECÇÃO 1: Foto do Google / Email (Opção Principal) */}
          {googlePhotoUrl && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Foto da Conta Google</p>
              <div
                onClick={() => setSelectedUrl(googlePhotoUrl)}
                className={`flex cursor-pointer items-center gap-3.5 rounded-2xl border p-3 transition ${
                  selectedUrl === googlePhotoUrl
                    ? 'border-sacred-brand bg-sacred-light/30 shadow-sm dark:border-sacred-neon dark:bg-sacred-deep/30'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5'
                }`}
              >
                <img
                  src={googlePhotoUrl}
                  alt={displayName}
                  className="size-14 rounded-full border-2 border-white object-cover shadow-sm dark:border-white/20"
                  onError={(e) => {
                    // Fallback se a imagem do Google expirar
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Foto Original da Conta</p>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      Recomendada
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Sincronizada automaticamente com o seu email de login.
                  </p>
                </div>
                <div
                  className={`flex size-6 items-center justify-center rounded-full border ${
                    selectedUrl === googlePhotoUrl
                      ? 'border-sacred-brand bg-sacred-brand text-white dark:border-sacred-neon dark:bg-sacred-neon dark:text-slate-950'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {selectedUrl === googlePhotoUrl && (
                    <span className="material-symbols-outlined text-sm font-bold">check</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECÇÃO 2: Galeria Bíblica Canónica */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Avatares Bíblicos</p>
            <div className="grid grid-cols-4 gap-2.5">
              {SPIRITUAL_AVATARS.map((avatar) => {
                const isSelected = selectedUrl === avatar.url;
                return (
                  <button
                    key={avatar.id}
                    onClick={() => setSelectedUrl(avatar.url)}
                    className={`group relative flex flex-col items-center rounded-2xl border p-2 transition ${
                      isSelected
                        ? 'border-sacred-brand bg-sacred-light/40 shadow-md ring-2 ring-sacred-brand/40 dark:border-sacred-neon dark:bg-sacred-deep/40 dark:ring-sacred-neon/30'
                        : 'border-slate-200 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20'
                    }`}
                    title={`${avatar.name} (${avatar.verse})`}
                  >
                    <div
                      className={`flex size-12 items-center justify-center rounded-full bg-gradient-to-br shadow-sm ${avatar.bgGradient} ${avatar.textColor}`}
                    >
                      <span className="material-symbols-outlined text-2xl">{avatar.symbol}</span>
                    </div>
                    <span className="mt-1.5 block max-w-full truncate text-[10px] font-bold leading-tight text-slate-800 dark:text-slate-200">
                      {avatar.name}
                    </span>
                    <span className="text-[9px] text-slate-400">{avatar.verse.split(' ')[0]}</span>
                    {isSelected && (
                      <div className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-sacred-brand text-[10px] text-white dark:bg-sacred-neon dark:text-slate-950">
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECÇÃO 3: Iniciais Clássicas */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Inicial do Nome</p>
            <div
              onClick={() => setSelectedUrl('')}
              className={`flex cursor-pointer items-center gap-3.5 rounded-2xl border p-3 transition ${
                !selectedUrl || selectedUrl === ''
                  ? 'border-sacred-brand bg-sacred-light/30 shadow-sm dark:border-sacred-neon dark:bg-sacred-deep/30'
                  : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex size-14 items-center justify-center rounded-full border-2 border-gold-radiant/40 bg-sacred-brand/15 text-xl font-black text-sacred-brand shadow-sm dark:bg-slate-800 dark:text-sacred-neon">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Estilo Clássico com Inicial</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Mostra a primeira letra do seu nome com moldura dourada.
                </p>
              </div>
              <div
                className={`flex size-6 items-center justify-center rounded-full border ${
                  !selectedUrl || selectedUrl === ''
                    ? 'border-sacred-brand bg-sacred-brand text-white dark:border-sacred-neon dark:bg-sacred-neon dark:text-slate-950'
                    : 'border-slate-300 dark:border-slate-600'
                }`}
              >
                {(!selectedUrl || selectedUrl === '') && (
                  <span className="material-symbols-outlined text-sm font-bold">check</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-white/10">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-xl bg-sacred-brand px-5 py-2 text-xs font-bold text-white shadow-md transition hover:brightness-110 disabled:opacity-50 dark:bg-sacred-neon dark:text-slate-950"
          >
            {isSaving ? (
              <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-sm">check</span>
            )}
            Guardar Avatar
          </button>
        </div>
      </div>
    </div>
  );
};
