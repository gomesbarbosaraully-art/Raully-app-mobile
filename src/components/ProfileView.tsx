import React, { useState, useEffect } from 'react';
import {
  Crown,
  Settings,
  Grid,
  Film,
  Bookmark,
  Send,
  UserCheck,
  UserPlus,
  Share2,
  ExternalLink,
  Heart,
  MessageCircle,
  PlusSquare,
  Check,
  LogOut,
  Download,
  ShieldCheck
} from 'lucide-react';
import { Post, UserProfile } from '../types';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc
} from 'firebase/firestore';
import {
  db,
  toggleFollow,
  checkIfFollowing,
  getUserProfile
} from '../lib/firebase';
import { INITIAL_DEMO_USERS } from '../data/seedData';

interface ProfileViewProps {
  userId: string;
  currentUser: UserProfile | null;
  openEditModal: () => void;
  openCreateModal: () => void;
  openAuthModal: () => void;
  openApkModal?: () => void;
  onLogout?: () => void;
  onOpenDirectChat: (targetUserId: string) => void;
  onOpenPostDetail: (post: Post) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  userId,
  currentUser,
  openEditModal,
  openCreateModal,
  openAuthModal,
  openApkModal,
  onLogout,
  onOpenDirectChat,
  onOpenPostDetail,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'saved'>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = currentUser?.id === userId;

