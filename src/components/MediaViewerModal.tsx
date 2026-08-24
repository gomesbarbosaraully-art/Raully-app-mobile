import React, { useState, useEffect } from 'react';
import { X, Heart, MessageCircle, Send, Bookmark, Crown, Trash2, Check, Share2 } from 'lucide-react';
import { Post, Comment, UserProfile } from '../types';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db, addComment, toggleLikePost, checkIfUserLiked, deletePost } from '../lib/firebase';
import confetti from 'canvas-confetti';

interface MediaViewerModalProps {
  post: Post;
  currentUser: UserProfile | null;
  onClose: () => void;
  openAuthModal: () => void;
  onSelectUser: (userId: string) => void;
  onShareToDirect?: (post: Post) => void;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  post,
  currentUser,
  onClose,
  openAuthModal,
  onSelectUser,
  onShareToDirect,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [isSaved, setIsSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    setLikesCount(post.likesCount || 0);
    if (currentUser) {
      checkIfUserLiked(post.id, currentUser.id).then(setLiked);
    }

    const commentsCol = collection(db, `posts/${post.id}/comments`);
    const q = query(commentsCol, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Comment[] = [];
        snapshot.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as Comment);
        });
        setComments(list);
      },
      () => {}
    );

    return () => unsubscribe();
  }, [post.id, post.likesCount, currentUser]);

  const handleLike = async () => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    const next = !liked;
    setLiked(next);
    setLikesCount((prev) => (next ? prev + 1 : Math.max(0, prev - 1)));

    if (next) {
      confetti({ particleCount: 30, spread: 55, origin: { y: 0.7 } });
    }

    try {
      await toggleLikePost(post.id, currentUser.id, post.authorId, currentUser);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!currentUser) {
      openAuthModal();
      return;
    }

    setSubmitting(true);
    try {
      await addComment(
        post.id,
        {
          id: currentUser.id,
          name: currentUser.displayName,
          username: currentUser.username,
          photoURL: currentUser.photoURL,
        },
        newComment.trim(),
        post.authorId
      );
      setNewComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-2 sm:p-6 backdrop-blur-md">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 text-white/80 hover:text-white bg-black/60 rounded-full"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
        {/* Left Side: Media */}
        <div className="flex-1 bg-black flex items-center justify-center relative min-h-[300px] md:min-h-[500px]">
          {post.mediaType === 'video' && !videoError ? (
            <video
              src={post.mediaUrl}
              controls
              autoPlay
              loop
              onError={() => setVideoError(true)}
              className="w-full h-full max-h-[80vh] object-contain"
            />
          ) : (
            <img
              src={post.mediaUrl}
              alt={post.caption || 'Publicação'}
              className="w-full h-full max-h-[80vh] object-contain"
            />
          )}
        </div>

        {/* Right Side: Author, Caption & Comments */}
        <div className="w-full md:w-96 flex flex-col bg-zinc-950 border-t md:border-t-0 md:border-l border-zinc-800">
          {/* Author Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/40">
            <div
              onClick={() => {
                onSelectUser(post.authorId);
                onClose();
              }}
              className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
            >
              <img
                src={post.authorPhotoURL}
                alt={post.authorName}
                className="w-10 h-10 rounded-full object-cover border border-amber-400"
              />
              <div>
                <div className="flex items-center gap-1">
                  <h4 className="font-bold text-xs sm:text-sm text-zinc-100">{post.authorUsername}</h4>
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <p className="text-[11px] text-zinc-400">{post.authorName}</p>
              </div>
            </div>

            <button
              onClick={handleCopyLink}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              title="Copiar Link"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Caption & Comments scroll area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-60 md:max-h-none">
            {/* Caption */}
            {post.caption && (
              <div className="flex items-start gap-3 pb-3 border-b border-zinc-900">
                <img
                  src={post.authorPhotoURL}
                  alt={post.authorName}
                  className="w-8 h-8 rounded-full object-cover border border-zinc-800"
                />
                <div className="flex-1 text-xs">
                  <span className="font-bold text-zinc-100 mr-1.5">{post.authorUsername}</span>
                  <span className="text-zinc-300 leading-relaxed break-words">{post.caption}</span>
                </div>
              </div>
            )}

            {/* Comments */}
            {comments.map((c) => (
              <div key={c.id} className="flex items-start gap-3 text-xs">
                <img
                  src={c.authorPhotoURL}
                  alt={c.authorName}
                  className="w-7 h-7 rounded-full object-cover border border-zinc-800 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-zinc-200">{c.authorUsername}</span>
                    <span className="text-[9px] text-zinc-500">
                      {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-zinc-300 mt-0.5 leading-relaxed break-words">{c.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Action Bar */}
          <div className="p-3 border-t border-zinc-800 bg-zinc-950/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <button onClick={handleLike} className="p-1 hover:scale-125 transition-transform">
                  <Heart
                    className={`w-6 h-6 ${
                      liked ? 'fill-rose-500 text-rose-500' : 'text-zinc-200 hover:text-rose-400'
                    }`}
                  />
                </button>
                <button
                  onClick={() => onShareToDirect && onShareToDirect(post)}
                  className="p-1 text-zinc-200 hover:text-sky-400 hover:scale-110 transition-all"
                >
                  <Send className="w-6 h-6" />
                </button>
              </div>
              <button
                onClick={() => setIsSaved(!isSaved)}
                className="p-1 text-zinc-200 hover:text-amber-400"
              >
                <Bookmark className={`w-6 h-6 ${isSaved ? 'fill-amber-400 text-amber-400' : ''}`} />
              </button>
            </div>

            <p className="text-xs font-bold text-zinc-100 mb-2">
              {likesCount === 1 ? '1 curtida' : `${likesCount.toLocaleString('pt-BR')} curtidas`}
            </p>

            {/* Comment Form */}
            {currentUser ? (
              <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Adicione um comentário..."
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-3.5 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 disabled:opacity-40"
                >
                  Publicar
                </button>
              </form>
            ) : (
              <button
                onClick={openAuthModal}
                className="w-full py-2 bg-gradient-to-r from-amber-500 to-rose-600 rounded-xl text-white text-xs font-semibold"
              >
                Entre para comentar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
