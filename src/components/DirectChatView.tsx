import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Image as ImageIcon,
  Camera,
  Search,
  UserPlus,
  Crown,
  Smile,
  X,
  Phone,
  Video as VideoIcon,
  Info,
  MoreVertical,
  CheckCheck,
  SquarePen,
  ChevronDown,
  Heart,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  PhoneOff,
  UserCheck,
  Check,
  Sparkles,
  ArrowLeft,
  MessageCircle,
  Plus,
  Trash2,
  Ban,
  BellOff,
  Bell,
  Flag,
  AlertTriangle,
  Lock,
  Unlock,
  Share2
} from 'lucide-react';
import { Conversation, DirectMessage, UserProfile } from '../types';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  doc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import {
  db,
  getOrCreateConversation,
  sendDirectMessage,
  reactToDirectMessage,
  deleteConversation,
  blockUser,
  unblockUser,
  checkIfBlocked,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import { compressImage, processVideoFile } from '../utils/mediaUtils';
import confetti from 'canvas-confetti';

interface DirectChatViewProps {
  currentUser: UserProfile;
  initialChatUserId?: string | null;
  onSelectUserForProfile: (userId: string) => void;
}

interface UserNote {
  id: string;
  userId: string;
  text: string;
  userDisplayName: string;
  userPhotoURL: string;
  createdAt: string;
}

export const DirectChatView: React.FC<DirectChatViewProps> = ({
  currentUser,
  initialChatUserId,
  onSelectUserForProfile,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [myNoteText, setMyNoteText] = useState('');
  const [realNotes, setRealNotes] = useState<UserNote[]>([]);
  const [mediaAttachment, setMediaAttachment] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'photo' | 'video' | 'audio' | 'none'>('none');
  const [sending, setSending] = useState(false);
  const [activeTabFolder, setActiveTabFolder] = useState<'primary' | 'general' | 'requests'>('primary');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Chat management state (Block, Delete, Mute, Details)
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const [isMutedMessages, setIsMutedMessages] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Call simulation state
  const [activeCall, setActiveCall] = useState<'audio' | 'video' | null>(null);
  const [callStatus, setCallStatus] = useState<'calling' | 'connected'>('calling');
  const [callDuration, setCallDuration] = useState(0);
  const [isCallMuted, setIsCallMuted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  // 1. Load all real users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersCol = collection(db, 'users');
        const snap = await getDocs(usersCol);
        const usersList: UserProfile[] = [];
        snap.forEach((d) => {
          if (d.id !== currentUser.id) {
            usersList.push({ id: d.id, ...d.data() } as UserProfile);
          }
        });
        setAllUsers(usersList);
      } catch (err) {
        console.warn('Error loading users:', err);
      }
    };
    fetchUsers();
  }, [currentUser.id]);

  // 2. Real-time listener for Real Notes in Firestore
  useEffect(() => {
    const notesCol = collection(db, 'notes');
    const unsubscribe = onSnapshot(
      notesCol,
      (snapshot) => {
        const notesList: UserNote[] = [];
        snapshot.forEach((d) => {
          notesList.push({ id: d.id, ...d.data() } as UserNote);
        });
        setRealNotes(notesList);

        const myExisting = notesList.find((n) => n.userId === currentUser.id);
        if (myExisting) {
          setMyNoteText(myExisting.text);
        }
      },
      (err) => {
        console.warn('Notes listener error:', err);
      }
    );
    return () => unsubscribe();
  }, [currentUser.id]);

  // 3. Real-time listener for user's conversations
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

        if (initialChatUserId && !activeConvId) {
          const target = allUsers.find((u) => u.id === initialChatUserId);
          if (target) {
            startChatWithUser(target);
          }
        }
      },
      (error) => {
        console.warn('Conversations listener:', error);
      }
    );

    return () => unsubscribe();
  }, [currentUser.id, initialChatUserId, allUsers]);

  // 4. Real-time listener for messages in active conversation
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }

    const msgCol = collection(db, `conversations/${activeConvId}/messages`);
    const q = query(msgCol, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: DirectMessage[] = [];
        snapshot.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as DirectMessage);
        });
        setMessages(list);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      },
      (error) => {
        console.warn('Messages error:', error);
      }
    );

    return () => unsubscribe();
  }, [activeConvId]);

  // Check if active user is blocked
  const activeConversation = conversations.find((c) => c.id === activeConvId);
  const otherParticipantId = activeConversation?.participants.find((p) => p !== currentUser.id);
  const otherParticipantDetails =
    otherParticipantId && activeConversation?.participantDetails
      ? activeConversation.participantDetails[otherParticipantId]
      : null;

  useEffect(() => {
    if (otherParticipantId) {
      checkIfBlocked(currentUser.id, otherParticipantId).then((isBlocked) => {
        setIsUserBlocked(isBlocked);
      });
    } else {
      setIsUserBlocked(false);
    }
  }, [otherParticipantId, currentUser.id]);

  // Voice recording simulation timer
  useEffect(() => {
    if (isRecordingVoice) {
      setRecordingSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [isRecordingVoice]);

  // Call timer simulation
  useEffect(() => {
    if (activeCall) {
      setCallDuration(0);
      setCallStatus('calling');
      const connectTimeout = setTimeout(() => {
        setCallStatus('connected');
      }, 2500);

      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      return () => {
        clearTimeout(connectTimeout);
        if (callTimerRef.current) clearInterval(callTimerRef.current);
      };
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    }
  }, [activeCall]);

  // File attach handler with compression
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const isVid = file.type.startsWith('video/');
      if (isVid) {
        setMediaType('video');
        const processed = await processVideoFile(file);
        setMediaAttachment(processed.url);
      } else {
        setMediaType('photo');
        const compressed = await compressImage(file, 900, 900, 0.75);
        setMediaAttachment(compressed);
      }
    } catch (err) {
      console.error('Error attaching file:', err);
    } finally {
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    if (isUserBlocked) {
      showToast('Desbloqueie o usuário para enviar mensagens.');
      return;
    }

    const textToSend = customText !== undefined ? customText : inputText.trim();
    if ((!textToSend && !mediaAttachment) || !activeConvId || !otherParticipantId) return;

    setSending(true);
    try {
      await sendDirectMessage(
        activeConvId,
        currentUser,
        otherParticipantId,
        textToSend,
        mediaAttachment || undefined,
        mediaType
      );
      setInputText('');
      setMediaAttachment(null);
      setMediaType('none');
      setShowEmojiPicker(false);
    } catch (err) {
      console.error('Send message error:', err);
    } finally {
      setSending(false);
    }
  };

  const handleSendHeart = () => {
    handleSendMessage(undefined, '❤️');
  };

  const handleFinishVoiceRecording = async () => {
    if (!activeConvId || !otherParticipantId || isUserBlocked) return;
    setIsRecordingVoice(false);
    const duration = Math.max(1, recordingSeconds);
    try {
      await sendDirectMessage(
        activeConvId,
        currentUser,
        otherParticipantId,
        '🎤 Mensagem de voz',
        'audio-voice-memo',
        'audio',
        duration
      );
      showToast('Mensagem de áudio enviada!');
    } catch (err) {
      console.error('Send audio memo error:', err);
    }
  };

  const handleReactToMessage = async (msgId: string, emoji: string) => {
    if (!activeConvId) return;
    try {
      await reactToDirectMessage(activeConvId, msgId, emoji);
      confetti({ particleCount: 15, spread: 45, origin: { y: 0.8 } });
    } catch (err) {
      console.error(err);
    }
  };

  // EXCLUIR CONVERSA DO PV
  const handleDeleteConversation = async () => {
    if (!activeConvId) return;
    try {
      await deleteConversation(activeConvId);
      setActiveConvId(null);
      setShowDeleteConfirm(false);
      setShowDetailsDrawer(false);
      showToast('Bate-papo excluído do seu Direct.');
    } catch (err) {
      console.error('Delete conv error:', err);
    }
  };

  // BLOQUEAR / DESBLOQUEAR USUÁRIO
  const handleToggleBlockUser = async () => {
    if (!otherParticipantId) return;
    try {
      if (isUserBlocked) {
        await unblockUser(currentUser.id, otherParticipantId);
        setIsUserBlocked(false);
        showToast('Usuário desbloqueado.');
      } else {
        await blockUser(currentUser.id, otherParticipantId);
        setIsUserBlocked(true);
        showToast('Usuário bloqueado com sucesso.');
      }
      setShowBlockConfirm(false);
    } catch (err) {
      console.error('Block user error:', err);
    }
  };

  // Salvar nota real no Firestore
  const handleSaveNote = async () => {
    try {
      if (myNoteText.trim()) {
        await setDoc(doc(db, 'notes', currentUser.id), {
          userId: currentUser.id,
          text: myNoteText.trim(),
          userDisplayName: currentUser.displayName,
          userPhotoURL: currentUser.photoURL,
          createdAt: new Date().toISOString()
        });
        showToast('Nota compartilhada!');
      } else {
        await deleteDoc(doc(db, 'notes', currentUser.id));
        showToast('Nota removida.');
      }
      setShowNotesModal(false);
    } catch (err) {
      console.error('Save note error:', err);
    }
  };

  const startChatWithUser = async (user: UserProfile) => {
    try {
      const convId = await getOrCreateConversation(currentUser, user);
      setActiveConvId(convId);
      setShowNewChatModal(false);
    } catch (err) {
      console.error('Error starting chat:', err);
    }
  };

  const filteredUsers = allUsers.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sharedMedias = messages.filter((m) => m.mediaUrl && m.mediaType !== 'audio');
  const emojisList = ['❤️', '😂', '🔥', '👏', '😍', '😮', '😢', '🙌', '💯', '👑', '🎉', '✨'];

  // Other real users with notes
  const otherUsersWithNotes = realNotes.filter((n) => n.userId !== currentUser.id);

  return (
    <div className="w-full max-w-6xl mx-auto h-[calc(100vh-7.5rem)] md:h-[calc(100vh-4.5rem)] bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row select-none relative">
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border border-zinc-700 text-zinc-100 px-4 py-2 rounded-2xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. LEFT SIDEBAR: INSTAGRAM DIRECT INBOX */}
      {/* ============================================================== */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-zinc-800/90 flex flex-col bg-zinc-950/95 ${
          activeConvId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Inbox Header */}
        <div className="px-4 py-3.5 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
            <h2 className="font-bold text-base text-zinc-100 font-sans tracking-tight">
              {currentUser.username}
            </h2>
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          </div>

          <button
            id="btn-new-direct-message"
            onClick={() => setShowNewChatModal(true)}
            className="p-2 text-zinc-200 hover:text-white hover:bg-zinc-800/80 rounded-full transition-colors"
            title="Nova Mensagem"
          >
            <SquarePen className="w-5 h-5" />
          </button>
        </div>

        {/* Real Instagram Notes Bar (Top of Conversations - Zero Mock Data) */}
        <div className="py-3 px-3 border-b border-zinc-800/60 overflow-x-auto no-scrollbar flex items-center gap-4 bg-zinc-900/20">
          {/* Current User's Real Note */}
          <div
            onClick={() => setShowNotesModal(true)}
            className="flex flex-col items-center flex-shrink-0 cursor-pointer group w-16"
          >
            <div className="relative mb-1">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-zinc-800/95 text-[10px] text-zinc-200 px-2 py-0.5 rounded-full border border-zinc-700 shadow-md whitespace-nowrap max-w-[76px] truncate">
                {myNoteText.trim() ? myNoteText : '+ Sua nota'}
              </div>
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName}
                className="w-13 h-13 rounded-full object-cover border-2 border-zinc-800 group-hover:scale-105 transition-transform"
              />
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-zinc-900 border-2 border-zinc-950 rounded-full flex items-center justify-center text-white text-[10px]">
                <Plus className="w-2.5 h-2.5" />
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 truncate w-full text-center">Sua nota</span>
          </div>

          {/* Only other REAL users who actually published a note */}
          {otherUsersWithNotes.map((note) => {
            const targetUser = allUsers.find((u) => u.id === note.userId);
            return (
              <div
                key={note.id}
                onClick={() => {
                  if (targetUser) startChatWithUser(targetUser);
                }}
                className="flex flex-col items-center flex-shrink-0 cursor-pointer group w-16"
              >
                <div className="relative mb-1">
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-zinc-800 text-[10px] text-zinc-100 px-2 py-0.5 rounded-full border border-zinc-700 shadow-md whitespace-nowrap max-w-[76px] truncate">
                    {note.text}
                  </div>
                  <img
                    src={note.userPhotoURL}
                    alt={note.userDisplayName}
                    className="w-13 h-13 rounded-full object-cover border border-zinc-700 group-hover:scale-105 transition-transform"
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-950" />
                </div>
                <span className="text-[10px] text-zinc-400 truncate w-full text-center">
                  {note.userDisplayName.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-zinc-800/60">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>
        </div>

        {/* Instagram Direct Tabs (Principal / Geral / Solicitações) */}
        <div className="flex border-b border-zinc-800 text-xs font-semibold text-zinc-400">
          <button
            onClick={() => setActiveTabFolder('primary')}
            className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
              activeTabFolder === 'primary'
                ? 'border-white text-white font-bold'
                : 'border-transparent hover:text-zinc-200'
            }`}
          >
            Principal
          </button>
          <button
            onClick={() => setActiveTabFolder('general')}
            className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
              activeTabFolder === 'general'
                ? 'border-white text-white font-bold'
                : 'border-transparent hover:text-zinc-200'
            }`}
          >
            Geral
          </button>
          <button
            onClick={() => setActiveTabFolder('requests')}
            className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
              activeTabFolder === 'requests'
                ? 'border-white text-white font-bold'
                : 'border-transparent hover:text-zinc-200'
            }`}
          >
            Solicitações (0)
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/60">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 space-y-3">
              <MessageCircle className="w-10 h-10 mx-auto text-zinc-700" />
              <p className="text-xs">Nenhuma conversa iniciada ainda.</p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-rose-600 text-white rounded-xl text-xs font-semibold shadow-md"
              >
                Enviar Mensagem
              </button>
            </div>
          ) : (
            conversations.map((conv) => {
              const otherId = conv.participants.find((p) => p !== currentUser.id);
              const other = otherId && conv.participantDetails ? conv.participantDetails[otherId] : null;
              const isActive = conv.id === activeConvId;

              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors group relative ${
                    isActive ? 'bg-zinc-900/90' : 'hover:bg-zinc-900/50'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={other?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                      alt={other?.displayName || 'Usuário'}
                      className="w-13 h-13 rounded-full object-cover border border-zinc-800"
                    />
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-zinc-950"></span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-xs text-zinc-100 truncate">
                        {other?.displayName || 'Usuário'}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {conv.updatedAt
                          ? new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : ''}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 truncate">
                      {conv.lastSenderId === currentUser.id ? 'Você: ' : ''}
                      {conv.lastMessage || 'Nova mensagem'}
                    </p>
                  </div>

                  {/* Actions on conversation */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveConvId(conv.id);
                        setShowDeleteConfirm(true);
                      }}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-full hover:bg-zinc-800"
                      title="Excluir Bate-papo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveConvId(conv.id);
                        fileInputRef.current?.click();
                      }}
                      className="p-1.5 text-zinc-500 hover:text-white rounded-full hover:bg-zinc-800"
                      title="Enviar foto rápida"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. RIGHT CHAT WINDOW: INSTAGRAM DIRECT ACTIVE CHAT */}
      {/* ============================================================== */}
      <div
        className={`flex-1 flex flex-col bg-black/95 ${
          !activeConvId ? 'hidden md:flex items-center justify-center' : 'flex'
        }`}
      >
        {activeConvId && otherParticipantDetails ? (
          <>
            {/* Top Bar */}
            <div className="px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/80 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveConvId(null)}
                  className="md:hidden p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div
                  onClick={() => otherParticipantId && onSelectUserForProfile(otherParticipantId)}
                  className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <div className="relative">
                    <img
                      src={otherParticipantDetails.photoURL}
                      alt={otherParticipantDetails.displayName}
                      className="w-10 h-10 rounded-full object-cover border border-zinc-700"
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-zinc-950"></span>
                  </div>

                  <div>
                    <div className="flex items-center gap-1">
                      <h3 className="font-bold text-xs sm:text-sm text-zinc-100">
                        {otherParticipantDetails.displayName}
                      </h3>
                      <Crown className="w-3 h-3 text-amber-400" />
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      @{otherParticipantDetails.username} • <span className="text-emerald-400 font-medium">Online agora</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons: Phone Call, Video Call, Details */}
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => setActiveCall('audio')}
                  className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                  title="Ligação de Voz"
                >
                  <Phone className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setActiveCall('video')}
                  className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                  title="Chamada de Vídeo"
                >
                  <VideoIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowDetailsDrawer(true)}
                  className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                  title="Detalhes da Conversa"
                >
                  <Info className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Block Banner if user is blocked */}
            {isUserBlocked && (
              <div className="px-4 py-2.5 bg-rose-500/10 border-b border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
                <div className="flex items-center gap-2">
                  <Ban className="w-4 h-4 text-rose-400" />
                  <span>Você bloqueou este usuário. Mensagens não serão entregues.</span>
                </div>
                <button
                  onClick={handleToggleBlockUser}
                  className="px-3 py-1 bg-rose-500 text-white font-bold rounded-lg hover:bg-rose-600 transition-colors text-xs"
                >
                  Desbloquear
                </button>
              </div>
            )}

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-zinc-950 via-zinc-950 to-black">
              {/* Profile Card inside Chat */}
              <div className="flex flex-col items-center justify-center py-6 text-center border-b border-zinc-900/80 mb-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-rose-600 p-0.5 mb-2 shadow-xl">
                  <img
                    src={otherParticipantDetails.photoURL}
                    alt={otherParticipantDetails.displayName}
                    className="w-full h-full rounded-full object-cover border-2 border-black"
                  />
                </div>
                <h4 className="font-bold text-sm text-zinc-100 flex items-center gap-1">
                  {otherParticipantDetails.displayName}
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                </h4>
                <p className="text-xs text-zinc-400 mb-3">@{otherParticipantDetails.username} • Insta King</p>
                <button
                  onClick={() => otherParticipantId && onSelectUserForProfile(otherParticipantId)}
                  className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold rounded-xl border border-zinc-700 transition-colors"
                >
                  Ver Perfil
                </button>
              </div>

              {/* Messages Flow */}
              {messages.map((msg) => {
                const isMine = msg.senderId === currentUser.id;
                const isHeartMessage = msg.text === '❤️' && !msg.mediaUrl;

                return (
                  <div
                    key={msg.id}
                    onMouseEnter={() => setHoveredMessageId(msg.id)}
                    onMouseLeave={() => setHoveredMessageId(null)}
                    className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} group relative`}
                  >
                    <div className="flex items-end gap-2 max-w-[80%] sm:max-w-md">
                      {!isMine && (
                        <img
                          src={msg.senderPhotoURL || otherParticipantDetails.photoURL}
                          alt="Avatar"
                          className="w-7 h-7 rounded-full object-cover border border-zinc-800 flex-shrink-0 mb-1"
                        />
                      )}

                      <div className="relative">
                        {/* Hover Reactions */}
                        {hoveredMessageId === msg.id && (
                          <div
                            className={`absolute -top-9 ${
                              isMine ? 'right-0' : 'left-0'
                            } bg-zinc-900/95 border border-zinc-700/80 rounded-full px-2 py-1 flex items-center gap-1.5 shadow-xl z-20 animate-in fade-in zoom-in-90 duration-150`}
                          >
                            {emojisList.slice(0, 6).map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => handleReactToMessage(msg.id, emoji)}
                                className="text-sm hover:scale-125 transition-transform"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}

                        {isHeartMessage ? (
                          <div
                            onDoubleClick={() => handleReactToMessage(msg.id, '❤️')}
                            className="text-5xl py-1 animate-bounce"
                          >
                            ❤️
                          </div>
                        ) : (
                          <div
                            onDoubleClick={() => handleReactToMessage(msg.id, '❤️')}
                            className={`px-4 py-2.5 text-xs shadow-md transition-all ${
                              isMine
                                ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-rose-600 text-white rounded-3xl rounded-br-md'
                                : 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 rounded-3xl rounded-bl-md'
                            }`}
                          >
                            {/* Media (Photo / Video / Voice memo) */}
                            {msg.mediaUrl && (
                              <div className="rounded-2xl overflow-hidden mb-2 bg-black/40">
                                {msg.mediaType === 'video' ? (
                                  <video
                                    src={msg.mediaUrl}
                                    controls
                                    playsInline
                                    onError={(e) => {
                                      const target = e.currentTarget;
                                      target.style.display = 'none';
                                    }}
                                    className="w-full max-h-60 object-cover"
                                  />
                                ) : msg.mediaType === 'audio' ? (
                                  <div className="flex items-center gap-3 p-2 bg-black/30 rounded-xl min-w-[200px]">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (playingAudioId === msg.id) {
                                          setPlayingAudioId(null);
                                        } else {
                                          setPlayingAudioId(msg.id);
                                          try {
                                            const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
                                            const osc = ctx.createOscillator();
                                            const gain = ctx.createGain();
                                            osc.type = 'sine';
                                            osc.frequency.setValueAtTime(440, ctx.currentTime);
                                            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
                                            gain.gain.setValueAtTime(0.1, ctx.currentTime);
                                            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                                            osc.connect(gain);
                                            gain.connect(ctx.destination);
                                            osc.start();
                                            osc.stop(ctx.currentTime + 0.3);
                                          } catch {}
                                          setTimeout(() => {
                                            setPlayingAudioId((curr) => (curr === msg.id ? null : curr));
                                          }, (msg.audioDuration || 3) * 1000);
                                        }
                                      }}
                                      className="w-8 h-8 rounded-full bg-white text-zinc-950 flex items-center justify-center flex-shrink-0"
                                    >
                                      {playingAudioId === msg.id ? (
                                        <Pause className="w-4 h-4" />
                                      ) : (
                                        <Play className="w-4 h-4 ml-0.5" />
                                      )}
                                    </button>
                                    <div className="flex-1">
                                      <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full bg-white transition-all duration-300 ${
                                            playingAudioId === msg.id ? 'w-full animate-pulse' : 'w-1/3'
                                          }`}
                                        />
                                      </div>
                                    </div>
                                    <span className="text-[10px] font-mono text-white/80">
                                      0:0{msg.audioDuration || 4}
                                    </span>
                                  </div>
                                ) : (
                                  <img
                                    src={msg.mediaUrl}
                                    alt="Foto"
                                    className="w-full max-h-60 object-cover cursor-pointer hover:opacity-95"
                                  />
                                )}
                              </div>
                            )}

                            {msg.text && (
                              <p className="leading-relaxed break-words font-sans text-[13px]">{msg.text}</p>
                            )}

                            <div
                              className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                                isMine ? 'text-white/70' : 'text-zinc-400'
                              }`}
                            >
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {isMine && <CheckCheck className="w-3 h-3 text-white/90" />}
                            </div>
                          </div>
                        )}

                        {msg.reaction && (
                          <div
                            onClick={() => handleReactToMessage(msg.id, msg.reaction!)}
                            className="absolute -bottom-2 right-2 bg-zinc-900 border border-zinc-700 rounded-full px-1.5 py-0.5 text-xs shadow-md cursor-pointer hover:scale-110 transition-transform z-10"
                          >
                            {msg.reaction}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Media Preview before sending */}
            {mediaAttachment && (
              <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-black overflow-hidden border border-zinc-700">
                    {mediaType === 'video' ? (
                      <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-amber-400">
                        <VideoIcon className="w-6 h-6" />
                      </div>
                    ) : (
                      <img src={mediaAttachment} alt="Preview" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <span className="text-xs text-zinc-300 font-medium">
                    {mediaType === 'video' ? 'Vídeo pronto para enviar' : 'Foto pronta para enviar'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMediaAttachment(null);
                    setMediaType('none');
                  }}
                  className="p-1 text-zinc-400 hover:text-rose-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Audio Recording Live State */}
            {isRecordingVoice && (
              <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs font-bold text-rose-400">
                    Gravando áudio: 0:0{recordingSeconds}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsRecordingVoice(false)}
                    className="p-1 text-zinc-400 hover:text-rose-400 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleFinishVoiceRecording}
                    className="px-3 py-1 bg-gradient-to-r from-amber-500 to-rose-600 text-white rounded-lg text-xs font-bold shadow-md"
                  >
                    Enviar Áudio
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* INSTAGRAM BOTTOM INPUT BAR */}
            {/* ============================================================== */}
            <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/90 relative">
              {/* Emoji Picker Menu */}
              {showEmojiPicker && (
                <div className="absolute bottom-16 left-4 bg-zinc-900 border border-zinc-700 rounded-2xl p-3 shadow-2xl grid grid-cols-6 gap-2 z-30 animate-in fade-in zoom-in-90">
                  {emojisList.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setInputText((prev) => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="text-xl hover:scale-125 transition-transform p-1"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                {/* Blue Instagram Camera Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-9 h-9 rounded-full bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center flex-shrink-0 shadow-md transition-transform hover:scale-105 active:scale-95"
                  title="Câmera / Galeria"
                >
                  <Camera className="w-5 h-5" />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Pill Container */}
                <div className="flex-1 flex items-center bg-zinc-900 border border-zinc-800 focus-within:border-zinc-700 rounded-full px-4 py-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Enviar mensagem..."
                    className="flex-1 bg-transparent text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
                  />

                  {/* Actions inside pill */}
                  <div className="flex items-center gap-2 ml-2">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="text-zinc-400 hover:text-white transition-colors"
                      title="Emojis"
                    >
                      <Smile className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-zinc-400 hover:text-white transition-colors"
                      title="Fotos"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsRecordingVoice(true)}
                      className="text-zinc-400 hover:text-white transition-colors"
                      title="Gravar Áudio"
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Heart or Send Button */}
                {inputText.trim() || mediaAttachment ? (
                  <button
                    type="submit"
                    disabled={sending}
                    className="px-4 py-2 font-bold text-xs sm:text-sm text-sky-400 hover:text-sky-300 disabled:opacity-50 transition-colors"
                  >
                    Enviar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendHeart}
                    className="p-2 text-rose-500 hover:scale-125 transition-transform"
                    title="Enviar Coração"
                  >
                    <Heart className="w-6 h-6 fill-rose-500" />
                  </button>
                )}
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-500">
            <div className="w-20 h-20 rounded-full border-2 border-zinc-800 flex items-center justify-center mb-4">
              <Send className="w-9 h-9 text-zinc-600 -rotate-45" />
            </div>
            <h3 className="text-lg font-bold text-zinc-200 mb-1">Suas Mensagens Diretas</h3>
            <p className="text-xs text-zinc-500 max-w-sm mb-6">
              Envie fotos, vídeos e mensagens privadas para seus contatos reais no Insta King.
            </p>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-950/30"
            >
              Enviar Mensagem
            </button>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 3. INSTAGRAM DETAILS DRAWER (ℹ️ INFO) */}
      {/* ============================================================== */}
      {showDetailsDrawer && otherParticipantDetails && (
        <div className="absolute inset-y-0 right-0 w-full sm:w-80 bg-zinc-950 border-l border-zinc-800 shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="font-bold text-sm text-zinc-100">Detalhes</h3>
            <button
              onClick={() => setShowDetailsDrawer(false)}
              className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* User info */}
            <div className="flex flex-col items-center text-center">
              <img
                src={otherParticipantDetails.photoURL}
                alt={otherParticipantDetails.displayName}
                className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 mb-2"
              />
              <h4 className="font-bold text-sm text-zinc-100">{otherParticipantDetails.displayName}</h4>
              <p className="text-xs text-zinc-400 mb-3">@{otherParticipantDetails.username}</p>
              <button
                onClick={() => {
                  if (otherParticipantId) onSelectUserForProfile(otherParticipantId);
                  setShowDetailsDrawer(false);
                }}
                className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-xl text-xs font-semibold border border-zinc-800"
              >
                Ver Perfil
              </button>
            </div>

            {/* Notification settings */}
            <div className="space-y-3 pt-4 border-t border-zinc-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-300 font-medium">Silenciar mensagens</span>
                <input
                  type="checkbox"
                  checked={isMutedMessages}
                  onChange={(e) => setIsMutedMessages(e.target.checked)}
                  className="rounded accent-rose-500 w-4 h-4 cursor-pointer"
                />
              </div>
            </div>

            {/* Shared Media */}
            <div className="pt-4 border-t border-zinc-800/80">
              <h5 className="text-xs font-bold text-zinc-300 mb-3">
                Fotos e vídeos ({sharedMedias.length})
              </h5>
              {sharedMedias.length === 0 ? (
                <p className="text-[11px] text-zinc-500 italic">Nenhuma foto compartilhada.</p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {sharedMedias.slice(0, 9).map((m) => (
                    <img
                      key={m.id}
                      src={m.mediaUrl}
                      alt="Shared"
                      className="w-full aspect-square object-cover rounded-lg border border-zinc-800"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Danger Actions: Block & Delete */}
            <div className="space-y-2 pt-4 border-t border-zinc-800/80">
              <button
                onClick={() => setShowBlockConfirm(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-rose-950/30 text-rose-400 text-xs font-semibold flex items-center gap-2 border border-zinc-800"
              >
                <Ban className="w-4 h-4" />
                <span>{isUserBlocked ? 'Desbloquear Usuário' : 'Bloquear no Insta King'}</span>
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-rose-950/30 text-rose-400 text-xs font-semibold flex items-center gap-2 border border-zinc-800"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Bate-papo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. CALL SIMULATION MODAL (AUDIO / VIDEO CALL) */}
      {/* ============================================================== */}
      {activeCall && otherParticipantDetails && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-6 backdrop-blur-xl animate-in fade-in">
          {/* Header */}
          <div className="text-center pt-8 space-y-2">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500 to-rose-600 p-1 mx-auto mb-3 shadow-2xl animate-pulse">
              <img
                src={otherParticipantDetails.photoURL}
                alt={otherParticipantDetails.displayName}
                className="w-full h-full rounded-full object-cover border-2 border-black"
              />
            </div>
            <h3 className="text-xl font-bold text-white">{otherParticipantDetails.displayName}</h3>
            <p className="text-xs text-amber-400 font-medium tracking-wide">
              {callStatus === 'calling'
                ? `Chamando ${activeCall === 'video' ? 'em vídeo' : 'em áudio'}...`
                : `Conectado • 0:${callDuration < 10 ? '0' + callDuration : callDuration}`}
            </p>
          </div>

          {/* Center visual for Video Call */}
          {activeCall === 'video' && (
            <div className="w-full max-w-md aspect-video bg-zinc-900 rounded-3xl border border-zinc-800 flex items-center justify-center text-zinc-500 overflow-hidden relative shadow-2xl">
              <img
                src={otherParticipantDetails.photoURL}
                alt="Camera"
                className="w-full h-full object-cover filter blur-sm opacity-60"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/40">
                <VideoIcon className="w-12 h-12 text-amber-400 mb-2 animate-bounce" />
                <span className="text-xs font-semibold">Câmera HD Insta King Ativa</span>
              </div>
            </div>
          )}

          {/* Controls Bar */}
          <div className="flex items-center gap-6 pb-10">
            <button
              onClick={() => setIsCallMuted(!isCallMuted)}
              className={`p-4 rounded-full transition-colors ${
                isCallMuted ? 'bg-rose-500 text-white' : 'bg-zinc-800 text-white hover:bg-zinc-700'
              }`}
            >
              {isCallMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            <button
              onClick={() => setActiveCall(null)}
              className="p-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-2xl hover:scale-105 active:scale-95 transition-transform"
            >
              <PhoneOff className="w-7 h-7" />
            </button>

            <button
              onClick={() => showToast('Viva-voz ativado')}
              className="p-4 rounded-full bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
            >
              <Volume2 className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. NEW CHAT MODAL */}
      {/* ============================================================== */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-zinc-100">Nova Mensagem Direta</h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-zinc-800">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar pessoas no Insta King..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/60 p-2">
              {filteredUsers.length === 0 ? (
                <p className="text-center py-8 text-xs text-zinc-500">Nenhum usuário cadastrado no momento.</p>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => startChatWithUser(user)}
                    className="flex items-center justify-between p-3 rounded-2xl hover:bg-zinc-900 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={user.photoURL}
                        alt={user.displayName}
                        className="w-11 h-11 rounded-full object-cover border border-zinc-800"
                      />
                      <div>
                        <h4 className="font-bold text-xs text-zinc-100 flex items-center gap-1">
                          {user.displayName}
                          <Crown className="w-3 h-3 text-amber-400" />
                        </h4>
                        <p className="text-[11px] text-zinc-400">@{user.username}</p>
                      </div>
                    </div>

                    <button className="px-3 py-1 bg-gradient-to-r from-amber-500 to-rose-600 text-white rounded-xl text-xs font-semibold shadow-sm">
                      Bate-papo
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. INSTAGRAM NOTES CREATION MODAL (PERSISTED IN FIRESTORE) */}
      {/* ============================================================== */}
      {showNotesModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-zinc-800 text-zinc-100 text-xs px-3 py-1 rounded-full border border-zinc-700 shadow-md">
                {myNoteText.trim() || 'Compartilhar um pensamento...'}
              </div>
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName}
                className="w-20 h-20 rounded-full object-cover border-2 border-amber-400"
              />
            </div>

            <h3 className="text-base font-bold text-zinc-100 mb-1">Sua Nota</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Sua nota ficará visível no topo do Direct para seus contatos reais por 24 horas.
            </p>

            <input
              type="text"
              maxLength={60}
              value={myNoteText}
              onChange={(e) => setMyNoteText(e.target.value)}
              placeholder="O que você está pensando?..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400 text-center mb-4"
            />

            <div className="flex gap-2 w-full">
              <button
                onClick={() => setShowNotesModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNote}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-white text-xs font-bold shadow-md"
              >
                Compartilhar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. DELETE CONVERSATION CONFIRM MODAL */}
      {/* ============================================================== */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center">
            <Trash2 className="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-zinc-100 mb-1">Excluir Bate-papo?</h3>
            <p className="text-xs text-zinc-400 mb-5">
              Esta ação excluirá permanentemente o histórico de mensagens deste bate-papo.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConversation}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 8. BLOCK USER CONFIRM MODAL */}
      {/* ============================================================== */}
      {showBlockConfirm && otherParticipantDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center">
            <Ban className="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-zinc-100 mb-1">
              {isUserBlocked ? 'Desbloquear Usuário?' : `Bloquear @${otherParticipantDetails.username}?`}
            </h3>
            <p className="text-xs text-zinc-400 mb-5">
              {isUserBlocked
                ? 'Eles poderão enviar novas mensagens e ver suas publicações novamente.'
                : 'Eles não poderão enviar mensagens, ver suas publicações ou ligar para você.'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBlockConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleToggleBlockUser}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                {isUserBlocked ? 'Desbloquear' : 'Bloquear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
