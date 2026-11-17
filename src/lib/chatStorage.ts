import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
  where,
} from 'firebase/firestore';
import { CoopChatMessage, CoopSide, LobbyChatMessage } from '../types/game';
import { db, handleFirestoreError, OperationType } from './firebase';
import { sanitizeDisplayName } from './playerStorage';

const MAX_CHAT_TEXT_LEN = 200;
const TS_MIN = Timestamp.fromMillis(0);
const TS_MAX = Timestamp.fromMillis(4102444800000); // Year 2100

function makeSafeMessageId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `msg_${Date.now()}_${rand}`;
}

export function sanitizeChatText(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, MAX_CHAT_TEXT_LEN);
}

export function subscribeLobbyChat(
  onData: (messages: LobbyChatMessage[]) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  const path = 'lobby_chat';
  const q = query(
    collection(db, path),
    where('createdAt', '>=', TS_MIN),
    where('createdAt', '<=', TS_MAX),
    orderBy('createdAt', 'desc'),
    limit(40),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const rows: LobbyChatMessage[] = snapshot.docs
        .map((d) => {
          const data = d.data();
          const createdAtMs =
            data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
          return {
            id: String(data.id || d.id),
            uid: String(data.uid || ''),
            displayName: sanitizeDisplayName(data.displayName),
            text: String(data.text || '').slice(0, MAX_CHAT_TEXT_LEN),
            createdAtMs,
          };
        })
        .reverse();
      onData(rows);
    },
    (error) => {
      if (onError) onError(error);
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch {
        // Handled cleanly by UI banner
      }
    },
  );
}

export async function sendLobbyChatMessage(
  uid: string,
  displayName: string,
  rawText: string,
): Promise<void> {
  const text = sanitizeChatText(rawText);
  if (!text) return;

  const id = makeSafeMessageId();
  const path = `lobby_chat/${id}`;
  const msgRef = doc(db, 'lobby_chat', id);

  try {
    await setDoc(msgRef, {
      id,
      uid,
      displayName: sanitizeDisplayName(displayName),
      text,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeCoopChat(
  roomId: string,
  onData: (messages: CoopChatMessage[]) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  const path = `coop_rooms/${roomId}/messages`;
  const q = query(
    collection(db, 'coop_rooms', roomId, 'messages'),
    where('createdAt', '>=', TS_MIN),
    where('createdAt', '<=', TS_MAX),
    orderBy('createdAt', 'desc'),
    limit(50),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const rows: CoopChatMessage[] = snapshot.docs
        .map((d) => {
          const data = d.data();
          const createdAtMs =
            data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
          const side: CoopSide = data.side === 'right' ? 'right' : 'left';
          return {
            id: String(data.id || d.id),
            uid: String(data.uid || ''),
            displayName: sanitizeDisplayName(data.displayName),
            side,
            text: String(data.text || '').slice(0, MAX_CHAT_TEXT_LEN),
            createdAtMs,
          };
        })
        .reverse();
      onData(rows);
    },
    (error) => {
      if (onError) onError(error);
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch {
        // Handled cleanly by UI
      }
    },
  );
}

export async function sendCoopChatMessage(
  roomId: string,
  uid: string,
  displayName: string,
  side: CoopSide,
  rawText: string,
): Promise<void> {
  const text = sanitizeChatText(rawText);
  if (!text) return;

  const id = makeSafeMessageId();
  const path = `coop_rooms/${roomId}/messages/${id}`;
  const msgRef = doc(db, 'coop_rooms', roomId, 'messages', id);

  try {
    await setDoc(msgRef, {
      id,
      uid,
      displayName: sanitizeDisplayName(displayName),
      side,
      text,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
