import React, { useState, useEffect } from 'react';
import { Search, Film, Heart, MessageCircle, Crown, Sparkles, UserPlus } from 'lucide-react';
import { Post, UserProfile } from '../types';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { INITIAL_DEMO_USERS } from '../data/seedData';

interface ExploreViewProps {
  onOpenPost: (post: Post) => void;
  onSelectUser: (userId: string) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  onOpenPost,
  onSelectUser,
}) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'photos' | 'videos' | 'users'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch posts
        const postSnap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50)));
        const postList: Post[] = [];
        postSnap.forEach((d) => {
          postList.push({ ...d.data(), id: d.id } as Post);
        });

        // Fetch users
        const userSnap = await getDocs(collection(db, 'users'));
        const userList: UserProfile[] = [];
        userSnap.forEach((d) => {
          userList.push({ ...d.data(), id: d.id } as UserProfile);
        });

        // Add demo creators if users list is small
        INITIAL_DEMO_USERS.forEach((u) => {
          if (!userList.find((item) => item.id === u.id)) {
            userList.push(u);
          }
        });

        setPosts(postList);
        setUsers(userList);
      } catch (err) {
        console.warn(err);
        setPosts([]);
        setUsers(INITIAL_DEMO_USERS);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredPosts = posts.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.authorUsername.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeFilter === 'photos') return p.mediaType === 'photo';
    if (activeFilter === 'videos') return p.mediaType === 'video';
    return true;
  });

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-4 md:py-6">
      {/* Search Header */}
      <div className="mb-6">
        <div className="relative max-w-xl mx-auto mb-4">
          <Search className="w-5 h-5 text-zinc-400 absolute left-4 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar contas, hashtags # ou publicações no Insta King..."
            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400 shadow-lg transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { key: 'all', label: '🔥 Em Destaque' },
            { key: 'photos', label: '📷 Fotos' },
            { key: 'videos', label: '🎥 Reels / Vídeos' },
            { key: 'users', label: '👑 Usuários' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key as any)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === f.key
                  ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-md'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* If Users filter is active or search matches users */}
      {(activeFilter === 'users' || (searchQuery && filteredUsers.length > 0 && activeFilter === 'all')) && (
        <div className="mb-8 p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-amber-400" />
            <span>Contas Encontradas</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredUsers.slice(0, 6).map((u) => (
              <div
                key={u.id}
                onClick={() => onSelectUser(u.id)}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={u.photoURL}
                    alt={u.displayName}
                    className="w-10 h-10 rounded-full object-cover border border-amber-400/40"
                  />
                  <div className="truncate">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-bold text-zinc-100 truncate">{u.displayName}</p>
                      <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate">@{u.username}</p>
                  </div>
                </div>
                <button className="px-3 py-1 bg-gradient-to-r from-amber-500 to-rose-600 text-white rounded-lg text-[10px] font-bold">
                  Ver Perfil
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explore Grid of Posts */}
      {activeFilter !== 'users' && (
        <div className="grid grid-cols-3 gap-1 sm:gap-3">
          {filteredPosts.map((post, idx) => {
            // Instagram styled masonry feel: every 7th item takes 2 rows/cols
            const isLarge = idx % 7 === 1 && post.mediaType === 'video';

            return (
              <div
                key={post.id}
                onClick={() => onOpenPost(post)}
                className={`relative group rounded-xl overflow-hidden bg-zinc-900 cursor-pointer border border-zinc-800/80 shadow-sm ${
                  isLarge ? 'col-span-2 row-span-2 aspect-square sm:aspect-auto' : 'aspect-square'
                }`}
              >
                {post.mediaType === 'video' ? (
                  <div className="w-full h-full relative">
                    <video src={post.mediaUrl} className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-white">
                      <Film className="w-4 h-4" />
                    </div>
                  </div>
                ) : (
                  <img
                    src={post.mediaUrl}
                    alt={post.caption || 'Explore'}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}

                {/* Hover overlay with metrics */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-5 text-white text-xs font-bold transition-opacity">
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
            );
          })}
        </div>
      )}
    </div>
  );
};
