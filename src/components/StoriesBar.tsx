import React from 'react';
import { Plus, Crown } from 'lucide-react';
import { Story, UserProfile } from '../types';

interface StoriesBarProps {
  stories: Story[];
  currentUser: UserProfile | null;
  onOpenStory: (story: Story) => void;
  onAddStory: () => void;
  openAuthModal: () => void;
}

export const StoriesBar: React.FC<StoriesBarProps> = ({
  stories,
  currentUser,
  onOpenStory,
  onAddStory,
  openAuthModal,
}) => {
  // Group stories by author so each author appears as 1 bubble with latest story
  const groupedStories: { [authorId: string]: Story } = {};
  stories.forEach((s) => {
    if (!groupedStories[s.authorId]) {
      groupedStories[s.authorId] = s;
    }
  });

  const userStory = currentUser ? stories.find((s) => s.authorId === currentUser.id) : null;
  const otherStories = Object.values(groupedStories).filter(
    (s) => !currentUser || s.authorId !== currentUser.id
  );

  return (
    <div className="w-full bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 mb-6 backdrop-blur-sm overflow-x-auto no-scrollbar shadow-sm">
      <div className="flex items-center gap-4 min-w-max">
        {/* Current User Story / Add Story Button */}
        <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
          <div className="relative">
            <div
              onClick={() => {
                if (!currentUser) {
                  openAuthModal();
                } else if (userStory) {
                  onOpenStory(userStory);
                } else {
                  onAddStory();
                }
              }}
              className={`w-16 h-16 rounded-full p-[2.5px] transition-transform duration-200 group-hover:scale-105 ${
                userStory
                  ? 'bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600'
                  : 'bg-zinc-800'
              }`}
            >
              <div className="w-full h-full rounded-full bg-zinc-950 p-0.5 overflow-hidden">
                <img
                  src={
                    currentUser?.photoURL ||
                    'https://api.dicebear.com/7.x/avataaars/svg?seed=guest'
                  }
                  alt={currentUser?.displayName || 'Seu Story'}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
            </div>

            {/* Plus badge to add story */}
            <button
              id="btn-add-story-badge"
              onClick={(e) => {
                e.stopPropagation();
                if (!currentUser) openAuthModal();
                else onAddStory();
              }}
              title="Adicionar Story"
              className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center border-2 border-zinc-950 shadow-md group-hover:scale-110 transition-transform"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
          <span className="text-[11px] font-medium text-zinc-300 max-w-[70px] truncate text-center">
            {userStory ? 'Seu story' : 'Novo story'}
          </span>
        </div>

        {/* Other Users' Stories */}
        {otherStories.map((story) => (
          <div
            key={story.id}
            onClick={() => onOpenStory(story)}
            className="flex flex-col items-center gap-1.5 cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-full p-[2.5px] bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 transition-transform duration-200 group-hover:scale-105 shadow-sm shadow-rose-500/10">
              <div className="w-full h-full rounded-full bg-zinc-950 p-0.5 overflow-hidden">
                <img
                  src={story.authorPhotoURL}
                  alt={story.authorName}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
            </div>
            <div className="flex items-center gap-0.5 max-w-[72px]">
              <span className="text-[11px] font-medium text-zinc-300 truncate">
                {story.authorUsername}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
