import { firestore } from '../configs/firebase';
import { Timestamp } from 'firebase-admin/firestore';

export const markMessageAsRead = async (messageId: string, userId: string, conversationId: string) => {
  const docRef = firestore.collection('message_reads').doc(`${messageId}_${userId}`);
  await docRef.set({
    messageId,
    userId,
    conversationId,
    readAt: Timestamp.now(),
  });
};

export const getReadReceipts = async (messageId: string) => {
  const snapshot = await firestore.collection('message_reads').where('messageId', '==', messageId).get();
  return snapshot.docs.map(doc => doc.data());
};