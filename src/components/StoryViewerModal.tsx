import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Heart, Trash2, ChevronLeft, ChevronRight, Crown } from 'lucide-react';
import { Story, UserProfile } from '../types';
import { deleteDoc, doc } from 'firebase/firestore';
import { db, sendDirectMessage, getOrCreateConversation, handleFirestoreError, OperationType } from '../lib/firebase';
import confetti from 'canvas-confetti';

interface StoryViewerModalProps {
  stories: Story[];
  initialStory: Story;
  currentUser: UserProfile | null;
  onClose: () => void;
  openAuthModal: () => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  stories,
  initialStory,
  currentUser,
  onClose,
  openAuthModal,
}) => {
  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = stories.findIndex((s) => s.id === initialStory.id);
    return idx >= 0 ? idx : 0;
  });
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentStory = stories[currentIndex];

  useEffect(() => {
    setProgress(0);
    setIsLiked(false);
  }, [currentIndex]);

  useEffect(() => {
    if (isPaused) return;

    const interval = 50; // update every 50ms
    const totalDuration = 5000; // 5 seconds
    const step = (interval / totalDuration) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isPaused, stories.length]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !currentUser || !currentStory) return;

    try {
      const recipientUser: UserProfile = {
        id: currentStory.authorId,
        displayName: currentStory.authorName,
        username: currentStory.authorUsername,
        photoURL: currentStory.authorPhotoURL,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        createdAt: '',
      };
      const convId = await getOrCreateConversation(currentUser, recipientUser);
      await sendDirectMessage(
        convId,
        currentUser,
        currentStory.authorId,
        `Respondeu ao seu story: "${replyText}"`,
        currentStory.mediaUrl,
        currentStory.mediaType
      );
      setReplyText('');
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStory = async () => {
    if (!currentStory) return;
    try {
      await deleteDoc(doc(db, 'stories', currentStory.id));
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `stories/${currentStory.id}`);
    }
  };

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center backdrop-blur-md select-none">
      {/* Top Close Button */}
      <button
        id="btn-close-story"
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/70 rounded-full transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Navigation arrows (Desktop) */}
      {currentIndex > 0 && (
        <button
          id="btn-prev-story"
          onClick={handlePrev}
          className="hidden md:flex absolute left-8 z-50 p-3 text-white/80 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 rounded-full transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {currentIndex < stories.length - 1 && (
        <button
          id="btn-next-story"
          onClick={handleNext}
          className="hidden md:flex absolute right-8 z-50 p-3 text-white/80 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 rounded-full transition-all"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Main Story Container */}
      <div
        className="relative w-full max-w-sm h-full max-h-[85vh] bg-zinc-950 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between border border-zinc-800"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Progress Bars */}
        <div className="absolute top-3 left-3 right-3 z-30 flex items-center gap-1.5">
          {stories.map((s, idx) => (
            <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-75 ease-linear rounded-full"
                style={{
                  width:
                    idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Story Header */}
        <div className="absolute top-6 left-3 right-3 z-30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={currentStory.authorPhotoURL}
              alt={currentStory.authorName}
              className="w-9 h-9 rounded-full object-cover border-2 border-amber-400"
            />
            <div>
              <div className="flex items-center gap-1">
                <span className="text-white font-semibold text-xs drop-shadow-md">
                  {currentStory.authorUsername}
                </span>
                <Crown className="w-3 h-3 text-amber-400 drop-shadow" />
              </div>
              <span className="text-[10px] text-zinc-300 drop-shadow">Há poucas horas</span>
            </div>
          </div>

          {currentUser?.id === currentStory.authorId && (
            <button
              id="btn-delete-story"
              onClick={handleDeleteStory}
              className="p-1.5 bg-black/40 hover:bg-rose-600/80 rounded-full text-white transition-colors"
              title="Excluir Story"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tap areas for Prev / Next navigation */}
        <div className="absolute inset-0 z-20 flex">
          <div className="w-1/3 h-full cursor-pointer" onClick={handlePrev} />
          <div className="w-2/3 h-full cursor-pointer" onClick={handleNext} />
        </div>

        {/* Story Media (Image or Video) */}
        <div className="w-full h-full flex items-center justify-center bg-black relative">
          {currentStory.mediaType === 'video' ? (
            <video
              src={currentStory.mediaUrl}
              autoPlay
              playsInline
              muted={false}
              className="w-full h-full object-contain"
            />
          ) : (
            <img
              src={currentStory.mediaUrl}
              alt="Story"
              className="w-full h-full object-contain"
            />
          )}

          {currentStory.caption && (
            <div className="absolute bottom-20 left-4 right-4 z-30 bg-black/60 backdrop-blur-sm p-3 rounded-xl border border-white/10 text-white text-center text-sm font-medium">
              {currentStory.caption}
            </div>
          )}
        </div>

        {/* Story Footer / Direct Reply */}
        <div className="absolute bottom-3 left-3 right-3 z-30 flex items-center gap-2">
          {currentUser ? (
            <form onSubmit={handleSendReply} className="flex-1 flex items-center gap-2">
              <input
                id="input-story-reply"
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Responder a @${currentStory.authorUsername}...`}
                className="flex-1 bg-black/50 backdrop-blur-md border border-white/30 rounded-full px-4 py-2 text-xs text-white placeholder-white/70 focus:outline-none focus:border-amber-400"
              />
              <button
                id="btn-submit-story-reply"
                type="submit"
                disabled={!replyText.trim()}
                className="p-2.5 rounded-full bg-gradient-to-tr from-amber-500 to-rose-600 text-white disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <button
              id="btn-story-login"
              onClick={openAuthModal}
              className="w-full py-2 bg-gradient-to-r from-amber-500 to-rose-600 rounded-full text-white text-xs font-semibold"
            >
              Entrar para responder
            </button>
          )}

          <button
            id="btn-like-story"
            onClick={() => {
              setIsLiked(!isLiked);
              if (!isLiked) {
                confetti({ particleCount: 20, spread: 45, origin: { y: 0.8 } });
              }
            }}
            className={`p-2.5 rounded-full backdrop-blur-md border transition-all ${
              isLiked
                ? 'bg-rose-500/30 border-rose-500 text-rose-500 scale-110'
                : 'bg-black/50 border-white/30 text-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
