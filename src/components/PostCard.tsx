import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Crown,
  Trash2,
  Share2,
  Check
} from 'lucide-react';
import { Post, UserProfile } from '../types';
import {
  toggleLikePost,
  checkIfUserLiked,
  deletePost,
  toggleFollow,
  checkIfFollowing,
  addComment,
} from '../lib/firebase';
import confetti from 'canvas-confetti';

interface PostCardProps {
  post: Post;
  currentUser: UserProfile | null;
  openAuthModal: () => void;
  onOpenComments: (post: Post) => void;
  onShareToDirect?: (post: Post) => void;
  onSelectUser: (userId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUser,
  openAuthModal,
  onOpenComments,
  onShareToDirect,
  onSelectUser,
}) => {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Video specific state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Quick inline comment
  const [quickComment, setQuickComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    setLikesCount(post.likesCount || 0);
    if (currentUser) {
      checkIfUserLiked(post.id, currentUser.id).then(setLiked);
      if (currentUser.id !== post.authorId) {
        checkIfFollowing(currentUser.id, post.authorId).then(setIsFollowing);
      }
    }
  }, [post.id, post.likesCount, currentUser]);

  const handleLike = async () => {
    if (!currentUser) {
      openAuthModal();
      return;
    }

    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));

    if (nextLiked) {
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 900);
      confetti({
        particleCount: 25,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#f43f5e', '#ec4899', '#fbbf24'],
      });
    }

    try {
      await toggleLikePost(post.id, currentUser.id, post.authorId, currentUser);
    } catch (err) {
      console.error('Like toggle error:', err);
    }
  };

  const handleDoubleTap = () => {
    if (!liked) {
      handleLike();
    } else {
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 900);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    const nextState = !isFollowing;
    setIsFollowing(nextState);
    try {
      await toggleFollow(currentUser.id, post.authorId, currentUser);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePost = async () => {
    if (!currentUser || currentUser.id !== post.authorId) return;
    if (window.confirm('Tem certeza que deseja excluir esta publicação?')) {
      await deletePost(post.id, currentUser.id);
      setShowMenu(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => {
      setCopiedLink(false);
      setShowMenu(false);
    }, 1500);
  };

  const handleVideoClick = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleQuickCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickComment.trim()) return;
    if (!currentUser) {
      openAuthModal();
      return;
    }
    setSubmittingComment(true);
    try {
      await addComment(
        post.id,
        {
          id: currentUser.id,
          name: currentUser.displayName,
          username: currentUser.username,
          photoURL: currentUser.photoURL,
        },
        quickComment.trim(),
        post.authorId
      );
      setQuickComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Agora';
    if (diff < 3600) return `${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
    return `${Math.floor(diff / 86400)} d`;
  };

  return (
    <article className="w-full bg-zinc-950 border border-zinc-800/80 rounded-2xl overflow-hidden mb-6 shadow-sm">
      {/* Post Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/40">
        <div className="flex items-center gap-3">
          <div
            onClick={() => onSelectUser(post.authorId)}
            className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 cursor-pointer hover:scale-105 transition-transform"
          >
            <img
              src={post.authorPhotoURL}
              alt={post.authorName}
              className="w-full h-full rounded-full object-cover border-2 border-zinc-950"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span
                onClick={() => onSelectUser(post.authorId)}
                className="text-xs sm:text-sm font-bold text-zinc-100 cursor-pointer hover:underline"
              >
                {post.authorUsername}
              </span>
              <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="text-[11px] text-zinc-500">• {timeAgo(post.createdAt)}</span>
            </div>
            <p className="text-[11px] text-zinc-400 truncate max-w-[180px] sm:max-w-xs">
              {post.authorName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser && currentUser.id !== post.authorId && (
            <button
              id={`btn-follow-${post.id}`}
              onClick={handleFollowToggle}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                isFollowing
                  ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  : 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-sm'
              }`}
            >
              {isFollowing ? 'Seguindo' : 'Seguir'}
            </button>
          )}

          <div className="relative">
            <button
              id={`btn-post-menu-${post.id}`}
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-8 z-30 w-44 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl py-1 text-xs text-zinc-200">
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-800 text-left"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                  <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
                </button>
                {currentUser?.id === post.authorId && (
                  <button
                    onClick={handleDeletePost}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-rose-950/40 text-rose-400 text-left"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir Publicação</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Media Content (Photo or Video) */}
      <div
        className="relative bg-black flex items-center justify-center select-none overflow-hidden"
        onDoubleClick={handleDoubleTap}
      >
        {post.mediaType === 'video' && !videoError ? (
          <div className="relative w-full max-h-[600px] flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              src={post.mediaUrl}
              loop
              playsInline
              muted={isMuted}
              onClick={handleVideoClick}
              onError={() => setVideoError(true)}
              className="w-full max-h-[600px] object-contain cursor-pointer"
            />
            {/* Play/Pause center overlay when paused */}
            {!isPlaying && (
              <button
                onClick={handleVideoClick}
                className="absolute inset-0 m-auto w-14 h-14 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white border border-white/20 hover:scale-110 transition-transform"
              >
                <Play className="w-7 h-7 fill-white ml-1" />
              </button>
            )}
            {/* Mute toggle button */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="absolute bottom-3 right-3 p-2 bg-black/70 backdrop-blur-sm rounded-full text-white hover:bg-black transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        ) : (
          <img
            src={post.mediaUrl}
            alt={post.caption || 'Publicação'}
            loading="lazy"
            className="w-full max-h-[600px] object-contain cursor-pointer"
          />
        )}

        {/* Double-tap big heart animation */}
        {showHeartAnim && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-ping duration-300">
            <Heart className="w-24 h-24 text-rose-500 fill-rose-500 drop-shadow-2xl" />
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <button
              id={`btn-like-${post.id}`}
              onClick={handleLike}
              className="p-1 hover:scale-125 active:scale-95 transition-transform"
            >
              <Heart
                className={`w-6 h-6 transition-colors ${
                  liked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-zinc-200 hover:text-rose-400'
                }`}
              />
            </button>

            <button
              id={`btn-comment-${post.id}`}
              onClick={() => onOpenComments(post)}
              className="p-1 text-zinc-200 hover:text-amber-400 hover:scale-110 active:scale-95 transition-all"
            >
              <MessageCircle className="w-6 h-6" />
            </button>

            <button
              id={`btn-share-${post.id}`}
              onClick={() => onShareToDirect && onShareToDirect(post)}
              className="p-1 text-zinc-200 hover:text-sky-400 hover:scale-110 active:scale-95 transition-all"
            >
              <Send className="w-6 h-6" />
            </button>
          </div>

          <button
            id={`btn-save-${post.id}`}
            onClick={() => setIsSaved(!isSaved)}
            className="p-1 text-zinc-200 hover:text-amber-400 transition-colors"
          >
            <Bookmark className={`w-6 h-6 ${isSaved ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>
        </div>

        {/* Likes Count */}
        <p className="text-xs font-bold text-zinc-100 mb-1">
          {likesCount === 1 ? '1 curtida' : `${likesCount.toLocaleString('pt-BR')} curtidas`}
        </p>

        {/* Caption */}
        {post.caption && (
          <div className="text-xs text-zinc-300 leading-relaxed mb-2 break-words">
            <span
              onClick={() => onSelectUser(post.authorId)}
              className="font-bold text-zinc-100 mr-2 cursor-pointer hover:underline"
            >
              {post.authorUsername}
            </span>
            <span>
              {isExpanded || post.caption.length <= 90
                ? post.caption
                : `${post.caption.substring(0, 90)}...`}
            </span>
            {post.caption.length > 90 && !isExpanded && (
              <button
                onClick={() => setIsExpanded(true)}
                className="text-zinc-500 hover:text-zinc-300 ml-1 font-semibold"
              >
                mais
              </button>
            )}
          </div>
        )}

        {/* Comments link */}
        <button
          onClick={() => onOpenComments(post)}
          className="text-xs text-zinc-500 hover:text-zinc-300 font-medium block mb-2"
        >
          {post.commentsCount > 0
            ? `Ver todos os ${post.commentsCount} comentários`
            : 'Adicionar um comentário...'}
        </button>

        {/* Quick inline comment form */}
        <form onSubmit={handleQuickCommentSubmit} className="flex items-center gap-2 pt-2 border-t border-zinc-900">
          <input
            type="text"
            value={quickComment}
            onChange={(e) => setQuickComment(e.target.value)}
            placeholder="Deixe um comentário real..."
            className="flex-1 bg-transparent text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none"
          />
          {quickComment.trim() && (
            <button
              type="submit"
              disabled={submittingComment}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 disabled:opacity-50"
            >
              Publicar
            </button>
          )}
        </form>
      </div>
    </article>
  );
};
