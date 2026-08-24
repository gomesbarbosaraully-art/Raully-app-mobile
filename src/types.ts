export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  photoURL: string;
  bio?: string;
  website?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  createdAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorPhotoURL: string;
  mediaUrl: string;
  mediaType: 'photo' | 'video';
  caption: string;
  likesCount: number;
  commentsCount: number;
  aspectRatio?: '1:1' | '4:5' | '16:9';
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorPhotoURL: string;
  text: string;
  createdAt: string;
}

export interface Story {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorPhotoURL: string;
  mediaUrl: string;
  mediaType: 'photo' | 'video';
  caption?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantDetails: Record<
    string,
    {
      displayName: string;
      username: string;
      photoURL: string;
    }
  >;
  lastMessage?: string;
  lastSenderId?: string;
  updatedAt: string;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhotoURL: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'photo' | 'video' | 'audio' | 'none';
  audioDuration?: number;
  reaction?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderPhotoURL: string;
  type: 'like' | 'comment' | 'follow' | 'direct';
  postId?: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export type ActiveTab = 'feed' | 'explore' | 'reels' | 'direct' | 'notifications' | 'profile' | 'create';
