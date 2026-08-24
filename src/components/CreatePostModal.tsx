import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Camera,
  Image as ImageIcon,
  Film,
  Sparkles,
  Smile,
  Hash,
  Crown,
  Loader2,
  Check,
  AlertCircle
} from 'lucide-react';
import { UserProfile } from '../types';
import { createPost, createStory } from '../lib/firebase';
import { INITIAL_PRESET_MEDIA } from '../data/seedData';
import { compressImage, processVideoFile } from '../utils/mediaUtils';
import confetti from 'canvas-confetti';

interface CreatePostModalProps {
  currentUser: UserProfile;
  onClose: () => void;
  onPostCreated: () => void;
}

const FILTERS = [
  { name: 'Normal', class: 'filter-none' },
  { name: 'Clarendon', class: 'contrast-125 saturate-125' },
  { name: 'Juno', class: 'contrast-110 saturate-150 hue-rotate-15' },
  { name: 'Ludwig', class: 'brightness-105 contrast-105 saturate-110' },
  { name: 'Valencia', class: 'sepia-[0.25] contrast-110 brightness-105' },
  { name: 'Moon', class: 'grayscale contrast-110' },
  { name: 'Lark', class: 'brightness-110 saturate-125' },
  { name: 'Royal', class: 'contrast-125 hue-rotate-[-10deg] saturate-130' },
];

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  currentUser,
  onClose,
  onPostCreated,
}) => {
  const [postType, setPostType] = useState<'feed' | 'story'>('feed');
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '16:9'>('1:1');
  const [selectedFilter, setSelectedFilter] = useState(FILTERS[0]);
  const [loading, setLoading] = useState(false);
  const [processingMedia, setProcessingMedia] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoCamRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // File upload handler with compression to prevent browser OOM
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setProcessingMedia(true);

    try {
      const isVideo = file.type.startsWith('video/');
      if (isVideo) {
        setMediaType('video');
        const processed = await processVideoFile(file);
        setMediaUrl(processed.url);
      } else {
        setMediaType('photo');
        // Compress high-res mobile photos to prevent Chrome crashes and Firestore payload limits
        const compressed = await compressImage(file, 1080, 1080, 0.78);
        setMediaUrl(compressed);
      }
    } catch (err) {
      console.error('Error processing media:', err);
      setUploadError('Erro ao carregar o arquivo. Tente selecionar outra foto ou vídeo menor.');
    } finally {
      setProcessingMedia(false);
      // Reset input value so same file can be chosen again if needed
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  // Camera take picture handler
  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoCamRef.current) {
        videoCamRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      alert('Não foi possível acessar a câmera do dispositivo.');
      setCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (!videoCamRef.current) return;
    const canvas = document.createElement('canvas');
    const width = videoCamRef.current.videoWidth || 640;
    const height = videoCamRef.current.videoHeight || 480;
    
    // Scale down if camera resolution is huge
    const maxDim = 1080;
    let targetW = width;
    let targetH = height;
    if (targetW > maxDim || targetH > maxDim) {
      if (targetW > targetH) {
        targetH = Math.round((targetH * maxDim) / targetW);
        targetW = maxDim;
      } else {
        targetW = Math.round((targetW * maxDim) / targetH);
        targetH = maxDim;
      }
    }

    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoCamRef.current, 0, 0, targetW, targetH);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.80);
      setMediaUrl(dataUrl);
      setMediaType('photo');
    }
    stopCamera();
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleSelectPreset = (preset: (typeof INITIAL_PRESET_MEDIA)[0]) => {
    setMediaUrl(preset.url);
    setMediaType(preset.type);
    setAspectRatio(preset.aspectRatio);
    if (!caption) {
      setCaption(preset.caption);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaUrl) return;

    setLoading(true);
    try {
      if (postType === 'story') {
        await createStory(currentUser, mediaUrl, mediaType, caption);
      } else {
        await createPost({
          authorId: currentUser.id,
          authorName: currentUser.displayName,
          authorUsername: currentUser.username,
          authorPhotoURL: currentUser.photoURL,
          mediaUrl,
          mediaType,
          caption: caption.trim(),
          aspectRatio,
        });
      }

      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
      });

      onPostCreated();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao publicar. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-2 sm:p-4 backdrop-blur-md">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-sm sm:text-base text-zinc-100 font-serif">
              {postType === 'story' ? 'Novo Story 24h' : 'Criar Nova Publicação'}
            </h2>
          </div>
          <button
            id="btn-close-create-modal"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Post Type Selector (Feed or Story) */}
        <div className="flex border-b border-zinc-800 bg-zinc-950 px-4 py-2 gap-2">
          <button
            type="button"
            onClick={() => setPostType('feed')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              postType === 'feed'
                ? 'bg-zinc-800 text-amber-400 border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            📱 Publicar no Feed / Perfil
          </button>
          <button
            type="button"
            onClick={() => setPostType('story')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              postType === 'story'
                ? 'bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ✨ Publicar no Story (24h)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Media Preview / Selection Area */}
          {!mediaUrl && !cameraActive && (
            <div className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center justify-center bg-zinc-900/30">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4 text-amber-400 shadow-inner">
                <ImageIcon className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1">
                Arraste ou escolha fotos e vídeos do seu dispositivo
              </h3>
              <p className="text-xs text-zinc-500 mb-5 max-w-sm">
                Suporta fotos (JPG, PNG, GIF) e vídeos (MP4, WebM) em alta qualidade.
              </p>

              {uploadError && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {processingMedia ? (
                <div className="py-8 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                  <p className="text-xs font-semibold text-zinc-300">
                    Otimizando imagem para alta performance no celular...
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white text-xs font-bold shadow-md shadow-rose-950/40 active:scale-95 transition-transform"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Selecionar do Celular / Computador</span>
                  </button>

                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 active:scale-95 transition-transform"
                  >
                    <Camera className="w-4 h-4 text-rose-400" />
                    <span>Usar Câmera</span>
                  </button>
                </div>
              )}

              {/* Quick Presets Gallery */}
              <div className="w-full mt-6 pt-4 border-t border-zinc-800/80">
                <p className="text-xs font-semibold text-zinc-400 mb-3 flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ou escolha uma mídia em destaque pronta para postar:</span>
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {INITIAL_PRESET_MEDIA.map((preset, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectPreset(preset)}
                      className="relative group aspect-square rounded-xl overflow-hidden cursor-pointer border border-zinc-800 hover:border-amber-400 transition-all hover:scale-105"
                    >
                      {preset.type === 'video' ? (
                        <div className="w-full h-full bg-gradient-to-tr from-amber-950/40 to-purple-950/40 flex flex-col items-center justify-center text-zinc-400 relative p-2">
                          <Film className="w-6 h-6 text-amber-400 mb-1" />
                          <span className="text-[9px] text-zinc-300 font-semibold truncate max-w-full">Reel Vídeo</span>
                        </div>
                      ) : (
                        <img
                          src={preset.url}
                          alt={preset.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold transition-opacity p-1 text-center">
                        {preset.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Camera View */}
          {cameraActive && (
            <div className="relative rounded-2xl overflow-hidden bg-black flex flex-col items-center justify-center aspect-video border border-zinc-800">
              <video
                ref={videoCamRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 flex items-center gap-4">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-600 text-white font-bold text-xs shadow-lg flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capturar Foto</span>
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-2.5 rounded-full bg-zinc-800 text-zinc-300 font-semibold text-xs border border-zinc-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Selected Media Preview & Adjustments */}
          {mediaUrl && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black flex items-center justify-center max-h-[360px] border border-zinc-800">
                {mediaType === 'video' ? (
                  <video
                    src={mediaUrl}
                    controls
                    className="w-full max-h-[360px] object-contain"
                  />
                ) : (
                  <img
                    src={mediaUrl}
                    alt="Preview"
                    className={`w-full max-h-[360px] object-contain ${selectedFilter.class}`}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setMediaUrl('')}
                  className="absolute top-3 right-3 p-1.5 bg-black/70 hover:bg-rose-600 rounded-full text-white transition-colors"
                  title="Trocar mídia"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Filters (for photos) */}
              {mediaType === 'photo' && (
                <div>
                  <label className="text-xs font-semibold text-zinc-400 mb-2 block">
                    Filtros de Imagem:
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {FILTERS.map((f) => (
                      <button
                        key={f.name}
                        type="button"
                        onClick={() => setSelectedFilter(f)}
                        className={`flex flex-col items-center gap-1 p-1.5 rounded-xl border text-[11px] font-medium min-w-[70px] transition-all ${
                          selectedFilter.name === f.name
                            ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div
                          className={`w-12 h-12 rounded-lg bg-zinc-800 overflow-hidden ${f.class}`}
                        >
                          <img
                            src={mediaUrl}
                            alt={f.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span>{f.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Aspect Ratio Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 font-semibold">Proporção:</span>
                {(['1:1', '4:5', '16:9'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                      aspectRatio === ratio
                        ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                        : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {ratio === '1:1' ? 'Quadrado (1:1)' : ratio === '4:5' ? 'Retrato (4:5)' : 'Paisagem (16:9)'}
                  </button>
                ))}
              </div>

              {/* Caption & Hashtags */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 mb-1 block">
                  Legenda & Hashtags:
                </label>
                <textarea
                  id="textarea-post-caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Escreva uma legenda envolvente, marque amigos @ e adicione hashtags #..."
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
                  maxLength={2200}
                />
                {/* Quick hashtag suggestions */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['#instaking', '#brasil', '#reels', '#lifestyle', '#foto', '#king'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setCaption((prev) => `${prev} ${tag}`.trim())}
                      className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 hover:text-amber-300 hover:border-amber-400/40"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2 border-t border-zinc-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900"
            >
              Cancelar
            </button>
            <button
              id="btn-publish-post"
              type="submit"
              disabled={!mediaUrl || loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:scale-[1.02] active:scale-[0.98] text-white text-xs font-bold shadow-lg shadow-rose-950/40 disabled:opacity-40 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publicando...</span>
                </>
              ) : (
                <>
                  <Crown className="w-4 h-4" />
                  <span>{postType === 'story' ? 'Publicar Story' : 'Compartilhar Publicação'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
