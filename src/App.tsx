import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StoriesBar } from './components/StoriesBar';
import { StoryViewerModal } from './components/StoryViewerModal';
import { PostCard } from './components/PostCard';
import { CreatePostModal } from './components/CreatePostModal';
import { CommentsModal } from './components/CommentsModal';
import { KingMessengerView } from './components/KingMessengerView';
import { ProfileView } from './components/ProfileView';
import { EditProfileModal } from './components/EditProfileModal';
import { ExploreView } from './components/ExploreView';
import { ReelsView } from './components/ReelsView';
import { NotificationsModal } from './components/NotificationsModal';
import { AuthModal } from './components/AuthModal';
import { MediaViewerModal } from './components/MediaViewerModal';
import { PwaLinkModal } from './components/PwaLinkModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ActiveTab, Post, Story, UserProfile } from './types';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from './lib/firebase';
import { Crown, Sparkles, PlusSquare, Share2, Compass, ShieldCheck, Download } from 'lucide-react';

function MainApp() {
  const { userProfile, loading: authLoading, updateProfileData, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('feed');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [directTargetUserId, setDirectTargetUserId] = useState<string | null>(null);

  // Real-time collections (strictly real user posts and stories)
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [unreadDMsCount, setUnreadDMsCount] = useState(0);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  // Modals state
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [activeCommentsPost, setActiveCommentsPost] = useState<Post | null>(null);
  const [activeMediaPost, setActiveMediaPost] = useState<Post | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);

  // 1. Subscribe to Real Feed Posts
  useEffect(() => {
    const postsCol = collection(db, 'posts');
    const q = query(postsCol, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Post[] = [];
        snapshot.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as Post);
        });
        setPosts(list);
      },
      (err) => {
        console.warn('Posts listener error:', err);
        setPosts([]);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Subscribe to Real Stories
  useEffect(() => {
    const storiesCol = collection(db, 'stories');
    const q = query(storiesCol, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Story[] = [];
        snapshot.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as Story);
        });
        setStories(list);
      },
      (err) => {
        console.warn('Stories error:', err);
        setStories([]);
      }
    );

    return () => unsubscribe();
  }, []);

  // 3. Unread Notifications counter
  useEffect(() => {
    if (!userProfile) {
      setUnreadNotifsCount(0);
      return;
    }
    const notifsCol = collection(db, 'notifications');
    const q = query(
      notifsCol,
      where('recipientId', '==', userProfile.id),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setUnreadNotifsCount(snap.size);
      },
      () => {}
    );
    return () => unsubscribe();
  }, [userProfile?.id]);

  // Navigate to a specific user's profile
  const handleSelectUserForProfile = (targetUserId: string) => {
    setSelectedProfileId(targetUserId);
    setActiveTab('profile');
  };

  // Open direct chat targeting a specific user
  const handleOpenDirectWithUser = (targetUserId: string) => {
    setDirectTargetUserId(targetUserId);
    setActiveTab('direct');
  };

  // Share a post to direct chat
  const handleSharePostToDirect = (post: Post) => {
    if (!userProfile) {
      setIsAuthModalOpen(true);
      return;
    }
    setDirectTargetUserId(post.authorId);
    setActiveTab('direct');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row antialiased selection:bg-rose-500 selection:text-white">
      {/* Navigation Sidebar & Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'profile') {
            setSelectedProfileId(userProfile?.id || null);
          }
          setActiveTab(tab);
        }}
        openCreateModal={() => setIsCreateModalOpen(true)}
        openAuthModal={() => setIsAuthModalOpen(true)}
        openApkModal={() => setIsApkModalOpen(true)}
        currentUser={userProfile}
        unreadDMsCount={unreadDMsCount}
        unreadNotifsCount={unreadNotifsCount}
        onLogout={logout}
      />

      {/* Main Content Area */}
      <main
        className={`flex-1 md:pl-64 lg:pl-72 flex justify-center min-h-0 min-w-0 ${
          activeTab === 'direct'
            ? 'p-0 md:p-4 h-[100dvh] max-h-[100dvh] overflow-hidden'
            : 'pt-16 md:pt-6 pb-20 md:pb-8 px-2 sm:px-4'
        }`}
      >
        {/* VIEW 1: Feed (Home) */}
        {activeTab === 'feed' && (
          <div className="w-full max-w-xl mx-auto flex flex-col items-center">
            {/* Top Stories Bar */}
            <StoriesBar
              stories={stories}
              currentUser={userProfile}
              onOpenStory={(story) => setActiveStory(story)}
              onAddStory={() => setIsCreateModalOpen(true)}
              openAuthModal={() => setIsAuthModalOpen(true)}
            />

            {/* Posts List */}
            {posts.length === 0 ? (
              <div className="text-center py-16 px-4 bg-zinc-900/40 rounded-2xl border border-zinc-800 w-full">
                <Crown className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-zinc-200 mb-1">
                  Seja bem-vindo ao Insta King! 👑
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
                  Faça a primeira publicação de fotos ou vídeos para começar a movimentar a rede!
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      if (!userProfile) setIsAuthModalOpen(true);
                      else setIsCreateModalOpen(true);
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-rose-600 text-white font-bold text-xs rounded-xl shadow-lg hover:scale-105 transition-all"
                  >
                    Criar Primeira Publicação
                  </button>
                  <button
                    onClick={() => setIsApkModalOpen(true)}
                    className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-bold text-xs rounded-xl border border-zinc-700 flex items-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Instalar APK Oficial</span>
                  </button>
                </div>
              </div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={userProfile}
                  openAuthModal={() => setIsAuthModalOpen(true)}
                  onOpenComments={(p) => setActiveCommentsPost(p)}
                  onShareToDirect={(p) => handleSharePostToDirect(p)}
                  onSelectUser={handleSelectUserForProfile}
                />
              ))
            )}
          </div>
        )}

        {/* VIEW 2: Explore */}
        {activeTab === 'explore' && (
          <ExploreView
            onOpenPost={(post) => setActiveMediaPost(post)}
            onSelectUser={handleSelectUserForProfile}
          />
        )}

        {/* VIEW 3: Reels */}
        {activeTab === 'reels' && (
          <ReelsView
            reels={posts}
            currentUser={userProfile}
            openAuthModal={() => setIsAuthModalOpen(true)}
            onOpenComments={(p) => setActiveCommentsPost(p)}
            onSelectUser={handleSelectUserForProfile}
            onShareToDirect={(p) => handleSharePostToDirect(p)}
          />
        )}

        {/* VIEW 4: King Messenger (Dourado Neon) */}
        {activeTab === 'direct' && (
          userProfile ? (
            <KingMessengerView
              currentUser={userProfile}
              initialChatUserId={directTargetUserId}
              onSelectUserForProfile={handleSelectUserForProfile}
              onBackToFeed={() => setActiveTab('feed')}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center px-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-yellow-500/20 to-amber-600/20 border border-amber-400/40 flex items-center justify-center mb-4 text-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.3)]">
                <Crown className="w-10 h-10 drop-shadow" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent font-serif mb-2">
                King Messenger
              </h2>
              <p className="text-xs text-zinc-400 max-w-sm mb-6">
                Faça login para conversar no King Messenger Dourado Neon, enviar mensagens com a seta, fotos, vídeos e áudios de voz em tempo real.
              </p>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-zinc-950 font-extrabold text-xs rounded-2xl shadow-[0_0_20px_rgba(251,191,36,0.5)] hover:scale-105 transition-all"
              >
                Entrar no King Messenger
              </button>
            </div>
          )
        )}

        {/* VIEW 5: Notifications */}
        {activeTab === 'notifications' && (
          userProfile ? (
            <NotificationsModal
              currentUser={userProfile}
              onClose={() => setActiveTab('feed')}
              onSelectUser={handleSelectUserForProfile}
              onOpenDirectChat={handleOpenDirectWithUser}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center px-4">
              <h2 className="text-lg font-bold text-zinc-100 mb-2">Suas Notificações</h2>
              <p className="text-xs text-zinc-400 mb-5">Faça login para acompanhar suas curtidas e comentários.</p>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-rose-600 text-white font-bold text-xs rounded-xl"
              >
                Entrar
              </button>
            </div>
          )
        )}

        {/* VIEW 6: Profile */}
        {activeTab === 'profile' && (
          <ProfileView
            userId={selectedProfileId || userProfile?.id || 'king_official'}
            currentUser={userProfile}
            openEditModal={() => setIsEditProfileModalOpen(true)}
            openCreateModal={() => setIsCreateModalOpen(true)}
            openAuthModal={() => setIsAuthModalOpen(true)}
            openApkModal={() => setIsApkModalOpen(true)}
            onLogout={logout}
            onOpenDirectChat={handleOpenDirectWithUser}
            onOpenPostDetail={(post) => setActiveMediaPost(post)}
          />
        )}
      </main>

      {/* MODAL 1: Create Post (Photo / Video / Story) */}
      {isCreateModalOpen && userProfile && (
        <CreatePostModal
          currentUser={userProfile}
          onClose={() => setIsCreateModalOpen(false)}
          onPostCreated={() => {
            setActiveTab('feed');
          }}
        />
      )}

      {/* MODAL 2: Edit Profile (Photo / Name / Bio / Website) */}
      {isEditProfileModalOpen && userProfile && (
        <EditProfileModal
          userProfile={userProfile}
          onClose={() => setIsEditProfileModalOpen(false)}
          onSave={updateProfileData}
        />
      )}

      {/* MODAL 3: Full Story Viewer */}
      {activeStory && (
        <StoryViewerModal
          stories={stories}
          initialStory={activeStory}
          currentUser={userProfile}
          onClose={() => setActiveStory(null)}
          openAuthModal={() => setIsAuthModalOpen(true)}
        />
      )}

      {/* MODAL 4: Post Comments Drawer / Modal */}
      {activeCommentsPost && (
        <CommentsModal
          post={activeCommentsPost}
          currentUser={userProfile}
          onClose={() => setActiveCommentsPost(null)}
          openAuthModal={() => setIsAuthModalOpen(true)}
          onSelectUser={handleSelectUserForProfile}
        />
      )}

      {/* MODAL 5: Full Post Media Viewer */}
      {activeMediaPost && (
        <MediaViewerModal
          post={activeMediaPost}
          currentUser={userProfile}
          onClose={() => setActiveMediaPost(null)}
          openAuthModal={() => setIsAuthModalOpen(true)}
          onSelectUser={handleSelectUserForProfile}
          onShareToDirect={(p) => handleSharePostToDirect(p)}
        />
      )}

      {/* MODAL 6: Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* MODAL 7: Official PWA Link Modal */}
      <PwaLinkModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
