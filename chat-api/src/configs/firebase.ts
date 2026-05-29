import admin from 'firebase-admin';
import { logger } from './logger';
import { Bucket } from '@google-cloud/storage';
import { Messaging } from 'firebase-admin/messaging';
import * as fs from 'fs';
// import * as path from 'path';

// ── Load service account credentials ────────────────────────────────────────
let credential: admin.credential.Credential;

const jsonKeyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;
if (jsonKeyPath && fs.existsSync(jsonKeyPath)) {
  // Load from JSON file
  const keyFile = JSON.parse(fs.readFileSync(jsonKeyPath, 'utf8'));
  credential = admin.credential.cert({
    projectId: keyFile.project_id,
    privateKey: keyFile.private_key,
    clientEmail: keyFile.client_email,
  });
  logger.info(`Firebase service account loaded from ${jsonKeyPath}`);
} else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
  // Fallback to environment variables (with newline replacement)
  credential = admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  });
  logger.info('Firebase service account loaded from environment variables');
} else {
  // Auto-detect via GOOGLE_APPLICATION_CREDENTIALS or default auth
  logger.warn('No explicit Firebase credentials provided – relying on application default credentials (ADC)');
  credential = admin.credential.applicationDefault();
}

// ── Initialise Firebase Admin SDK once ────────────────────────────────────────
if (!admin.apps.length) {
  admin.initializeApp({
    credential,
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
  MESSAGES: 'messages',
  PRESENCE: 'presence',
  TYPING: 'typing',
  CONVERSATIONS: 'conversations',
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
    chunks.push(tokens.slice(i, i + 500));
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