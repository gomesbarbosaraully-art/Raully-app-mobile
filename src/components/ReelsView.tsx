import React, { useState, useRef, useEffect } from 'react';
import {
  Heart,
  MessageCircle,
  Send,
  Volume2,
  VolumeX,
  Play,
  Crown,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Film
} from 'lucide-react';
import { Post, UserProfile } from '../types';
import { toggleLikePost, checkIfUserLiked } from '../lib/firebase';
import confetti from 'canvas-confetti';

interface ReelsViewProps {
  reels: Post[];
  currentUser: UserProfile | null;
  openAuthModal: () => void;
  onOpenComments: (post: Post) => void;
  onSelectUser: (userId: string) => void;
  onShareToDirect?: (post: Post) => void;
}

export const ReelsView: React.FC<ReelsViewProps> = ({
  reels,
  currentUser,
  openAuthModal,
  onOpenComments,
  onSelectUser,
  onShareToDirect,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoError, setVideoError] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Filter ONLY valid video posts
  const videoReels = reels.filter(
    (r) =>
      r.mediaType === 'video' &&
      r.mediaUrl &&
      !r.mediaUrl.includes('unsplash.com') &&
      (r.mediaUrl.startsWith('data:video') ||
        r.mediaUrl.startsWith('blob:') ||
        r.mediaUrl.endsWith('.mp4') ||
        r.mediaUrl.endsWith('.webm') ||
        r.mediaUrl.includes('googleapis.com') ||
        r.mediaUrl.includes('sample'))
  );

  const currentReel = videoReels[currentIndex] || null;

  useEffect(() => {
    setVideoError(false);
    if (currentReel) {
      setLikesCount(currentReel.likesCount || 0);
      if (currentUser) {
        checkIfUserLiked(currentReel.id, currentUser.id).then(setLiked);
      }
    }
  }, [currentReel, currentUser]);

  const handleNext = () => {
    if (currentIndex < videoReels.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleLike = async () => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    if (!currentReel) return;

    const next = !liked;
    setLiked(next);
    setLikesCount((prev) => (next ? prev + 1 : Math.max(0, prev - 1)));

    if (next) {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#f43f5e', '#fbbf24', '#a855f7'],
      });
    }

    try {
      await toggleLikePost(currentReel.id, currentUser.id, currentReel.authorId, currentUser);
    } catch (err) {
      console.error(err);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  if (!currentReel || videoReels.length === 0) {
    return (
      <div className="w-full max-w-sm mx-auto h-[600px] bg-zinc-950 border border-zinc-800 rounded-3xl flex flex-col items-center justify-center p-8 text-center text-zinc-400 my-4 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-rose-500/20 to-purple-500/20 flex items-center justify-center text-amber-400 mb-4 border border-amber-500/30">
          <Film className="w-8 h-8" />
        </div>
        <h3 className="font-bold text-base text-zinc-100 mb-1">Nenhum Reel publicado ainda</h3>
        <p className="text-xs text-zinc-500 mb-6 max-w-xs leading-relaxed">
          Seja o primeiro a publicar um vídeo no Insta King clicando no botão + no topo ou rodapé!
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-center py-2 relative select-none">
      {/* Up / Down Navigation Controls (Desktop) */}
      <div className="hidden md:flex flex-col gap-3 absolute right-12 top-1/2 -translate-y-1/2 z-30">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="p-3 bg-zinc-900/80 hover:bg-zinc-800 text-white rounded-full disabled:opacity-30 border border-zinc-700 transition-all"
          title="Vídeo anterior"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex === videoReels.length - 1}
          className="p-3 bg-zinc-900/80 hover:bg-zinc-800 text-white rounded-full disabled:opacity-30 border border-zinc-700 transition-all"
          title="Próximo vídeo"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      </div>

      {/* Main Reel Container */}
      <div className="relative w-full max-w-sm h-[calc(100vh-8.5rem)] md:h-[720px] bg-black rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 flex items-center justify-center">
        {/* Video Player */}
        {!videoError ? (
          <video
            ref={videoRef}
            src={currentReel.mediaUrl}
            autoPlay
            loop
            playsInline
            muted={isMuted}
            onClick={togglePlay}
            onError={() => setVideoError(true)}
            className="w-full h-full object-cover cursor-pointer"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-zinc-500 bg-zinc-950">
            <Film className="w-10 h-10 mb-2 text-zinc-600" />
            <p className="text-xs">Formato de vídeo não suportado neste navegador.</p>
          </div>
        )}

        {/* Play indicator */}
        {!isPlaying && !videoError && (
          <div
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-16 h-16 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 cursor-pointer pointer-events-auto"
          >
            <Play className="w-8 h-8 fill-white ml-1" />
          </div>
        )}

        {/* Sound toggle */}
        {!videoError && (
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="absolute top-4 right-4 z-20 p-2.5 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        )}

        {/* Right Floating Action Icons */}
        <div className="absolute right-3 bottom-20 z-20 flex flex-col items-center gap-5">
          {/* Like */}
          <div className="flex flex-col items-center">
            <button
              onClick={handleLike}
              className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:scale-110 active:scale-95 transition-all"
            >
              <Heart
                className={`w-7 h-7 transition-colors ${
                  liked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-white'
                }`}
              />
            </button>
            <span className="text-[11px] font-bold text-white mt-1 drop-shadow">
              {likesCount}
            </span>
          </div>

          {/* Comment */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => onOpenComments(currentReel)}
              className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:scale-110 active:scale-95 transition-all"
            >
              <MessageCircle className="w-7 h-7 text-white" />
            </button>
            <span className="text-[11px] font-bold text-white mt-1 drop-shadow">
              {currentReel.commentsCount || 0}
            </span>
          </div>

          {/* Direct Share */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => onShareToDirect && onShareToDirect(currentReel)}
              className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:scale-110 active:scale-95 transition-all"
            >
              <Send className="w-7 h-7 text-white" />
            </button>
            <span className="text-[11px] font-bold text-white mt-1 drop-shadow">Direct</span>
          </div>
        </div>

        {/* Bottom Author & Caption Info */}
        <div className="absolute bottom-4 left-4 right-16 z-20 space-y-2 pointer-events-auto">
          <div
            onClick={() => onSelectUser(currentReel.authorId)}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
          >
            <img
              src={currentReel.authorPhotoURL}
              alt={currentReel.authorName}
              className="w-10 h-10 rounded-full object-cover border-2 border-amber-400"
            />
            <div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-white drop-shadow-md">
                  @{currentReel.authorUsername}
                </span>
                <Crown className="w-3.5 h-3.5 text-amber-400 drop-shadow" />
              </div>
              <span className="text-[11px] text-zinc-300 drop-shadow">Áudio Original • Insta King</span>
            </div>
          </div>

          <p className="text-xs text-white drop-shadow leading-relaxed line-clamp-2">
            {currentReel.caption}
          </p>
        </div>
      </div>
    </div>
  );
};
