'use client';
import { useEffect, useRef } from 'react';
import {
  collection, query, orderBy, limit,
  addDoc, serverTimestamp,
  doc, setDoc, deleteDoc, onSnapshot as firestoreOnSnapshot,
} from 'firebase/firestore';
import { ref, set, onValue, onDisconnect, remove, serverTimestamp as rtTs } from 'firebase/database';
import { db, rtdb } from '@/services/firebase';
import { useChatStore } from '@/services/store/chat.store';
import { useAuthStore } from '@/services/store/auth.store';
import type { Message } from '@/types';

// ── Presence ──────────────────────────────────────────────────────────────
export function usePresence() {
  const { user } = useAuthStore();
  const { setOnlineUsers } = useChatStore();

  useEffect(() => {
    if (!user) return;
    const presRef = ref(rtdb, `presence/${user.id}`);
    set(presRef, { uid: user.id, name: user.full_name, avatar: user.profile_picture_url || null, lastSeen: Date.now() });
    onDisconnect(presRef).remove();

    const allRef = ref(rtdb, 'presence');
    const unsub = onValue(allRef, (snap) => {
      setOnlineUsers(snap.val() || {});
    });

    return () => {
      unsub();
      remove(presRef);
    };
  }, [user, setOnlineUsers]);
}

// ── Typing indicator ──────────────────────────────────────────────────────
export function useTyping(conversationId: string | null) {
  const { user } = useAuthStore();
  const { setTyping } = useChatStore();
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!conversationId) return;
    const typRef = collection(db, 'conversations', conversationId, 'typing');
    const unsub = firestoreOnSnapshot(typRef, (snap) => {
      const names = snap.docs
        .filter((d) => d.id !== user?.id)
        .map((d) => d.data().name as string);
      setTyping(conversationId, names);
    });
    return unsub;
  }, [conversationId, user, setTyping]);

  const sendTyping = async () => {
    if (!conversationId || !user) return;
    await setDoc(doc(db, 'conversations', conversationId, 'typing', user.id), {
      name: user.full_name, ts: serverTimestamp(),
    });
    clearTimeout(timeout.current);
    timeout.current = setTimeout(async () => {
      await deleteDoc(doc(db, 'conversations', conversationId, 'typing', user.id));
    }, 2500);
  };

  return { sendTyping };
}

// ── Realtime messages via Firestore ────────────────────────────────────────
export function useFirestoreMessages(conversationId: string | null) {
  const { addMessage, updateLastMessage } = useChatStore();

  useEffect(() => {
    if (!conversationId) return;
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );
    const unsub = firestoreOnSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const msg: Message = {
            id: change.doc.id,
            conversationId,
            senderId: data.senderId,
            sender: { id: data.senderId, full_name: data.senderName, email: '', profile_picture_url: data.senderAvatar, is_verified: true, is_2fa_enabled: false },
            content: data.content,
            type: data.type || 'text',
            media_url: data.media_url,
            isRead: data.isRead ?? false,
            createdAt: new Date(data.createdAt?.toMillis?.() || Date.now()).toISOString(),
            firestoreId: change.doc.id,
          };
          addMessage(conversationId, msg);
          updateLastMessage(conversationId, msg);
        }
      });
    });
    return unsub;
  }, [conversationId, addMessage, updateLastMessage]);
}

// ── Mirror a message to Firestore (called after API save) ─────────────────
export async function mirrorToFirestore(conversationId: string, msg: Message) {
  await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
    senderId: msg.senderId,
    senderName: msg.sender?.full_name || '',
    senderAvatar: msg.sender?.profile_picture_url || null,
    content: msg.content,
    type: msg.type,
    fileUrl: msg.fileUrl || null,
    isRead: false,
    createdAt: serverTimestamp(),
  });
}