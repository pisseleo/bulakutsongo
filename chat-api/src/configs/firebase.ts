import admin from 'firebase-admin';
import { logger } from './logger';
import { Bucket } from '@google-cloud/storage';
import { Messaging } from 'firebase-admin/messaging';
// ── Initialise Firebase Admin SDK once ────────────────────────────────────────
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
  logger.info('Firebase Admin SDK initialised');
}

// ── Firestore ─────────────────────────────────────────────────────────────────
export const firestoreDb = admin.firestore();
firestoreDb.settings({ ignoreUndefinedProperties: true });

// ── Firebase Storage ──────────────────────────────────────────────────────────
export const storageBucket: Bucket = admin.storage().bucket(process.env.FIREBASE_STORAGE_BUCKET);
export const fcmMessaging: Messaging = admin.messaging();

// ── Firestore collection references ──────────────────────────────────────────
export const COLLECTIONS = {
  MESSAGES: 'messages',          // real-time message sync
  PRESENCE: 'presence',          // online presence (alternative to Redis for clients)
  TYPING: 'typing',              // typing indicators
  CONVERSATIONS: 'conversations', // conversation metadata
} as const;

// ── Storage helpers ───────────────────────────────────────────────────────────

export interface UploadResult {
  url: string;
  path: string;
  size: number;
  mimeType: string;
}

export async function uploadToStorage(
  buffer: Buffer,
  destination: string,
  mimeType: string,
): Promise<UploadResult> {
  const file = storageBucket.file(destination);
  await file.save(buffer, { contentType: mimeType, resumable: false });
  await file.makePublic();
  const url = `https://storage.googleapis.com/${storageBucket.name}/${destination}`;
  return { url, path: destination, size: buffer.length, mimeType };
}

export async function deleteFromStorage(path: string): Promise<void> {
  await storageBucket.file(path).delete({ ignoreNotFound: true });
}

// ── FCM helpers ───────────────────────────────────────────────────────────────

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export async function sendPush(token: string, payload: PushPayload): Promise<void> {
  try {
    await fcmMessaging.send({
      token,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data ?? {},
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
    });
  } catch (err) {
    logger.warn(`FCM push failed for token ${token.slice(0, 20)}...: ${(err as Error).message}`);
  }
}

export async function sendMulticastPush(tokens: string[], payload: PushPayload): Promise<void> {
  if (!tokens.length) return;

  const chunks: string[][] = [];
  for (let i = 0; i < tokens.length; i += 500) {
    chunks.push(tokens.slice(i, i + 500)); // FCM limit: 500 tokens per call
  }

  await Promise.all(
    chunks.map((chunk) =>
      fcmMessaging.sendEachForMulticast({
        tokens: chunk,
        notification: { title: payload.title, body: payload.body },
        data: payload.data ?? {},
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      }),
    ),
  );
}

// ── Firestore helpers ─────────────────────────────────────────────────────────

export interface FirestoreMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  createdAt: admin.firestore.Timestamp;
  read: boolean;
}

/** Write a message to Firestore for real-time delivery to web/mobile clients */
export async function writeMessageToFirestore(
  conversationId: string,
  message: Omit<FirestoreMessage, 'createdAt'>,
): Promise<string> {
  const ref = firestoreDb
    .collection(COLLECTIONS.MESSAGES)
    .doc(conversationId)
    .collection('msgs')
    .doc(message.id);

  await ref.set({
    ...message,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return ref.id;
}

/** Update presence in Firestore (for clients that listen to Firestore directly) */
export async function setFirestorePresence(
  userId: string,
  status: 'online' | 'offline',
): Promise<void> {
  const ref = firestoreDb.collection(COLLECTIONS.PRESENCE).doc(userId);
  await ref.set(
    {
      status,
      userId,
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

/** Write/clear a typing indicator in Firestore */
export async function setTypingIndicator(
  conversationId: string,
  userId: string,
  isTyping: boolean,
): Promise<void> {
  const ref = firestoreDb
    .collection(COLLECTIONS.TYPING)
    .doc(conversationId)
    .collection('users')
    .doc(userId);

  if (isTyping) {
    await ref.set({
      userId,
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    await ref.delete();
  }
}

export default admin;