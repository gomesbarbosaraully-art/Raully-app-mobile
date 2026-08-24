import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider, createOrUpdateUserProfile, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<boolean>;
  loginWithCustomAccount: (username: string, displayName: string, avatarUrl?: string) => Promise<void>;
  updateProfileData: (updates: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Check saved custom user from localStorage if anonymous/custom test mode is active
  const [customUser, setCustomUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('instaking_custom_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Clear custom simulated user if real Google Auth is present
        setCustomUser(null);
        localStorage.removeItem('instaking_custom_user');

        const cleanUsername = (currentUser.displayName || currentUser.email?.split('@')[0] || 'king_user')
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '_')
          .substring(0, 20);

        // Ensure user document exists
        await createOrUpdateUserProfile({
          id: currentUser.uid,
          displayName: currentUser.displayName || cleanUsername,
          username: cleanUsername,
          photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.uid}`,
        });

        // Real-time listener for current user profile
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribeProfile = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setUserProfile(docSnap.data() as UserProfile);
            } else {
              setUserProfile({
                id: currentUser.uid,
                displayName: currentUser.displayName || cleanUsername,
                username: cleanUsername,
                photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.uid}`,
                bio: 'Bem-vindo ao meu perfil no Insta King! 👑',
                website: '',
                followersCount: 0,
                followingCount: 0,
                postsCount: 0,
                createdAt: new Date().toISOString(),
              });
            }
            setLoading(false);
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
            // Fallback profile if offline
            setUserProfile({
              id: currentUser.uid,
              displayName: currentUser.displayName || cleanUsername,
              username: cleanUsername,
              photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.uid}`,
              bio: 'Bem-vindo ao meu perfil no Insta King! 👑',
              website: '',
              followersCount: 0,
              followingCount: 0,
              postsCount: 0,
              createdAt: new Date().toISOString(),
            });
            setLoading(false);
          }
        );

        return () => unsubscribeProfile();
      } else if (customUser) {
        // Real-time listener for custom user profile
        const userDocRef = doc(db, 'users', customUser.id);
        const unsubscribeProfile = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setUserProfile(docSnap.data() as UserProfile);
            } else {
              setUserProfile(customUser);
            }
            setLoading(false);
          },
          () => {
            setUserProfile(customUser);
            setLoading(false);
          }
        );
        return () => unsubscribeProfile();
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [customUser?.id]);

  const loginWithGoogle = async (): Promise<boolean> => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      return true;
    } catch (error: any) {
      const code = error?.code || '';
      const message = error?.message || '';
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        message.includes('popup-closed-by-user') ||
        message.includes('cancelled-popup-request')
      ) {
        // User intentionally closed the popup or cancelled the request - no error to log or throw
        return false;
      }
      console.warn('Google login notice:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithCustomAccount = async (username: string, displayName: string, avatarUrl?: string) => {
    setLoading(true);
    try {
      const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const customId = `user_${cleanUsername}`;
      const defaultPhoto = avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUsername}`;

      const profileData: UserProfile = {
        id: customId,
        username: cleanUsername,
        displayName: displayName || cleanUsername,
        photoURL: defaultPhoto,
        bio: 'Membro oficial do Insta King! 👑',
        website: '',
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        createdAt: new Date().toISOString(),
      };

      await createOrUpdateUserProfile(profileData);
      localStorage.setItem('instaking_custom_user', JSON.stringify(profileData));
      setCustomUser(profileData);
      setUserProfile(profileData);
    } catch (error) {
      console.error('Custom login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfileData = async (updates: Partial<UserProfile>) => {
    const currentId = user?.uid || userProfile?.id;
    if (!currentId) return;

    await createOrUpdateUserProfile({
      ...updates,
      id: currentId,
    });

    if (userProfile) {
      const updated = { ...userProfile, ...updates };
      setUserProfile(updated);
      if (customUser) {
        localStorage.setItem('instaking_custom_user', JSON.stringify(updated));
      }
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
      setCustomUser(null);
      setUserProfile(null);
      localStorage.removeItem('instaking_custom_user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        loginWithGoogle,
        loginWithCustomAccount,
        updateProfileData,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
