import React, { useState } from 'react';
import {
  Crown,
  Sparkles,
  X,
  User,
  Check,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  AlertCircle,
  HelpCircle,
  Chrome
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { INITIAL_DEMO_USERS } from '../data/seedData';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { loginWithGoogle, loginWithCustomAccount } = useAuth();
  const [tab, setTab] = useState<'google' | 'custom' | 'switch'>('google');
  const [customUsername, setCustomUsername] = useState('');
  const [customDisplayName, setCustomDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isPopupBlocked, setIsPopupBlocked] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    setIsPopupBlocked(false);
    try {
      const success = await loginWithGoogle();
      if (success) {
        onClose();
      }
    } catch (err: any) {
      const code = err?.code || '';
      const message = err?.message || '';

      if (code.includes('popup-blocked') || message.includes('popup-blocked')) {
        setIsPopupBlocked(true);
        setErrorMsg(
          'O Google Chrome bloqueou a janela pop-up de login. Você pode permitir pop-ups na barra do navegador, abrir o app em Nova Aba, ou entrar criando seu @perfil abaixo!'
        );
      } else {
        setErrorMsg(
          'Não foi possível autenticar com o Google. Você pode entrar criando seu @perfil personalizado abaixo!'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUsername.trim() || !customDisplayName.trim()) return;

    setLoading(true);
    setErrorMsg('');
    try {
      await loginWithCustomAccount(customUsername.trim(), customDisplayName.trim());
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro ao criar conta personalizada.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToDemoUser = async (demoUser: (typeof INITIAL_DEMO_USERS)[0]) => {
    setLoading(true);
    try {
      await loginWithCustomAccount(demoUser.username, demoUser.displayName, demoUser.photoURL);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header with Crown Brand */}
        <div className="relative p-6 pb-4 text-center bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950 border-b border-zinc-800/80">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center mx-auto mb-3 shadow-xl shadow-rose-950/40">
            <Crown className="w-8 h-8 text-white drop-shadow" />
          </div>

          <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-rose-300 to-purple-300 bg-clip-text text-transparent font-serif">
            Insta King
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Rede Social 100% Oficial & Pública • Fotos, Vídeos & Direct no PV
          </p>

          <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-emerald-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Autenticação Real & Segura</span>
          </div>
        </div>

        {/* Auth Mode Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/40 p-1.5 gap-1.5 mx-4 mt-3 rounded-2xl">
          <button
            onClick={() => setTab('google')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              tab === 'google'
                ? 'bg-zinc-800 text-amber-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Google
          </button>
          <button
            onClick={() => setTab('custom')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              tab === 'custom'
                ? 'bg-zinc-800 text-rose-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Criar @Perfil
          </button>
          <button
            onClick={() => setTab('switch')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              tab === 'switch'
                ? 'bg-zinc-800 text-purple-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Alternar Conta
          </button>
        </div>

        {/* Error / Chrome Info message */}
        {errorMsg && (
          <div className="mx-6 mt-3 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>

            {isPopupBlocked && (
              <div className="pt-2 border-t border-rose-500/20 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={openInNewTab}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-amber-300 font-bold rounded-xl border border-zinc-700 text-xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir em Nova Aba do Chrome</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTab('custom')}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-r from-amber-500 to-rose-600 text-white font-bold rounded-xl text-xs"
                >
                  <span>Entrar com @Perfil Personalizado</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Google One-Click */}
        {tab === 'google' && (
          <div className="p-6 space-y-4">
            <p className="text-xs text-zinc-400 text-center leading-relaxed">
              Conecte com sua conta Google oficial para interagir, postar fotos, vídeos e conversar no Direct com seus amigos.
            </p>

            <button
              id="btn-login-google-popup"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-xs shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.17 0 9.99 0 12s.46 3.83 1.26 5.42l4.02-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{loading ? 'Conectando...' : 'Continuar com o Google'}</span>
            </button>

            {/* Google Chrome Helper Box */}
            <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-zinc-400">
                <Chrome className="w-4 h-4 text-amber-400" />
                <span className="text-[11px]">No Chrome em iframe?</span>
              </div>
              <button
                type="button"
                onClick={openInNewTab}
                className="text-amber-400 hover:text-amber-300 font-semibold text-[11px] flex items-center gap-1"
              >
                <span>Abrir em Nova Aba</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Custom Profile Handle */}
        {tab === 'custom' && (
          <form onSubmit={handleCustomLogin} className="p-6 space-y-4">
            <p className="text-xs text-zinc-400 text-center leading-relaxed">
              Crie seu @perfil oficial no Insta King instantaneamente para começar a usar:
            </p>

            <div>
              <label className="text-xs font-semibold text-zinc-300 mb-1 block">
                Seu Nome de Exibição:
              </label>
              <input
                type="text"
                value={customDisplayName}
                onChange={(e) => setCustomDisplayName(e.target.value)}
                placeholder="Ex: Raul Silva"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 mb-1 block">
                Nome de Usuário (@username):
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs text-zinc-500 font-bold">@</span>
                <input
                  type="text"
                  value={customUsername}
                  onChange={(e) => setCustomUsername(e.target.value)}
                  placeholder="raul_king"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
            </div>

            <button
              id="btn-create-custom-account"
              type="submit"
              disabled={loading || !customUsername.trim() || !customDisplayName.trim()}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-950/40 transition-all disabled:opacity-40"
            >
              {loading ? 'Criando Perfil...' : 'Criar Perfil & Entrar no Insta King'}
            </button>
          </form>
        )}

        {/* Tab 3: Switch between existing test users */}
        {tab === 'switch' && (
          <div className="p-6 space-y-3">
            <p className="text-xs text-zinc-400 text-center mb-2">
              Escolha uma conta para testar o envio de mensagens no PV entre perfis diferentes:
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {INITIAL_DEMO_USERS.map((demo) => (
                <div
                  key={demo.id}
                  onClick={() => handleSwitchToDemoUser(demo)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/70 hover:bg-zinc-800 border border-zinc-800/80 cursor-pointer transition-all hover:scale-[1.01]"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={demo.photoURL}
                      alt={demo.displayName}
                      className="w-10 h-10 rounded-full object-cover border border-amber-400"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-zinc-100">{demo.displayName}</h4>
                      <p className="text-[10px] text-zinc-400">@{demo.username}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                    Entrar <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
