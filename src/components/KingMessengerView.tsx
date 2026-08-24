import React, { useState, useEffect, useRef } from 'react';
import {
  Crown,
  Sparkles,
  Send,
  Mic,
  Image as ImageIcon,
  Video as VideoIcon,
  Smile,
  Search,
  Plus,
  Trash2,
  X,
  Play,
  Pause,
  ChevronLeft,
  Flame,
  Zap,
  ThumbsUp,
  Heart,
  Volume2,
  ArrowDown,
  Paperclip,
  Maximize2,
  Home,
  Users,
  MessageSquare
} from 'lucide-react';
import { UserProfile, Conversation, DirectMessage } from '../types';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';

interface KingMessengerViewProps {
  currentUser: UserProfile;
  initialChatUserId?: string | null;
  onSelectUserForProfile: (userId: string) => void;
  onBackToFeed?: () => void;
}

// Neon Gold Audio Player Component
const KingAudioPlayer: React.FC<{
  audioUrl: string;
  duration?: number;
  isMine: boolean;
  senderPhotoURL?: string;
}> = ({ audioUrl, duration = 0, isMine, senderPhotoURL }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.src = audioUrl;

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Audio playback error:', err);
      });
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressRatio = totalDuration > 0 ? currentTime / totalDuration : 0;
  const barHeights = [30, 60, 95, 45, 80, 100, 70, 40, 85, 65, 35, 75, 90, 50, 65, 30, 80, 55];

  return (
    <div className="flex items-center gap-3 p-2 min-w-[210px] sm:min-w-[260px]">
      {senderPhotoURL && (
        <div className="relative flex-shrink-0">
          <img
            src={senderPhotoURL}
            alt="Voz"
            className="w-9 h-9 rounded-full object-cover border border-amber-400/60 shadow-[0_0_8px_rgba(251,191,36,0.3)]"
          />
          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border border-zinc-950 flex items-center justify-center text-zinc-950">
            <Mic className="w-2.5 h-2.5" />
          </span>
        </div>
      )}

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-90 shadow-md ${
          isMine
            ? 'bg-zinc-950 text-amber-400 hover:bg-zinc-900 border border-amber-400/40 shadow-[0_0_10px_rgba(251,191,36,0.4)]'
            : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 hover:brightness-110 shadow-[0_0_10px_rgba(251,191,36,0.5)]'
        }`}
        title={isPlaying ? 'Pausar áudio' : 'Ouvir mensagem de voz'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      {/* Sound Waves & Scrubber */}
      <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
        <div className="flex items-center gap-0.5 h-6">
          {barHeights.map((h, idx) => {
            const isPlayed = idx / barHeights.length <= progressRatio;
            return (
              <div
                key={idx}
                style={{ height: `${h}%` }}
                className={`flex-1 rounded-full transition-all duration-150 ${
                  isPlayed
                    ? isMine
                      ? 'bg-zinc-950'
                      : 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                    : isMine
                    ? 'bg-zinc-950/40'
                    : 'bg-zinc-700'
                } ${isPlaying && isPlayed ? 'animate-pulse' : ''}`}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono tracking-tight font-semibold">
          <span className={isMine ? 'text-zinc-900' : 'text-amber-300'}>
            {formatTime(currentTime)}
          </span>
          <span className={isMine ? 'text-zinc-800' : 'text-zinc-400'}>
            {formatTime(totalDuration)}
          </span>
        </div>
      </div>
    </div>
  );
};

export const KingMessengerView: React.FC<KingMessengerViewProps> = ({
  currentUser,
  initialChatUserId,
  onSelectUserForProfile,
  onBackToFeed,
}) => {
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeTargetUser, setActiveTargetUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [selectedMediaPreview, setSelectedMediaPreview] = useState<{
    url: string;
    type: 'photo' | 'video';
    file?: File;
  } | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Refs
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Toast Helper
  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  // 1. Fetch all registered users for new conversation modal & quick switcher
  useEffect(() => {
    const usersCol = collection(db, 'users');
    const unsubscribe = onSnapshot(usersCol, (snap) => {
      const list: UserProfile[] = [];
      snap.forEach((d) => {
        if (d.id !== currentUser.id) {
          list.push({ ...d.data(), id: d.id } as UserProfile);
        }
      });
      setAllUsers(list);
    });
    return () => unsubscribe();
  }, [currentUser.id]);

  // 2. Listen to user's conversations & Auto-Select first active conversation
  useEffect(() => {
    const convCol = collection(db, 'conversations');
    const q = query(
      convCol,
      where('participants', 'array-contains', currentUser.id),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Conversation[] = [];
        snapshot.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as Conversation);
        });
        setConversations(list);

        // Auto-select initial target if provided
        if (initialChatUserId) {
          const found = list.find((c) => c.participants.includes(initialChatUserId));
          if (found) {
            setActiveConvId(found.id);
            const other = found.participantDetails?.[initialChatUserId];
            if (other) {
              setActiveTargetUser({
                id: initialChatUserId,
                displayName: other.displayName,
                username: other.username,
                photoURL: other.photoURL,
                followersCount: 0,
                followingCount: 0,
                postsCount: 0,
                createdAt: '',
              });
            }
          } else {
            const target = allUsers.find((u) => u.id === initialChatUserId);
            if (target) {
              startChatWithUser(target);
            }
          }
        } else if (!activeConvId && list.length > 0) {
          const firstConv = list[0];
          setActiveConvId(firstConv.id);
          const otherId = firstConv.participants.find((p) => p !== currentUser.id);
          if (otherId && firstConv.participantDetails?.[otherId]) {
            const other = firstConv.participantDetails[otherId];
            setActiveTargetUser({
              id: otherId,
              displayName: other.displayName,
              username: other.username,
              photoURL: other.photoURL,
              followersCount: 0,
              followingCount: 0,
              postsCount: 0,
              createdAt: '',
            });
          }
        } else if (!activeConvId && list.length === 0 && allUsers.length > 0) {
          // If no conversation yet, auto prepare with the first available friend so the message box is always ready!
          const firstFriend = allUsers[0];
          startChatWithUser(firstFriend);
        }
      },
      (error) => {
        console.warn('King Messenger conversations error:', error);
      }
    );

    return () => unsubscribe();
  }, [currentUser.id, initialChatUserId, allUsers.length]);

  // 3. Listen to messages in active conversation
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }

    const messagesCol = collection(db, 'conversations', activeConvId, 'messages');
    const q = query(messagesCol, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: DirectMessage[] = [];
        snapshot.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as DirectMessage);
        });
        setMessages(list);

        // Scroll to bottom smoothly on new message
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        }, 50);
      },
      (error) => {
        console.warn('King Messenger messages error:', error);
      }
    );

    return () => unsubscribe();
  }, [activeConvId]);

  // Scroll detection to show "Scroll to Bottom" button
  const handleMessagesScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottomBtn(isFarFromBottom);
  };

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  // Start chat with user
  const startChatWithUser = async (targetUser: UserProfile) => {
    setShowNewChatModal(false);
    setActiveTargetUser(targetUser);

    // Find existing conversation
    const existing = conversations.find((c) => c.participants.includes(targetUser.id));
    if (existing) {
      setActiveConvId(existing.id);
      return;
    }

    // Create new conversation in Firestore
    try {
      const convData = {
        participants: [currentUser.id, targetUser.id],
        participantDetails: {
          [currentUser.id]: {
            displayName: currentUser.displayName,
            username: currentUser.username,
            photoURL: currentUser.photoURL,
          },
          [targetUser.id]: {
            displayName: targetUser.displayName,
            username: targetUser.username,
            photoURL: targetUser.photoURL,
          },
        },
        lastMessage: 'Conversa King iniciada 👑',
        lastSenderId: currentUser.id,
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'conversations'), convData);
      setActiveConvId(docRef.id);
      showToast(`Bate-papo King com ${targetUser.displayName}! 👑`);
    } catch (err) {
      console.error('Erro ao criar conversa King:', err);
      showToast('Não foi possível iniciar o bate-papo.');
    }
  };

  // Send Message (Text / Image / Video / Audio / Quick Crown)
  const handleSendMessage = async (
    customText?: string,
    customMediaUrl?: string,
    customMediaType?: 'photo' | 'video' | 'audio',
    audioDur?: number
  ) => {
    const textToSend = customText !== undefined ? customText : (inputText.trim() || (selectedMediaPreview ? '' : '👑'));
    const mediaToSend = customMediaUrl || selectedMediaPreview?.url;
    const mediaTypeToSend = customMediaType || selectedMediaPreview?.type || 'none';

    if (!textToSend && !mediaToSend) return;

    let targetConvId = activeConvId;

    // If no active conv yet, start with activeTargetUser or first user
    if (!targetConvId) {
      const target = activeTargetUser || (allUsers.length > 0 ? allUsers[0] : null);
      if (target) {
        try {
          const convData = {
            participants: [currentUser.id, target.id],
            participantDetails: {
              [currentUser.id]: {
                displayName: currentUser.displayName,
                username: currentUser.username,
                photoURL: currentUser.photoURL,
              },
              [target.id]: {
                displayName: target.displayName,
                username: target.username,
                photoURL: target.photoURL,
              },
            },
            lastMessage: textToSend || 'Nova mensagem 👑',
            lastSenderId: currentUser.id,
            updatedAt: new Date().toISOString(),
          };
          const docRef = await addDoc(collection(db, 'conversations'), convData);
          targetConvId = docRef.id;
          setActiveConvId(targetConvId);
          setActiveTargetUser(target);
        } catch (err) {
          console.error('Erro ao criar conversa:', err);
          showToast('Erro ao abrir conversa.');
          return;
        }
      } else {
        showToast('Escolha um contato para enviar mensagem!');
        setShowNewChatModal(true);
        return;
      }
    }

    try {
      const msgData: Partial<DirectMessage> = {
        conversationId: targetConvId,
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        senderPhotoURL: currentUser.photoURL,
        text: textToSend,
        mediaUrl: mediaToSend || '',
        mediaType: mediaTypeToSend,
        audioDuration: audioDur || 0,
        createdAt: new Date().toISOString(),
      };

      // Add to messages collection
      await addDoc(collection(db, 'conversations', targetConvId, 'messages'), msgData);

      // Update conversation last message preview
      let previewText = textToSend;
      if (mediaTypeToSend === 'audio') previewText = '🎤 Mensagem de áudio';
      else if (mediaTypeToSend === 'photo') previewText = '📷 Foto enviada';
      else if (mediaTypeToSend === 'video') previewText = '🎬 Vídeo enviado';

      await updateDoc(doc(db, 'conversations', targetConvId), {
        lastMessage: previewText,
        lastSenderId: currentUser.id,
        updatedAt: new Date().toISOString(),
      });

      // Clear input & media state
      setInputText('');
      setSelectedMediaPreview(null);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem King:', err);
      showToast('Erro ao enviar mensagem.');
    }
  };

  // React to message with Gold emojis
  const handleReactToMessage = async (msgId: string, emoji: string) => {
    if (!activeConvId) return;
    try {
      const msgRef = doc(db, 'conversations', activeConvId, 'messages', msgId);
      await updateDoc(msgRef, {
        reaction: emoji,
      });
    } catch (err) {
      console.error('Erro ao reagir à mensagem:', err);
    }
  };

  // Handle Photo/Video File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSelectedMediaPreview({
        url: result,
        type,
        file,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Audio Recording Handlers
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          handleSendMessage('', base64Audio, 'audio', recordingSeconds);
        };
        reader.readAsDataURL(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      showToast('Permissão de microfone negada.');
    }
  };

  const stopAudioRecording = (send: boolean) => {
    if (!mediaRecorderRef.current || !isRecording) return;

    clearInterval(recordingTimerRef.current);
    setIsRecording(false);

    if (send) {
      mediaRecorderRef.current.stop();
    } else {
      // Cancelled
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
      showToast('Gravação cancelada.');
    }
    setRecordingSeconds(0);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Filtered list of conversations
  const filteredConversations = conversations.filter((c) => {
    const otherId = c.participants.find((p) => p !== currentUser.id) || '';
    const details = c.participantDetails?.[otherId];
    if (!details) return false;
    const nameMatch = details.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    const userMatch = details.username.toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || userMatch;
  });

  const activeConversation = conversations.find((c) => c.id === activeConvId);
  const otherParticipantId = activeConversation?.participants.find((p) => p !== currentUser.id) || activeTargetUser?.id;
  const otherParticipantDetails =
    activeConversation?.participantDetails?.[otherParticipantId || ''] ||
    (activeTargetUser
      ? {
          displayName: activeTargetUser.displayName,
          username: activeTargetUser.username,
          photoURL: activeTargetUser.photoURL,
        }
      : (allUsers.length > 0 ? {
          displayName: allUsers[0].displayName,
          username: allUsers[0].username,
          photoURL: allUsers[0].photoURL,
        } : null));

  const kingReactions = ['👑', '🔥', '❤️', '👍', '😂', '⚡'];

  return (
    <div
      id="king-messenger-root"
      style={{
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
      }}
      className="w-full max-w-6xl mx-auto h-[100dvh] md:h-[calc(100vh-2rem)] bg-[#0c0c0e] border border-amber-500/30 rounded-none md:rounded-3xl overflow-hidden shadow-[0_0_35px_rgba(245,158,11,0.2)] flex flex-col md:flex-row relative font-sans min-h-0 select-text"
    >
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#16161a] border border-amber-400/50 text-amber-300 px-4 py-2 rounded-2xl shadow-[0_0_20px_rgba(251,191,36,0.3)] text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, 'photo')}
      />
      <input
        type="file"
        ref={videoInputRef}
        accept="video/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, 'video')}
      />

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div
          onClick={() => setFullscreenImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={fullscreenImage}
              alt="Visualização King"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-amber-400/40 shadow-[0_0_30px_rgba(251,191,36,0.4)]"
            />
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute -top-3 -right-3 p-2 bg-zinc-900 text-amber-400 rounded-full border border-amber-400/50 hover:bg-zinc-800 shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ================= LEFT SIDEBAR (CONVERSATIONS) ================= */}
      <div
        className={`w-full md:w-80 lg:w-96 bg-[#121215] border-r border-amber-500/20 flex flex-col min-h-0 ${
          activeConvId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* King Header */}
        <div className="p-3.5 sm:p-4 border-b border-amber-500/20 bg-gradient-to-r from-amber-500/15 via-yellow-500/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {onBackToFeed && (
              <button
                onClick={onBackToFeed}
                className="md:hidden p-1.5 -ml-1 text-amber-400 hover:text-amber-300 hover:bg-zinc-800/80 rounded-xl transition-colors"
                title="Voltar para o Feed"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.5)] flex-shrink-0">
              <Crown className="w-5 h-5 text-zinc-950 drop-shadow" />
            </div>
            <div>
              <h2 className="text-base font-extrabold bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent tracking-wide font-serif">
                King Messenger
              </h2>
              <span className="text-[10px] text-amber-400/80 font-bold uppercase tracking-wider block -mt-0.5">
                Dourado Neon VIP
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowNewChatModal(true)}
            className="p-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-300 rounded-xl border border-amber-400/40 shadow-[0_0_10px_rgba(251,191,36,0.2)] transition-all active:scale-95 flex items-center gap-1 text-xs font-bold"
            title="Nova Conversa King"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nova Conversa</span>
          </button>
        </div>

        {/* Quick Contacts Avatars Bar (Horizontal Scroll) */}
        {allUsers.length > 0 && (
          <div className="px-3 py-2.5 border-b border-amber-500/15 bg-[#141418] overflow-x-auto flex items-center gap-3 scrollbar-none">
            <span className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider whitespace-nowrap flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              VIPs:
            </span>
            {allUsers.map((u) => {
              const isCurrent = activeTargetUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => startChatWithUser(u)}
                  className="flex flex-col items-center gap-1 flex-shrink-0 group"
                  title={`Conversar com ${u.displayName}`}
                >
                  <div className="relative">
                    <img
                      src={u.photoURL}
                      alt={u.displayName}
                      className={`w-9 h-9 rounded-full object-cover border-2 transition-all group-hover:scale-110 ${
                        isCurrent
                          ? 'border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]'
                          : 'border-amber-500/30'
                      }`}
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-zinc-950"></span>
                  </div>
                  <span className="text-[9px] text-zinc-400 group-hover:text-amber-300 truncate max-w-[48px]">
                    {u.displayName.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Search Bar */}
        <div className="p-3 border-b border-amber-500/10">
          <div className="relative">
            <Search className="w-4 h-4 text-amber-400/60 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar mensagens ou amigos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#18181d] border border-amber-500/20 focus:border-amber-400/60 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-400/40 transition-all"
            />
          </div>
        </div>

        {/* Conversations List with Ultra Smooth Native Touch Scroll */}
        <div
          style={{
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
          }}
          className="flex-1 min-h-0 overflow-y-auto divide-y divide-amber-500/10"
        >
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-400/30 flex items-center justify-center mx-auto text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]">
                <Crown className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-zinc-300">Nenhuma conversa anterior.</p>
              <p className="text-[11px] text-zinc-500">
                Toque em qualquer amigo acima ou crie uma nova conversa!
              </p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 rounded-xl text-xs font-bold shadow-md hover:brightness-110 transition-all"
              >
                Escolher Amigo
              </button>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-zinc-400 text-xs">
              Nenhuma conversa encontrada com "{searchQuery}".
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const otherId = conv.participants.find((p) => p !== currentUser.id) || '';
              const other = conv.participantDetails?.[otherId];
              const isActive = conv.id === activeConvId;

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    setActiveConvId(conv.id);
                    if (other) {
                      setActiveTargetUser({
                        id: otherId,
                        displayName: other.displayName,
                        username: other.username,
                        photoURL: other.photoURL,
                        followersCount: 0,
                        followingCount: 0,
                        postsCount: 0,
                        createdAt: '',
                      });
                    }
                  }}
                  className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all ${
                    isActive
                      ? 'bg-[#22201c] border-l-4 border-amber-400 text-white shadow-inner'
                      : 'hover:bg-[#18181d] text-zinc-300'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={other?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                      alt={other?.displayName || 'Amigo'}
                      className={`w-11 h-11 rounded-full object-cover border-2 ${
                        isActive ? 'border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]' : 'border-amber-500/30'
                      }`}
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#121215] shadow-sm"></span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4
                        className={`text-xs font-bold truncate ${
                          isActive ? 'text-amber-300' : 'text-zinc-200'
                        }`}
                      >
                        {other?.displayName || 'Usuário'}
                      </h4>
                      <span className="text-[10px] text-zinc-500">
                        {conv.updatedAt
                          ? new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5 flex items-center gap-1">
                      {conv.lastSenderId === currentUser.id && (
                        <span className="text-amber-400 font-semibold">Você:</span>
                      )}
                      <span>{conv.lastMessage || 'Conversa iniciada'}</span>
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ================= RIGHT MAIN (CHAT WINDOW) ================= */}
      <div
        className={`flex-1 flex flex-col h-full bg-[#0c0c0e] relative min-h-0 ${
          !activeConvId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {otherParticipantDetails ? (
          <>
            {/* Top Chat Header */}
            <div className="px-3.5 sm:px-4 py-3 bg-[#121215] border-b border-amber-500/20 flex items-center justify-between z-10 shadow-md flex-shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setActiveConvId(null);
                    if (onBackToFeed && window.innerWidth < 768) {
                      onBackToFeed();
                    }
                  }}
                  className="md:hidden p-1.5 -ml-1 text-amber-400 hover:text-amber-300 rounded-lg hover:bg-zinc-800 transition-colors"
                  title="Voltar"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <div
                  onClick={() => otherParticipantId && onSelectUserForProfile(otherParticipantId)}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={otherParticipantDetails.photoURL}
                      alt={otherParticipantDetails.displayName}
                      className="w-10 h-10 rounded-full object-cover border-2 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.4)] group-hover:scale-105 transition-transform"
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#121215]"></span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs sm:text-sm font-bold text-zinc-100 group-hover:text-amber-300 transition-colors">
                        {otherParticipantDetails.displayName}
                      </h3>
                      <Crown className="w-3 h-3 text-amber-400" />
                    </div>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                      Online no King Messenger
                    </span>
                  </div>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="p-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-xl transition-all"
                  title="Trocar de conversa"
                >
                  <Users className="w-4 h-4" />
                </button>
                <button
                  onClick={() => otherParticipantId && onSelectUserForProfile(otherParticipantId)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-300 text-xs font-bold transition-all flex items-center gap-1"
                >
                  <span>Perfil</span>
                </button>
              </div>
            </div>

            {/* Media Upload Preview Banner (if attached) */}
            {selectedMediaPreview && (
              <div className="bg-[#18181d] border-b border-amber-500/30 p-3 flex items-center justify-between gap-3 animate-in slide-in-from-top flex-shrink-0">
                <div className="flex items-center gap-3">
                  {selectedMediaPreview.type === 'photo' ? (
                    <img
                      src={selectedMediaPreview.url}
                      alt="Prévia"
                      className="w-14 h-14 object-cover rounded-xl border border-amber-400/50"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-amber-400/50 flex items-center justify-center text-amber-400">
                      <VideoIcon className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-amber-300">
                      {selectedMediaPreview.type === 'photo' ? 'Foto pronta para envio' : 'Vídeo pronto para envio'}
                    </p>
                    <p className="text-[10px] text-zinc-400">Toque na seta dourada ou digite uma legenda!</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMediaPreview(null)}
                  className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full"
                  title="Remover anexo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Messages Thread Container (Ultra Smooth Scroll & Pan-Y) */}
            <div
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
              style={{
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y',
              }}
              className="flex-1 min-h-0 w-full overflow-y-auto p-3 sm:p-4 space-y-3 bg-[#0c0c0e] relative"
            >
              {/* Header profile badge inside chat */}
              <div className="flex flex-col items-center justify-center py-6 text-center border-b border-amber-500/10 mb-4">
                <div className="relative mb-2">
                  <img
                    src={otherParticipantDetails.photoURL}
                    alt={otherParticipantDetails.displayName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)]"
                  />
                  <span className="absolute -top-2 -right-2 p-1 bg-gradient-to-tr from-amber-500 to-yellow-400 text-zinc-950 rounded-full shadow-md">
                    <Crown className="w-3.5 h-3.5" />
                  </span>
                </div>
                <h4 className="font-extrabold text-sm text-zinc-100">{otherParticipantDetails.displayName}</h4>
                <p className="text-xs text-amber-400/80 mb-3">Conectados no King Messenger</p>
                <button
                  onClick={() => otherParticipantId && onSelectUserForProfile(otherParticipantId)}
                  className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-amber-300 text-xs font-semibold rounded-full border border-amber-400/30 transition-colors shadow-sm"
                >
                  Ver Perfil Completo
                </button>
              </div>

              {/* Messages list */}
              {messages.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 space-y-2">
                  <Sparkles className="w-8 h-8 text-amber-400 mx-auto animate-bounce" />
                  <p className="text-xs font-semibold text-zinc-200">Nenhuma mensagem nesta conversa ainda.</p>
                  <p className="text-[11px] text-zinc-500">Envie um "Oi!", uma foto ou um áudio usando a barra abaixo!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === currentUser.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} group relative`}
                    >
                      <div className="flex items-end gap-1.5 sm:gap-2 max-w-[85%] sm:max-w-md">
                        {!isMine && (
                          <img
                            src={msg.senderPhotoURL || otherParticipantDetails.photoURL}
                            alt={msg.senderName}
                            className="w-7 h-7 rounded-full object-cover border border-amber-500/40 flex-shrink-0 mb-1"
                          />
                        )}

                        <div className="flex flex-col gap-1">
                          {/* Message Bubble */}
                          <div
                            className={`relative px-3.5 py-2.5 text-xs sm:text-sm break-words transition-all ${
                              isMine
                                ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-zinc-950 font-medium rounded-2xl rounded-tr-xs shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                                : 'bg-[#18181d] border border-amber-500/25 text-zinc-100 rounded-2xl rounded-tl-xs shadow-md'
                            }`}
                          >
                            {/* Photo Content */}
                            {msg.mediaType === 'photo' && msg.mediaUrl && (
                              <div className="mb-2 rounded-xl overflow-hidden relative group/img">
                                <img
                                  src={msg.mediaUrl}
                                  alt="Mídia"
                                  onClick={() => setFullscreenImage(msg.mediaUrl!)}
                                  className="max-h-64 sm:max-h-80 w-auto object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                                />
                                <button
                                  onClick={() => setFullscreenImage(msg.mediaUrl!)}
                                  className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity"
                                  title="Expandir foto"
                                >
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            {/* Video Content */}
                            {msg.mediaType === 'video' && msg.mediaUrl && (
                              <div className="mb-2 rounded-xl overflow-hidden border border-amber-400/30">
                                <video
                                  src={msg.mediaUrl}
                                  controls
                                  className="max-h-64 sm:max-h-80 w-full rounded-xl bg-black"
                                />
                              </div>
                            )}

                            {/* Audio Message Content */}
                            {msg.mediaType === 'audio' && msg.mediaUrl && (
                              <KingAudioPlayer
                                audioUrl={msg.mediaUrl}
                                duration={msg.audioDuration}
                                isMine={isMine}
                                senderPhotoURL={msg.senderPhotoURL}
                              />
                            )}

                            {/* Text Content */}
                            {msg.text && (
                              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                            )}

                            {/* Reaction Badge on Message */}
                            {msg.reaction && (
                              <div className="absolute -bottom-2.5 right-2 px-1.5 py-0.5 bg-[#18181d] border border-amber-400/40 rounded-full text-xs shadow-lg flex items-center gap-0.5">
                                <span>{msg.reaction}</span>
                              </div>
                            )}
                          </div>

                          {/* Quick Reaction Bar on Hover/Tap */}
                          <div
                            className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-1 mt-0.5 ${
                              isMine ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {msg.createdAt
                                ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : ''}
                            </span>
                            <div className="flex items-center gap-0.5 bg-[#16161a] border border-amber-500/30 rounded-full px-1 py-0.5 shadow-sm">
                              {kingReactions.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReactToMessage(msg.id, emoji)}
                                  className="text-xs hover:scale-125 transition-transform px-0.5"
                                  title={`Reagir com ${emoji}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Floating Scroll to Bottom Button */}
            {showScrollBottomBtn && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-20 right-6 z-20 p-2.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 shadow-[0_0_15px_rgba(251,191,36,0.5)] hover:scale-110 transition-all font-bold"
                title="Descer para a mensagem mais recente"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            )}

            {/* ================= INPUT TOOLBAR (AUDIO, MEDIA, TEXT & SEND ARROW) ================= */}
            <div className="p-2.5 sm:p-3 bg-[#121215] border-t border-amber-500/20 z-10 shadow-lg flex-shrink-0">
              {isRecording ? (
                /* Active Recording Mode */
                <div className="flex items-center justify-between gap-3 bg-[#1a1a1f] border border-amber-400/40 rounded-2xl p-2 px-3 sm:px-4 shadow-[0_0_15px_rgba(251,191,36,0.25)] animate-pulse">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
                    <span className="text-xs font-bold text-amber-300 font-mono">
                      Gravando: {formatTimer(recordingSeconds)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => stopAudioRecording(false)}
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-red-400 rounded-xl transition-colors"
                      title="Cancelar gravação"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => stopAudioRecording(true)}
                      className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 rounded-xl text-xs font-bold shadow-md hover:brightness-110 flex items-center gap-1.5 transition-transform active:scale-95"
                      title="Enviar áudio gravado"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar Áudio</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Standard Message Input with Send Arrow */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-1.5 sm:gap-2"
                >
                  {/* Media Buttons (Photo & Video) */}
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-xl transition-colors"
                      title="Enviar foto / imagem"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      className="p-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-xl transition-colors"
                      title="Enviar vídeo"
                    >
                      <VideoIcon className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Text Input Box */}
                  <div className="flex-1 relative flex items-center">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Mensagem King..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="w-full bg-[#1a1a1f] border border-amber-500/25 focus:border-amber-400/70 rounded-2xl px-3 sm:px-4 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-400/40 transition-all pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setInputText((prev) => prev + ' 👑')}
                      className="absolute right-2.5 text-amber-400 hover:scale-125 transition-transform"
                      title="Adicionar coroa"
                    >
                      <Crown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Voice Record Button */}
                  <button
                    type="button"
                    onClick={startAudioRecording}
                    className="p-2.5 bg-[#1a1a1f] border border-amber-500/30 hover:border-amber-400 text-amber-400 hover:text-amber-300 rounded-2xl hover:bg-amber-500/10 transition-all shadow-sm flex-shrink-0"
                    title="Gravar mensagem de voz / áudio"
                  >
                    <Mic className="w-5 h-5" />
                  </button>

                  {/* SETA DOURADA NEON DE ENVIO (SEND ARROW / SÉTIMA) */}
                  <button
                    type="submit"
                    className="p-2.5 rounded-2xl font-bold flex items-center justify-center transition-all bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-zinc-950 shadow-[0_0_15px_rgba(251,191,36,0.6)] hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0"
                    title="Mandar mensagem com a seta dourada"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              )}
            </div>
          </>
        ) : (
          /* Empty state / Welcome Screen with Quick Contact Launch */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-400 max-w-md mx-auto">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-yellow-500/20 to-amber-600/20 border border-amber-400/40 flex items-center justify-center mb-4 text-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.3)]">
              <Crown className="w-10 h-10 drop-shadow" />
            </div>
            <h3 className="text-xl font-extrabold bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent mb-1 font-serif">
              King Messenger Dourado Neon
            </h3>
            <p className="text-xs text-zinc-400 mb-6">
              Bate-papo VIP em tempo real. Envie mensagens com a seta dourada, áudios de voz, fotos e vídeos.
            </p>

            {allUsers.length > 0 ? (
              <div className="w-full space-y-2">
                <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider text-left mb-2">
                  Escolha um amigo para conversar:
                </p>
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {allUsers.slice(0, 6).map((u) => (
                    <button
                      key={u.id}
                      onClick={() => startChatWithUser(u)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#16161a] hover:bg-[#202026] border border-amber-500/20 hover:border-amber-400/50 transition-all group text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={u.photoURL}
                          alt={u.displayName}
                          className="w-8 h-8 rounded-full object-cover border border-amber-400 shadow-sm"
                        />
                        <span className="text-xs font-bold text-zinc-200 group-hover:text-amber-300">
                          {u.displayName}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-400/30 group-hover:bg-amber-500/20">
                        Conversar
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewChatModal(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 rounded-2xl text-xs font-extrabold shadow-[0_0_20px_rgba(251,191,36,0.4)] hover:scale-105 transition-all"
              >
                Iniciar Novo Bate-papo
              </button>
            )}
          </div>
        )}
      </div>

      {/* ================= MODAL: NOVA CONVERSA COM AMIGOS ================= */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#141418] border border-amber-500/40 rounded-3xl p-5 shadow-[0_0_35px_rgba(251,191,36,0.25)] space-y-4">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-zinc-100">Nova Conversa King</h3>
              </div>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Selecione um usuário para abrir o bate-papo VIP Dourado Neon:
            </p>

            <div
              style={{
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y',
              }}
              className="max-h-72 overflow-y-auto space-y-2 pr-1"
            >
              {allUsers.length === 0 ? (
                <p className="text-xs text-center py-6 text-zinc-500">Nenhum outro usuário cadastrado no momento.</p>
              ) : (
                allUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => startChatWithUser(u)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#1a1a20] hover:bg-[#25252e] border border-amber-500/20 hover:border-amber-400/60 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={u.photoURL}
                        alt={u.displayName}
                        className="w-10 h-10 rounded-full object-cover border border-amber-400 shadow-sm"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-zinc-200">{u.displayName}</h4>
                        <span className="text-[10px] text-zinc-400">@{u.username}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-400/30">
                      Iniciar
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
