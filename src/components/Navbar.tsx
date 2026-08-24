import React from 'react';
import {
  Home,
  Compass,
  Film,
  Send,
  Heart,
  PlusSquare,
  Crown,
  LogOut,
  User as UserIcon,
  Search,
  Sparkles,
  ExternalLink,
  Link as LinkIcon,
  Smartphone,
  ShieldCheck,
  MessageCircle
} from 'lucide-react';
import { ActiveTab, UserProfile } from '../types';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  openCreateModal: () => void;
  openAuthModal: () => void;
  openApkModal: () => void;
  currentUser: UserProfile | null;
  unreadDMsCount: number;
  unreadNotifsCount: number;
  onLogout: () => void;
  onSelectUserForProfile?: (userId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  openCreateModal,
  openAuthModal,
  openApkModal,
  currentUser,
  unreadDMsCount,
  unreadNotifsCount,
  onLogout,
}) => {
  return (
    <>
      {/* Desktop & Tablet Sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 lg:w-72 bg-zinc-950 border-r border-zinc-800/80 px-4 py-6 z-40 select-none">
        {/* Brand Logo */}
        <div
          onClick={() => setActiveTab('feed')}
          className="flex items-center gap-3 px-3 py-2 cursor-pointer group mb-4"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform duration-200">
            <Crown className="w-6 h-6 text-white drop-shadow" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-rose-300 to-purple-300 bg-clip-text text-transparent font-serif tracking-wide">
              Insta King
            </h1>
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest block -mt-1 font-semibold">
              Rede Social Oficial
            </span>
          </div>
        </div>

        {/* Official APK & Google Chrome Install Button in Sidebar */}
        <button
          id="btn-pwa-sidebar"
          onClick={openApkModal}
          className="mb-4 w-full p-2.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-amber-500/15 border border-emerald-400/40 hover:border-emerald-400/70 transition-all flex items-center gap-2.5 text-left group cursor-pointer shadow-sm"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-amber-500 flex items-center justify-center text-white shadow-md flex-shrink-0 group-hover:scale-110 transition-transform">
            <Smartphone className="w-4 h-4 text-zinc-950 font-bold" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-emerald-300 truncate">Instalar APK / Chrome</span>
              <ShieldCheck className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            </div>
            <span className="text-[10px] text-zinc-400 block truncate">0 Erro de Análise • 0 Erro 404</span>
          </div>
        </button>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto">
          <button
            id="nav-btn-home"
            onClick={() => setActiveTab('feed')}
            className={`w-full flex items-center gap-4 px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-150 ${
              activeTab === 'feed'
                ? 'bg-zinc-800 text-white font-semibold shadow-inner'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80'
            }`}
          >
            <Home className={`w-6 h-6 ${activeTab === 'feed' ? 'text-amber-400' : ''}`} />
            <span>Página Inicial</span>
          </button>

          <button
            id="nav-btn-explore"
            onClick={() => setActiveTab('explore')}
            className={`w-full flex items-center gap-4 px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-150 ${
              activeTab === 'explore'
                ? 'bg-zinc-800 text-white font-semibold shadow-inner'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80'
            }`}
          >
            <Compass className={`w-6 h-6 ${activeTab === 'explore' ? 'text-rose-400' : ''}`} />
            <span>Explorar & Pesquisa</span>
          </button>

          <button
            id="nav-btn-reels"
            onClick={() => setActiveTab('reels')}
            className={`w-full flex items-center gap-4 px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-150 ${
              activeTab === 'reels'
                ? 'bg-zinc-800 text-white font-semibold shadow-inner'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80'
            }`}
          >
            <Film className={`w-6 h-6 ${activeTab === 'reels' ? 'text-purple-400' : ''}`} />
            <span>Reels / Vídeos</span>
          </button>

          <button
            id="nav-btn-direct"
            onClick={() => {
              if (!currentUser) {
                openAuthModal();
              } else {
                setActiveTab('direct');
              }
            }}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-150 relative ${
              activeTab === 'direct'
                ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-400/40 text-amber-300 font-bold shadow-[0_0_15px_rgba(251,191,36,0.15)]'
                : 'text-zinc-400 hover:text-amber-300 hover:bg-zinc-900/80'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <Crown className={`w-6 h-6 ${activeTab === 'direct' ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'text-amber-400/70'}`} />
                {unreadDMsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 text-[10px] font-extrabold rounded-full h-4 min-w-4 px-1 flex items-center justify-center shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse">
                    {unreadDMsCount}
                  </span>
                )}
              </div>
              <span className="font-serif tracking-wide">King Messenger</span>
            </div>
            {unreadDMsCount > 0 && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold px-2 py-0.5 rounded-full">
                VIP
              </span>
            )}
          </button>

          <button
            id="nav-btn-notifs"
            onClick={() => {
              if (!currentUser) {
                openAuthModal();
              } else {
                setActiveTab('notifications');
              }
            }}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-150 ${
              activeTab === 'notifications'
                ? 'bg-zinc-800 text-white font-semibold shadow-inner'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <Heart className={`w-6 h-6 ${activeTab === 'notifications' ? 'text-rose-500 fill-rose-500' : ''}`} />
                {unreadNotifsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                    {unreadNotifsCount}
                  </span>
                )}
              </div>
              <span>Notificações</span>
            </div>
            {unreadNotifsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            )}
          </button>

          <button
            id="nav-btn-create"
            onClick={() => {
              if (!currentUser) {
                openAuthModal();
              } else {
                openCreateModal();
              }
            }}
            className="w-full flex items-center gap-4 px-3.5 py-3 rounded-xl font-medium text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80 transition-all duration-150"
          >
            <PlusSquare className="w-6 h-6 text-emerald-400" />
            <span>Criar Publicação</span>
          </button>

          <button
            id="nav-btn-profile"
            onClick={() => {
              if (!currentUser) {
                openAuthModal();
              } else {
                setActiveTab('profile');
              }
            }}
            className={`w-full flex items-center gap-4 px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-150 ${
              activeTab === 'profile'
                ? 'bg-zinc-800 text-white font-semibold shadow-inner'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80'
            }`}
          >
            {currentUser ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName}
                className={`w-6 h-6 rounded-full object-cover border-2 ${
                  activeTab === 'profile' ? 'border-amber-400' : 'border-zinc-700'
                }`}
              />
            ) : (
              <UserIcon className="w-6 h-6" />
            )}
            <span className="truncate">
              {currentUser ? currentUser.displayName : 'Perfil'}
            </span>
          </button>
        </nav>

        {/* User Footer / Login Area */}
        <div className="pt-4 border-t border-zinc-800/80">
          {currentUser ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <div
                onClick={() => setActiveTab('profile')}
                className="flex items-center gap-3 overflow-hidden cursor-pointer flex-1"
              >
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName}
                  className="w-9 h-9 rounded-full object-cover border border-amber-400/60 flex-shrink-0"
                />
                <div className="truncate">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-semibold text-zinc-200 truncate">
                      {currentUser.displayName}
                    </p>
                    <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />
                  </div>
                  <p className="text-[11px] text-zinc-500 truncate">@{currentUser.username}</p>
                </div>
              </div>
              <button
                id="btn-logout"
                onClick={onLogout}
                title="Sair da conta"
                className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              id="btn-nav-login"
              onClick={openAuthModal}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-semibold text-sm shadow-lg shadow-rose-950/40 transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Entrar / Criar Conta</span>
            </button>
          )}

          <div className="mt-3 text-center">
            <button
              onClick={() => window.open(window.location.href, '_blank')}
              className="text-[11px] text-zinc-400 hover:text-amber-400 inline-flex items-center gap-1 transition-colors"
              title="Abrir aplicativo em tela cheia / nova aba"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Abrir em Nova Aba</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header - Hidden in Messenger Direct to give full native chat screen */}
      {activeTab !== 'direct' && (
        <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 px-4 flex items-center justify-between z-40">
          <div
            onClick={() => setActiveTab('feed')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center shadow-md">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-amber-300 via-rose-300 to-purple-300 bg-clip-text text-transparent font-serif">
              Insta King
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile Chrome APK Install Button */}
            <button
              id="mobile-btn-pwa"
              onClick={openApkModal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-amber-500/20 border border-emerald-400/50 text-emerald-300 text-[11px] font-extrabold shadow-sm active:scale-95 transition-all"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Instalar APK</span>
            </button>

            <button
              id="mobile-btn-notifs"
              onClick={() => {
                if (!currentUser) openAuthModal();
                else setActiveTab('notifications');
              }}
              className="relative p-2 text-zinc-300 hover:text-white"
            >
              <Heart className="w-6 h-6" />
              {unreadNotifsCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-zinc-950"></span>
              )}
            </button>

            <button
              id="mobile-btn-direct"
              onClick={() => {
                if (!currentUser) openAuthModal();
                else setActiveTab('direct');
              }}
              className="relative p-2 text-amber-400 hover:text-amber-300"
              title="King Messenger"
            >
              <Crown className="w-6 h-6 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
              {unreadDMsCount > 0 && (
                <span className="absolute top-1 right-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 text-[9px] font-extrabold rounded-full h-4 min-w-4 px-1 flex items-center justify-center shadow-[0_0_6px_rgba(251,191,36,0.8)]">
                  {unreadDMsCount}
                </span>
              )}
            </button>
          </div>
        </header>
      )}

      {/* Mobile Bottom Navigation Bar - Hidden in Messenger Direct to prevent blocking input toolbar */}
      {activeTab !== 'direct' && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/80 px-2 flex items-center justify-around z-40">
          <button
            id="mobile-nav-home"
            onClick={() => setActiveTab('feed')}
            className={`p-2.5 rounded-xl transition-colors ${
              activeTab === 'feed' ? 'text-amber-400' : 'text-zinc-400'
            }`}
          >
            <Home className="w-6 h-6" />
          </button>

          <button
            id="mobile-nav-explore"
            onClick={() => setActiveTab('explore')}
            className={`p-2.5 rounded-xl transition-colors ${
              activeTab === 'explore' ? 'text-rose-400' : 'text-zinc-400'
            }`}
          >
            <Compass className="w-6 h-6" />
          </button>

          <button
            id="mobile-nav-create"
            onClick={() => {
              if (!currentUser) openAuthModal();
              else openCreateModal();
            }}
            className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white shadow-lg active:scale-90 transition-transform"
          >
            <PlusSquare className="w-6 h-6" />
          </button>

          <button
            id="mobile-nav-reels"
            onClick={() => setActiveTab('reels')}
            className={`p-2.5 rounded-xl transition-colors ${
              activeTab === 'reels' ? 'text-purple-400' : 'text-zinc-400'
            }`}
          >
            <Film className="w-6 h-6" />
          </button>

          <button
            id="mobile-nav-profile"
            onClick={() => {
              if (!currentUser) openAuthModal();
              else setActiveTab('profile');
            }}
            className={`p-2 rounded-full transition-all ${
              activeTab === 'profile' ? 'ring-2 ring-amber-400 scale-105' : 'opacity-80'
            }`}
          >
            {currentUser ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName}
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : (
              <UserIcon className="w-6 h-6 text-zinc-400" />
            )}
          </button>
        </nav>
      )}
    </>
  );
};