  // 1. Load user profile data
  useEffect(() => {
    setLoading(true);
    const userDocRef = doc(db, 'users', userId);

    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          // Check demo users fallback
          const demo = INITIAL_DEMO_USERS.find((u) => u.id === userId);
          if (demo) {
            setProfile(demo);
          } else if (isOwnProfile && currentUser) {
            setProfile(currentUser);
          }
        }
        setLoading(false);
      },
      () => {
        const demo = INITIAL_DEMO_USERS.find((u) => u.id === userId);
        if (demo) setProfile(demo);
        else if (isOwnProfile && currentUser) setProfile(currentUser);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, isOwnProfile, currentUser]);

  // 2. Load user's real posts from Firestore
  useEffect(() => {
    const postsCol = collection(db, 'posts');
    const q = query(
      postsCol,
      where('authorId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Post[] = [];
        snapshot.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as Post);
        });
        setPosts(list);
      },
      () => {
        setPosts([]);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // 3. Check following state
  useEffect(() => {
    if (currentUser && !isOwnProfile) {
      checkIfFollowing(currentUser.id, userId).then(setIsFollowing);
    }
  }, [currentUser, userId, isOwnProfile]);

  const handleFollowToggle = async () => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    const next = !isFollowing;
    setIsFollowing(next);
    if (profile) {
      setProfile({
        ...profile,
        followersCount: next ? profile.followersCount + 1 : Math.max(0, profile.followersCount - 1),
      });
    }
    try {
      await toggleFollow(currentUser.id, userId, currentUser);
    } catch (err) {
      console.error(err);
    }
  };

  const handleShareProfile = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const displayedPosts =
    activeTab === 'reels'
      ? posts.filter((p) => p.mediaType === 'video')
      : posts;

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-500 text-sm">
        Carregando perfil do Insta King...
      </div>
    );
  }

  const effectiveProfile = profile || currentUser;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 md:py-6">
      {/* Profile Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center gap-6 md:gap-10 pb-8 border-b border-zinc-800/80">
        {/* Profile Avatar */}
        <div className="relative mx-auto sm:mx-0">
          <div className="w-24 h-24 sm:w-36 sm:h-36 rounded-full p-1 bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 shadow-xl shadow-rose-950/30">
            <img
              src={
                effectiveProfile?.photoURL ||
                'https://api.dicebear.com/7.x/avataaars/svg?seed=user'
              }
              alt={effectiveProfile?.displayName}
              className="w-full h-full rounded-full object-cover border-4 border-zinc-950"
            />
          </div>
          <div className="absolute bottom-1 right-1 w-7 h-7 sm:w-9 sm:h-9 bg-zinc-900 border-2 border-amber-400 rounded-full flex items-center justify-center text-amber-400 shadow-md">
            <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Profile Details */}
        <div className="flex-1 w-full space-y-4">
          {/* User Handle & Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 justify-between sm:justify-start">
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg sm:text-2xl font-bold text-zinc-100 font-serif">
                {effectiveProfile?.username || 'usuario'}
              </h2>
              <Crown className="w-5 h-5 text-amber-400 drop-shadow" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isOwnProfile ? (
                <>
                  <button
                    id="btn-edit-profile"
                    onClick={openEditModal}
                    className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold rounded-xl border border-zinc-700 transition-colors"
                  >
                    Editar Perfil
                  </button>

                  {openApkModal && (
                    <button
                      id="btn-profile-apk"
                      onClick={openApkModal}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-rose-500/20 hover:from-amber-500/30 hover:to-rose-500/30 text-amber-300 text-xs font-bold rounded-xl border border-amber-400/40 transition-all shadow-sm"
                      title="Instalar APK Oficial"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>APK Oficial</span>
                    </button>
                  )}

                  <button
                    id="btn-share-profile"
                    onClick={handleShareProfile}
                    className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl border border-zinc-700 transition-colors"
                    title="Compartilhar Perfil"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                  </button>

                  {onLogout && (
                    <button
                      id="btn-profile-logout"
                      onClick={onLogout}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold rounded-xl border border-rose-500/30 transition-colors"
                      title="Sair da Conta do Insta King"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-400" />
                      <span>Sair da Conta</span>
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    id="btn-profile-follow"
                    onClick={handleFollowToggle}
                    className={`px-5 py-1.5 text-xs font-bold rounded-xl transition-all shadow-md ${
                      isFollowing
                        ? 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700'
                        : 'bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white hover:scale-105 active:scale-95'
                    }`}
                  >
                    {isFollowing ? (
                      <span className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5" /> Seguindo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <UserPlus className="w-3.5 h-3.5" /> Seguir
                      </span>
                    )}
                  </button>

                  <button
                    id="btn-profile-direct"
                    onClick={() => {
                      if (!currentUser) openAuthModal();
                      else onOpenDirectChat(userId);
                    }}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold rounded-xl border border-zinc-700 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5 text-sky-400" />
                    <span>Direct (PV)</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Metrics */}
          <div className="flex items-center gap-6 text-xs sm:text-sm">
            <div>
              <span className="font-bold text-zinc-100">{posts.length}</span>{' '}
              <span className="text-zinc-400">publicações</span>
            </div>
            <div>
              <span className="font-bold text-zinc-100">
                {(effectiveProfile?.followersCount || 0).toLocaleString('pt-BR')}
              </span>{' '}
              <span className="text-zinc-400">seguidores</span>
            </div>
            <div>
              <span className="font-bold text-zinc-100">
                {(effectiveProfile?.followingCount || 0).toLocaleString('pt-BR')}
              </span>{' '}
              <span className="text-zinc-400">seguindo</span>
            </div>
          </div>

          {/* Display Name & Bio */}
          <div className="space-y-1 text-xs sm:text-sm">
            <h3 className="font-bold text-zinc-100">{effectiveProfile?.displayName}</h3>
            {effectiveProfile?.bio && (
              <p className="text-zinc-300 leading-relaxed whitespace-pre-line">
                {effectiveProfile.bio}
              </p>
            )}
            {effectiveProfile?.website && (
              <a
                href={
                  effectiveProfile.website.startsWith('http')
                    ? effectiveProfile.website
                    : `https://${effectiveProfile.website}`
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-amber-400 hover:underline font-medium text-xs pt-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{effectiveProfile.website}</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Story Highlights (Destaques) */}
      <div className="py-5 border-b border-zinc-800/80 overflow-x-auto no-scrollbar flex items-center gap-5">
        {[
          { title: '👑 Viagens', icon: '✈️' },
          { title: '⚡ Lifestyle', icon: '🔥' },
          { title: '📸 Melhores', icon: '✨' },
          { title: '🎧 Vibes', icon: '🎵' },
        ].map((highlight, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1.5 cursor-pointer group min-w-max">
            <div className="w-14 h-14 rounded-full p-[2px] bg-zinc-800 group-hover:bg-gradient-to-tr group-hover:from-amber-400 group-hover:to-rose-500 transition-all">
              <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center text-lg border border-zinc-800">
                {highlight.icon}
              </div>
            </div>
            <span className="text-[11px] text-zinc-400 font-medium">{highlight.title}</span>
          </div>
        ))}
      </div>

      {/* Profile Tabs */}
      <div className="flex items-center justify-center border-b border-zinc-800/80 mb-6">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex items-center gap-2 py-3 px-6 text-xs font-semibold tracking-wider uppercase transition-all ${
            activeTab === 'posts'
              ? 'border-b-2 border-amber-400 text-amber-400'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>Publicações</span>
        </button>

        <button
          onClick={() => setActiveTab('reels')}
          className={`flex items-center gap-2 py-3 px-6 text-xs font-semibold tracking-wider uppercase transition-all ${
            activeTab === 'reels'
              ? 'border-b-2 border-rose-500 text-rose-400'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Film className="w-4 h-4" />
          <span>Vídeos / Reels</span>
        </button>

        {isOwnProfile && (
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex items-center gap-2 py-3 px-6 text-xs font-semibold tracking-wider uppercase transition-all ${
              activeTab === 'saved'
                ? 'border-b-2 border-purple-400 text-purple-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Salvos</span>
          </button>
        )}
      </div>

      {/* Posts Grid (3 Columns) */}
      {displayedPosts.length === 0 ? (
        <div className="text-center py-16 px-4 bg-zinc-950/40 rounded-2xl border border-zinc-900">
          <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-4 text-zinc-600">
            {activeTab === 'reels' ? <Film className="w-8 h-8" /> : <Grid className="w-8 h-8" />}
          </div>
          <h3 className="font-bold text-base text-zinc-200 mb-1">
            {activeTab === 'reels' ? 'Nenhum vídeo publicado ainda' : 'Nenhuma publicação ainda'}
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-5">
            {isOwnProfile
              ? 'Compartilhe suas primeiras fotos e vídeos com o mundo no Insta King!'
              : 'Este usuário ainda não publicou nenhum conteúdo.'}
          </p>
          {isOwnProfile && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-rose-600 text-white rounded-xl text-xs font-bold shadow-lg hover:scale-105 transition-all"
            >
              <PlusSquare className="w-4 h-4" />
              <span>Criar Publicação</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 sm:gap-4">
          {displayedPosts.map((post) => (
            <div
              key={post.id}
              onClick={() => onOpenPostDetail(post)}
              className="relative group aspect-square rounded-lg sm:rounded-xl overflow-hidden bg-zinc-900 cursor-pointer border border-zinc-800/60 shadow-sm"
            >
              {post.mediaType === 'video' ? (
                <div className="w-full h-full relative">
                  <video src={post.mediaUrl} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 p-1 bg-black/60 backdrop-blur-sm rounded-md text-white">
                    <Film className="w-3.5 h-3.5" />
                  </div>
                </div>
              ) : (
                <img
                  src={post.mediaUrl}
                  alt={post.caption || 'Publicação'}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              )}

              {/* Hover Overlay with Likes & Comments metric */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 text-white text-xs font-bold transition-opacity">
                <div className="flex items-center gap-1.5">
                  <Heart className="w-4 h-4 fill-white" />
                  <span>{post.likesCount || 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>{post.commentsCount || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
