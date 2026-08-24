import React, { useState, useEffect } from 'react';
import { X, Send, Trash2, Heart, Crown, MessageCircle } from 'lucide-react';
import { Post, Comment, UserProfile } from '../types';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db, addComment, handleFirestoreError, OperationType } from '../lib/firebase';

interface CommentsModalProps {
  post: Post;
  currentUser: UserProfile | null;
  onClose: () => void;
  openAuthModal: () => void;
  onSelectUser?: (userId: string) => void;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
  post,
  currentUser,
  onClose,
  openAuthModal,
  onSelectUser,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
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
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `posts/${post.id}/comments`);
      }
    );

    return () => unsubscribe();
  }, [post.id]);

  const handleSubmit = async (e: React.FormEvent) => {
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

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteDoc(doc(db, `posts/${post.id}/comments`, commentId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${post.id}/comments/${commentId}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm text-zinc-100">Comentários</h3>
            <span className="text-xs text-zinc-500 font-medium">({comments.length})</span>
          </div>
          <button
            id="btn-close-comments"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Post Summary / Caption Header */}
        <div className="flex items-start gap-3 p-4 border-b border-zinc-800/60 bg-zinc-900/30">
          <img
            src={post.authorPhotoURL}
            alt={post.authorName}
            className="w-9 h-9 rounded-full object-cover border border-amber-400/40 cursor-pointer"
            onClick={() => onSelectUser && onSelectUser(post.authorId)}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                onClick={() => onSelectUser && onSelectUser(post.authorId)}
                className="text-xs font-bold text-zinc-200 cursor-pointer hover:underline"
              >
                {post.authorUsername}
              </span>
              <Crown className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] text-zinc-500">• Autor</span>
            </div>
            <p className="text-xs text-zinc-300 mt-1 leading-relaxed break-words">{post.caption}</p>
          </div>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-xs">
              Nenhum comentário ainda. Seja o primeiro a comentar! 👑
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-3 group">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <img
                    src={c.authorPhotoURL}
                    alt={c.authorName}
                    className="w-8 h-8 rounded-full object-cover border border-zinc-800 cursor-pointer flex-shrink-0"
                    onClick={() => onSelectUser && onSelectUser(c.authorId)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        onClick={() => onSelectUser && onSelectUser(c.authorId)}
                        className="text-xs font-semibold text-zinc-200 cursor-pointer hover:underline"
                      >
                        {c.authorUsername}
                      </span>
                      {c.authorId === post.authorId && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded font-medium">
                          Criador
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-500">
                        {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed break-words">{c.text}</p>
                  </div>
                </div>

                {currentUser && (currentUser.id === c.authorId || currentUser.id === post.authorId) && (
                  <button
                    onClick={() => handleDeleteComment(c.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 transition-opacity"
                    title="Excluir comentário"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Comment Input */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950">
          {currentUser ? (
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName}
                className="w-8 h-8 rounded-full object-cover border border-zinc-700 flex-shrink-0"
              />
              <input
                id="input-comment-modal"
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Adicione um comentário..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
                maxLength={500}
              />
              <button
                id="btn-submit-comment-modal"
                type="submit"
                disabled={!newComment.trim() || submitting}
                className="p-2 bg-gradient-to-r from-amber-500 to-rose-600 text-white rounded-full disabled:opacity-40 hover:scale-105 active:scale-95 transition-all shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <button
              id="btn-login-to-comment"
              onClick={openAuthModal}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-rose-600 text-white rounded-xl text-xs font-semibold"
            >
              Faça login para comentar nesta publicação
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
