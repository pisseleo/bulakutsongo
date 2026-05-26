import { firestoreDb } from '../configs/firebase';
import { Timestamp } from 'firebase-admin/firestore';

export const markMessageAsRead = async (messageId: string, userId: string, conversationId: string) => {
  const docRef = firestoreDb.collection('message_reads').doc(`${messageId}_${userId}`);
  await docRef.set({
    messageId,
    userId,
    conversationId,
    readAt: Timestamp.now(),
  });
};

export const getReadReceipts = async (messageId: string) => {
  const snapshot = await firestoreDb.collection('message_reads').where('messageId', '==', messageId).get();
  return snapshot.docs.map(doc => doc.data());
};