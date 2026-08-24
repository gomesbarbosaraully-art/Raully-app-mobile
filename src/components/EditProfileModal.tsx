import React, { useState, useRef } from 'react';
import { X, Upload, Camera, Sparkles, Crown, Loader2, Check } from 'lucide-react';
import { UserProfile } from '../types';
import { compressAvatar } from '../utils/mediaUtils';

interface EditProfileModalProps {
  userProfile: UserProfile;
  onClose: () => void;
  onSave: (updates: Partial<UserProfile>) => Promise<void>;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=250&q=80',
  'https://api.dicebear.com/7.x/bottts/svg?seed=king',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=royal',
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  userProfile,
  onClose,
  onSave,
}) => {
  const [displayName, setDisplayName] = useState(userProfile.displayName || '');
  const [username, setUsername] = useState(userProfile.username || '');
  const [bio, setBio] = useState(userProfile.bio || '');
  const [website, setWebsite] = useState(userProfile.website || '');
  const [photoURL, setPhotoURL] = useState(userProfile.photoURL || '');
  const [saving, setSaving] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const compressed = await compressAvatar(file);
      setPhotoURL(compressed);
    } catch (err) {
      console.error('Error compressing avatar:', err);
      alert('Erro ao carregar a foto do perfil.');
    } finally {
      setUploadingAvatar(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !username.trim()) return;

    setSaving(true);
    try {
      await onSave({
        displayName: displayName.trim(),
        username: username.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        bio: bio.trim(),
        website: website.trim(),
        photoURL,
      });
      onClose();
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('Erro ao atualizar perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-zinc-100 font-serif">Editar Perfil</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Avatar Edit Section */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
            <div className="relative">
              <img
                src={photoURL}
                alt={displayName}
                className="w-20 h-20 rounded-full object-cover border-2 border-amber-400 shadow-md"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-1.5 bg-gradient-to-tr from-amber-500 to-rose-600 text-white rounded-full border-2 border-zinc-950 hover:scale-110 transition-transform shadow-md"
                title="Carregar foto do dispositivo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h4 className="font-bold text-xs text-zinc-200 mb-1">Foto do Perfil</h4>
              <p className="text-[11px] text-zinc-400 mb-2">
                Envie uma foto nova ou escolha um avatar abaixo.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-semibold rounded-lg border border-zinc-700 transition-colors"
              >
                Alterar Foto
              </button>
            </div>
          </div>

          {/* Quick Avatar Presets */}
          <div>
            <label className="text-xs font-semibold text-zinc-400 mb-2 block flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Avatares Rápidos:</span>
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {AVATAR_PRESETS.map((preset, idx) => (
                <img
                  key={idx}
                  src={preset}
                  alt="Avatar preset"
                  onClick={() => setPhotoURL(preset)}
                  className={`w-11 h-11 rounded-full object-cover cursor-pointer border-2 transition-all hover:scale-110 flex-shrink-0 ${
                    photoURL === preset ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-zinc-800'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Display Name Input */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 mb-1 block">
              Nome Completo:
            </label>
            <input
              id="input-edit-displayname"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Seu Nome"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
              maxLength={60}
              required
            />
          </div>

          {/* Username Input */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 mb-1 block">
              Nome de Usuário (@username):
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2 text-xs text-zinc-500 font-bold">@</span>
              <input
                id="input-edit-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="seu_usuario"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                maxLength={30}
                required
              />
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              Apenas letras minúsculas, números e sublinhados.
            </p>
          </div>

          {/* Bio Input */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 mb-1 block">
              Biografia:
            </label>
            <textarea
              id="textarea-edit-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Fale um pouco sobre você, seus interesses e hobbies..."
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
              maxLength={300}
            />
            <span className="text-[10px] text-zinc-500 block text-right">
              {bio.length}/300
            </span>
          </div>

          {/* Website Link */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 mb-1 block">
              Site / Link Externo:
            </label>
            <input
              id="input-edit-website"
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://meusite.com"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
              maxLength={150}
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-zinc-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              id="btn-save-profile"
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-950/40 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
