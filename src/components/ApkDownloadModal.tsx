import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  ShieldCheck,
  Crown,
  ExternalLink,
  Globe,
  Copy,
  Check,
  Sparkles,
  Download,
  CheckCircle2,
  Share2
} from 'lucide-react';

interface ApkDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkDownloadModal: React.FC<ApkDownloadModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadedPackage, setDownloadedPackage] = useState(false);

  const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  // Trigger Google Chrome's native WebAPK installation
  const handleInstallClick = async () => {
    if (isInsideIframe) {
      // Chrome blocks installation inside iframe, open in full browser tab for instant install
      window.open(window.location.href, '_blank');
      return;
    }

    if (deferredPrompt) {
      setInstalling(true);
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.warn('Install prompt error:', err);
      } finally {
        setInstalling(false);
      }
    } else {
      // Fallback: Open in new window or prompt Chrome menu
      window.open(window.location.href, '_blank');
    }
  };

  // Direct APK / WebAPK manifest file generator for Android
  const handleDownloadApkPackage = () => {
    const manifestData = {
      name: "Insta King Oficial",
      short_name: "InstaKing",
      start_url: window.location.origin,
      display: "standalone",
      background_color: "#000000",
      theme_color: "#f59e0b",
      description: "Aplicativo Oficial Insta King para Android",
      icons: [
        {
          src: "/icon-192.png",
          sizes: "192x192",
          type: "image/png"
        },
        {
          src: "/icon-512.png",
          sizes: "512x512",
          type: "image/png"
        }
      ]
    };

    const blob = new Blob([JSON.stringify(manifestData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'InstaKing-Oficial.webmanifest';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadedPackage(true);
    setTimeout(() => setDownloadedPackage(false), 3000);
  };

  const handleOpenInChrome = () => {
    window.open(window.location.href, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative p-6 pb-4 text-center bg-gradient-to-b from-amber-500/15 via-zinc-950 to-zinc-950 border-b border-zinc-800/80">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center mx-auto mb-3 shadow-xl shadow-rose-950/40">
            <Crown className="w-9 h-9 text-white drop-shadow" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Instalação Oficial Verificada (Google Chrome & Android)</span>
          </div>

          <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-rose-300 to-purple-300 bg-clip-text text-transparent font-serif">
            Instalar Insta King no Celular
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            Instale o app oficial completo direto pelo Google Chrome sem erro de pacote e sem ocupar memória.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Main Action Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-900 border border-amber-500/40 flex flex-col gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <span>Instalação Automática no Android</span>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full font-semibold">
                    100% Funcional
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Adiciona o aplicativo oficial com ícone na sua tela inicial e suporte total a notificações.
                </p>
              </div>
            </div>

            <button
              id="btn-install-apk-native"
              onClick={handleInstallClick}
              disabled={installing}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-600 hover:to-rose-700 text-white text-xs sm:text-sm font-bold shadow-xl shadow-rose-950/40 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Download className="w-4 h-4" />
              <span>
                {isInstalled
                  ? 'Aplicativo Já Instalado no seu Celular'
                  : installing
                  ? 'Instalando...'
                  : 'Toque Aqui Para Instalar Agora'}
              </span>
            </button>
          </div>

          {/* Chrome Step-by-Step Tutorial (Visual Guide) */}
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
            <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-400" />
              <span>Como instalar direto pelo menu do seu Google Chrome:</span>
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                  1
                </div>
                <div className="flex-1">
                  <p className="text-zinc-200 text-xs font-medium">
                    Toque no botão <strong className="text-amber-300">"Abrir em Nova Aba"</strong> abaixo para abrir o app no Chrome nativo.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                  2
                </div>
                <div className="flex-1">
                  <p className="text-zinc-200 text-xs font-medium">
                    No Chrome, toque nos <strong className="text-rose-400">3 pontinhos (⋮)</strong> no topo e escolha <strong className="text-emerald-400">"Instalar aplicativo"</strong> ou <strong className="text-emerald-400">"Adicionar à tela inicial"</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                  3
                </div>
                <div className="flex-1">
                  <p className="text-zinc-200 text-xs font-medium">
                    Pronto! O ícone dourado do <strong className="text-purple-300">Insta King</strong> aparecerá no seu celular abrindo como aplicativo real!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={handleOpenInChrome}
              className="py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-amber-400" />
              <span>Abrir no Google Chrome</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Link Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-amber-400" />
                  <span>Copiar Link do App</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
