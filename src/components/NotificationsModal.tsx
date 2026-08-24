import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, UserPlus, Send, Crown, CheckCheck, X } from 'lucide-react';
import { AppNotification, UserProfile } from '../types';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, markNotificationAsRead } from '../lib/firebase';

interface NotificationsModalProps {
  currentUser: UserProfile;
  onClose: () => void;
  onSelectUser: (userId: string) => void;
  onOpenDirectChat: (userId: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  currentUser,
  onClose,
  onSelectUser,
  onOpenDirectChat,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    const notifsCol = collection(db, 'notifications');
    const q = query(
      notifsCol,
      where('recipientId', '==', currentUser.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: AppNotification[] = [];
        snapshot.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as AppNotification);
        });
        setNotifications(list);
      },
      (err) => {
        console.warn('Notifications snapshot error:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUser.id]);

  const handleMarkAllRead = async () => {
    notifications.forEach((n) => {
      if (!n.read) {
        markNotificationAsRead(n.id);
      }
    });
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-amber-400 fill-amber-400" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-purple-400" />;
      case 'direct':
        return <Send className="w-4 h-4 text-sky-400 fill-sky-400" />;
      default:
        return <Crown className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-4 md:py-6">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
            <h2 className="font-bold text-base text-zinc-100 font-serif">Notificações</h2>
          </div>
          {notifications.some((n) => !n.read) && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Marcar todas como lidas</span>
            </button>
          )}
        </div>

        {/* List */}
        <div className="divide-y divide-zinc-900 max-h-[70vh] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-center py-16 px-4 text-zinc-500 text-xs">
              <div className="w-14 h-14 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-3 text-rose-500">
                <Heart className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-zinc-300 text-sm mb-1">Nenhuma notificação nova</h3>
              <p className="max-w-xs mx-auto">
                Quando alguém curtir, comentar ou te enviar uma mensagem no PV, você verá aqui!
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.read) markNotificationAsRead(notif.id);
                  if (notif.type === 'direct') {
                    onOpenDirectChat(notif.senderId);
                  } else {
                    onSelectUser(notif.senderId);
                  }
                }}
                className={`flex items-center justify-between p-4 hover:bg-zinc-900/60 cursor-pointer transition-colors ${
                  !notif.read ? 'bg-amber-500/5' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex-shrink-0">
                    <img
                      src={notif.senderPhotoURL}
                      alt={notif.senderName}
                      className="w-11 h-11 rounded-full object-cover border border-zinc-800"
                    />
                    <div className="absolute -bottom-1 -right-1 p-1 bg-zinc-950 rounded-full shadow-md">
                      {getIcon(notif.type)}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs text-zinc-200">
                      <span className="font-bold text-zinc-100 mr-1">{notif.senderUsername}</span>
                      <span className="text-zinc-300">{notif.message}</span>
                    </p>
                    <span className="text-[10px] text-zinc-500">
                      {new Date(notif.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {!notif.read && (
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0 ml-2" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
