import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  getDocs,
  getDoc,
  increment,
  writeBatch,
  limit
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, Post, Comment, Story, Conversation, DirectMessage, AppNotification } from '../types';

// 1. Initialize Firebase and Firestore conforming to SKILL.md
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// 2. Error Handler conforming to SKILL.md specification
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errMsg = error instanceof Error ? error.message : String(error);
  
  // Ignore benign offline / network connection negotiation messages
  if (
    errMsg.includes('the client is offline') ||
    errMsg.includes('could not reach Cloud Firestore') ||
    errMsg.includes('unavailable')
  ) {
    console.warn(`[Firestore ${operationType} - Offline/Connecting at ${path}]:`, errMsg);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

// 4. User Profile Helpers
export async function createOrUpdateUserProfile(profile: Partial<UserProfile> & { id: string }): Promise<void> {
  // If user is not authenticated with Firebase Auth, keep profile in client state
  if (!auth.currentUser || auth.currentUser.uid !== profile.id) {
    return;
  }

  const userRef = doc(db, 'users', profile.id);
  const path = `users/${profile.id}`;
  try {
    const existingSnap = await getDoc(userRef);
    if (!existingSnap.exists()) {
      const newProfile: UserProfile = {
        id: profile.id,
        username: profile.username || `user_${profile.id.substring(0, 6)}`,
        displayName: profile.displayName || 'Insta King User',
        photoURL: profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`,
        bio: profile.bio || 'Bem-vindo ao meu perfil no Insta King! 👑',
        website: profile.website || '',
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        createdAt: new Date().toISOString(),
      };
      await setDoc(userRef, newProfile);
    } else {
      await updateDoc(userRef, {
        ...profile,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const path = `users/${userId}`;
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// 5. Posts Helpers
export async function createPost(data: Omit<Post, 'id' | 'createdAt' | 'likesCount' | 'commentsCount'>): Promise<string> {
  const postsCol = collection(db, 'posts');
  const path = 'posts';
  try {
    const newDoc = doc(postsCol);
    const post: Post = {
      ...data,
      id: newDoc.id,
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString(),
    };
    await setDoc(newDoc, post);

    // Increment author posts count
    const userRef = doc(db, 'users', data.authorId);
    await updateDoc(userRef, { postsCount: increment(1) }).catch(() => {});

    return newDoc.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deletePost(postId: string, authorId: string): Promise<void> {
  const path = `posts/${postId}`;
  try {
    await deleteDoc(doc(db, 'posts', postId));
    const userRef = doc(db, 'users', authorId);
    await updateDoc(userRef, { postsCount: increment(-1) }).catch(() => {});
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function toggleLikePost(postId: string, userId: string, authorId: string, currentUserProfile?: UserProfile): Promise<boolean> {
  const likeRef = doc(db, `posts/${postId}/likes`, userId);
  const postRef = doc(db, 'posts', postId);
  const path = `posts/${postId}/likes/${userId}`;
  try {
    const snap = await getDoc(likeRef);
    if (snap.exists()) {
      await deleteDoc(likeRef);
      await updateDoc(postRef, { likesCount: increment(-1) });
      return false;
    } else {
      await setDoc(likeRef, {
        userId,
        postId,
        createdAt: new Date().toISOString(),
      });
      await updateDoc(postRef, { likesCount: increment(1) });

      // Trigger notification if not liking own post
      if (authorId !== userId && currentUserProfile) {
        await sendNotification({
          recipientId: authorId,
          senderId: userId,
          senderName: currentUserProfile.displayName,
          senderUsername: currentUserProfile.username,
          senderPhotoURL: currentUserProfile.photoURL,
          type: 'like',
          postId,
          message: 'curtiu sua publicação.',
        });
      }
      return true;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function checkIfUserLiked(postId: string, userId: string): Promise<boolean> {
  const path = `posts/${postId}/likes/${userId}`;
  try {
    const snap = await getDoc(doc(db, `posts/${postId}/likes`, userId));
    return snap.exists();
  } catch {
    return false;
  }
}

// 6. Comments
export async function addComment(
  postId: string,
  author: { id: string; name: string; username: string; photoURL: string },
  text: string,
  postAuthorId?: string
): Promise<void> {
  const commentsCol = collection(db, `posts/${postId}/comments`);
  const postRef = doc(db, 'posts', postId);
  const path = `posts/${postId}/comments`;
  try {
    const newDoc = doc(commentsCol);
    const comment: Comment = {
      id: newDoc.id,
      postId,
      authorId: author.id,
      authorName: author.name,
      authorUsername: author.username,
      authorPhotoURL: author.photoURL,
      text,
      createdAt: new Date().toISOString(),
    };
    await setDoc(newDoc, comment);
    await updateDoc(postRef, { commentsCount: increment(1) });

    if (postAuthorId && postAuthorId !== author.id) {
      await sendNotification({
        recipientId: postAuthorId,
        senderId: author.id,
        senderName: author.name,
        senderUsername: author.username,
        senderPhotoURL: author.photoURL,
        type: 'comment',
        postId,
        message: `comentou: "${text.length > 40 ? text.substring(0, 37) + '...' : text}"`,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// 7. Follows
export async function toggleFollow(currentUserId: string, targetUserId: string, currentUserProfile?: UserProfile): Promise<boolean> {
  const followId = `${currentUserId}_${targetUserId}`;
  const followRef = doc(db, 'follows', followId);
  const currentUserRef = doc(db, 'users', currentUserId);
  const targetUserRef = doc(db, 'users', targetUserId);
  const path = `follows/${followId}`;
  try {
    const snap = await getDoc(followRef);
    if (snap.exists()) {
      await deleteDoc(followRef);
      await updateDoc(currentUserRef, { followingCount: increment(-1) }).catch(() => {});
      await updateDoc(targetUserRef, { followersCount: increment(-1) }).catch(() => {});
      return false;
    } else {
      await setDoc(followRef, {
        id: followId,
        followerId: currentUserId,
        followingId: targetUserId,
        createdAt: new Date().toISOString(),
      });
      await updateDoc(currentUserRef, { followingCount: increment(1) }).catch(() => {});
      await updateDoc(targetUserRef, { followersCount: increment(1) }).catch(() => {});

      if (currentUserProfile) {
        await sendNotification({
          recipientId: targetUserId,
          senderId: currentUserId,
          senderName: currentUserProfile.displayName,
          senderUsername: currentUserProfile.username,
          senderPhotoURL: currentUserProfile.photoURL,
          type: 'follow',
          message: 'começou a seguir você.',
        });
      }
      return true;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function checkIfFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
  const followId = `${currentUserId}_${targetUserId}`;
  try {
    const snap = await getDoc(doc(db, 'follows', followId));
    return snap.exists();
  } catch {
    return false;
  }
}

// 8. Direct Messages (PV / Direct)
export async function getOrCreateConversation(userA: UserProfile, userB: UserProfile): Promise<string> {
  const sortedIds = [userA.id, userB.id].sort();
  const convId = sortedIds.join('_');
  const convRef = doc(db, 'conversations', convId);
  const path = `conversations/${convId}`;

  try {
    const snap = await getDoc(convRef);
    if (!snap.exists()) {
      const newConv: Conversation = {
        id: convId,
        participants: sortedIds,
        participantDetails: {
          [userA.id]: {
            displayName: userA.displayName,
            username: userA.username,
            photoURL: userA.photoURL,
          },
          [userB.id]: {
            displayName: userB.displayName,
            username: userB.username,
            photoURL: userB.photoURL,
          },
        },
        lastMessage: 'Conversa iniciada',
        lastSenderId: userA.id,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(convRef, newConv, { merge: true });
    }
    return convId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return convId;
  }
}

export async function sendDirectMessage(
  conversationId: string,
  sender: UserProfile,
  recipientId: string,
  text: string,
  mediaUrl?: string,
  mediaType: 'photo' | 'video' | 'audio' | 'none' = 'none',
  audioDuration?: number
): Promise<void> {
  const messagesCol = collection(db, `conversations/${conversationId}/messages`);
  const convRef = doc(db, 'conversations', conversationId);
  const path = `conversations/${conversationId}/messages`;

  try {
    const newDoc = doc(messagesCol);
    const msg: Record<string, any> = {
      id: newDoc.id,
      conversationId,
      senderId: sender.id,
      senderName: sender.displayName || 'Usuário',
      senderPhotoURL: sender.photoURL || '',
      text: text || '',
      mediaUrl: mediaUrl || '',
      mediaType: mediaType || 'none',
      createdAt: new Date().toISOString(),
    };
    if (typeof audioDuration === 'number') {
      msg.audioDuration = audioDuration;
    }
    await setDoc(newDoc, msg);

    let lastMsgSnippet = text;
    if (!lastMsgSnippet) {
      if (mediaType === 'photo') lastMsgSnippet = '📷 Foto';
      else if (mediaType === 'video') lastMsgSnippet = '🎥 Vídeo';
      else if (mediaType === 'audio') lastMsgSnippet = '🎙️ Mensagem de voz';
      else lastMsgSnippet = '❤️';
    }

    await updateDoc(convRef, {
      lastMessage: lastMsgSnippet,
      lastSenderId: sender.id,
      updatedAt: new Date().toISOString(),
    }).catch(() => {});

    await sendNotification({
      recipientId,
      senderId: sender.id,
      senderName: sender.displayName,
      senderUsername: sender.username,
      senderPhotoURL: sender.photoURL,
      type: 'direct',
      message: text ? `enviou uma mensagem: "${text.substring(0, 30)}"` : 'enviou uma mensagem no Direct.',
    }).catch(() => {});
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function reactToDirectMessage(
  conversationId: string,
  messageId: string,
  reactionEmoji: string
): Promise<void> {
  const msgRef = doc(db, `conversations/${conversationId}/messages`, messageId);
  try {
    const snap = await getDoc(msgRef);
    if (snap.exists()) {
      const currentReaction = snap.data()?.reaction;
      // Toggle reaction if clicked same emoji
      const newReaction = currentReaction === reactionEmoji ? '' : reactionEmoji;
      await updateDoc(msgRef, { reaction: newReaction });
    }
  } catch (err) {
    console.warn('React message error:', err);
  }
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const convRef = doc(db, 'conversations', conversationId);
  const path = `conversations/${conversationId}`;
  try {
    await deleteDoc(convRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function blockUser(currentUserId: string, targetUserId: string): Promise<void> {
  const blockId = `${currentUserId}_blocks_${targetUserId}`;
  const blockRef = doc(db, 'blocks', blockId);
  const path = `blocks/${blockId}`;
  try {
    await setDoc(blockRef, {
      id: blockId,
      blockerId: currentUserId,
      blockedId: targetUserId,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function unblockUser(currentUserId: string, targetUserId: string): Promise<void> {
  const blockId = `${currentUserId}_blocks_${targetUserId}`;
  const blockRef = doc(db, 'blocks', blockId);
  const path = `blocks/${blockId}`;
  try {
    await deleteDoc(blockRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function checkIfBlocked(currentUserId: string, targetUserId: string): Promise<boolean> {
  const blockId = `${currentUserId}_blocks_${targetUserId}`;
  try {
    const snap = await getDoc(doc(db, 'blocks', blockId));
    return snap.exists();
  } catch {
    return false;
  }
}

// 9. Stories
export async function createStory(author: UserProfile, mediaUrl: string, mediaType: 'photo' | 'video', caption?: string): Promise<string> {
  const storiesCol = collection(db, 'stories');
  const path = 'stories';
  try {
    const newDoc = doc(storiesCol);
    const story: Story = {
      id: newDoc.id,
      authorId: author.id,
      authorName: author.displayName,
      authorUsername: author.username,
      authorPhotoURL: author.photoURL,
      mediaUrl,
      mediaType,
      caption: caption || '',
      createdAt: new Date().toISOString(),
    };
    await setDoc(newDoc, story);
    return newDoc.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// 10. Notifications
export async function sendNotification(notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): Promise<void> {
  const col = collection(db, 'notifications');
  const path = 'notifications';
  try {
    const newDoc = doc(col);
    const item: AppNotification = {
      ...notif,
      id: newDoc.id,
      read: false,
      createdAt: new Date().toISOString(),
    };
    await setDoc(newDoc, item);
  } catch (error) {
    // Non-blocking notification fail
    console.warn('Notification send failed', error);
  }
}

export async function markNotificationAsRead(notifId: string): Promise<void> {
  const path = `notifications/${notifId}`;
  try {
    await updateDoc(doc(db, 'notifications', notifId), { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
