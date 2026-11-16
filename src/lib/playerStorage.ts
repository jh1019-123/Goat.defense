import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  LeaderboardRecord,
  PlayerSaveData,
  SkillId,
  TowerType,
} from '../types/game';
import { db, handleFirestoreError, OperationType } from './firebase';

const LOCAL_SAVE_KEY = 'bastion_siege_guest_save_v1';

export function createDefaultSaveData(uid = 'guest', displayName = '성주 지휘관'): PlayerSaveData {
  return {
    uid,
    displayName: sanitizeDisplayName(displayName),
    crystals: 35, // Give newcomers 35 crystals so they can test buying a 30-crystal skin or skill right away
    unlockedSkins: [],
    equippedSkins: {},
    unlockedSkills: [],
    bestWave: 0,
    totalKills: 0,
    gamesPlayed: 0,
  };
}

export function sanitizeDisplayName(raw: string | null | undefined): string {
  const cleaned = (raw || '성주 지휘관').trim().slice(0, 40);
  return cleaned.length > 0 ? cleaned : '성주 지휘관';
}

export function loadGuestSaveData(): PlayerSaveData {
  try {
    const raw = localStorage.getItem(LOCAL_SAVE_KEY);
    if (!raw) return createDefaultSaveData();
    const parsed = JSON.parse(raw) as Partial<PlayerSaveData>;
    return {
      uid: 'guest',
      displayName: sanitizeDisplayName(parsed.displayName),
      crystals: typeof parsed.crystals === 'number' && parsed.crystals >= 0 ? Math.floor(parsed.crystals) : 35,
      unlockedSkins: Array.isArray(parsed.unlockedSkins) ? parsed.unlockedSkins.slice(0, 24) : [],
      equippedSkins: parsed.equippedSkins && typeof parsed.equippedSkins === 'object' ? parsed.equippedSkins : {},
      unlockedSkills: Array.isArray(parsed.unlockedSkills) ? (parsed.unlockedSkills.slice(0, 10) as SkillId[]) : [],
      bestWave: typeof parsed.bestWave === 'number' && parsed.bestWave >= 0 ? Math.floor(parsed.bestWave) : 0,
      totalKills: typeof parsed.totalKills === 'number' && parsed.totalKills >= 0 ? Math.floor(parsed.totalKills) : 0,
      gamesPlayed: typeof parsed.gamesPlayed === 'number' && parsed.gamesPlayed >= 0 ? Math.floor(parsed.gamesPlayed) : 0,
    };
  } catch {
    return createDefaultSaveData();
  }
}

export function saveGuestSaveData(data: PlayerSaveData): void {
  try {
    localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}

function sanitizeEquippedSkins(
  skins: Partial<Record<TowerType, string>> | undefined,
): Partial<Record<TowerType, string>> {
  const out: Partial<Record<TowerType, string>> = {};
  if (!skins) return out;
  const allowed: TowerType[] = [
    TowerType.ARCHER,
    TowerType.FLAME,
    TowerType.FROST,
    TowerType.TESLA,
  ];
  for (const key of allowed) {
    const val = skins[key];
    if (typeof val === 'string' && val.length > 0 && val.length <= 64) {
      out[key] = val;
    }
  }
  return out;
}

export async function ensureAndSyncUserProfile(
  user: User,
  guestData?: PlayerSaveData,
): Promise<PlayerSaveData> {
  const path = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const displayName = sanitizeDisplayName(user.displayName || user.email?.split('@')[0] || '성주 지휘관');

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const initial = guestData
        ? {
            uid: user.uid,
            displayName,
            crystals: Math.max(35, Math.floor(guestData.crystals)),
            unlockedSkins: guestData.unlockedSkins.slice(0, 24),
            equippedSkins: sanitizeEquippedSkins(guestData.equippedSkins),
            unlockedSkills: guestData.unlockedSkills.slice(0, 10),
            bestWave: Math.max(0, Math.floor(guestData.bestWave)),
            totalKills: Math.max(0, Math.floor(guestData.totalKills)),
            gamesPlayed: Math.max(0, Math.floor(guestData.gamesPlayed)),
          }
        : createDefaultSaveData(user.uid, displayName);

      await setDoc(userRef, {
        ...initial,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (initial.bestWave > 0) {
        await upsertLeaderboardRecord(user.uid, displayName, initial.bestWave, initial.totalKills, 0);
      }

      return initial;
    }

    const data = snap.data();
    const remote: PlayerSaveData = {
      uid: user.uid,
      displayName: sanitizeDisplayName(data.displayName || displayName),
      crystals: typeof data.crystals === 'number' ? data.crystals : 0,
      unlockedSkins: Array.isArray(data.unlockedSkins) ? data.unlockedSkins : [],
      equippedSkins: sanitizeEquippedSkins(data.equippedSkins),
      unlockedSkills: Array.isArray(data.unlockedSkills) ? data.unlockedSkills : [],
      bestWave: typeof data.bestWave === 'number' ? data.bestWave : 0,
      totalKills: typeof data.totalKills === 'number' ? data.totalKills : 0,
      gamesPlayed: typeof data.gamesPlayed === 'number' ? data.gamesPlayed : 0,
    };
    return remote;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateUserProfileFields(
  uid: string,
  updates: Partial<Omit<PlayerSaveData, 'uid'>>,
): Promise<void> {
  const path = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (updates.displayName !== undefined) {
    payload.displayName = sanitizeDisplayName(updates.displayName);
  }
  if (updates.crystals !== undefined) {
    payload.crystals = Math.max(0, Math.floor(updates.crystals));
  }
  if (updates.unlockedSkins !== undefined) {
    payload.unlockedSkins = updates.unlockedSkins.slice(0, 24);
  }
  if (updates.equippedSkins !== undefined) {
    payload.equippedSkins = sanitizeEquippedSkins(updates.equippedSkins);
  }
  if (updates.unlockedSkills !== undefined) {
    payload.unlockedSkills = updates.unlockedSkills.slice(0, 10);
  }
  if (updates.bestWave !== undefined) {
    payload.bestWave = Math.max(0, Math.floor(updates.bestWave));
  }
  if (updates.totalKills !== undefined) {
    payload.totalKills = Math.max(0, Math.floor(updates.totalKills));
  }
  if (updates.gamesPlayed !== undefined) {
    payload.gamesPlayed = Math.max(0, Math.floor(updates.gamesPlayed));
  }

  try {
    await updateDoc(userRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function upsertLeaderboardRecord(
  uid: string,
  displayName: string,
  waveReached: number,
  runKills: number,
  runBosses: number,
): Promise<void> {
  const path = `leaderboard/${uid}`;
  const lbRef = doc(db, 'leaderboard', uid);
  const safeName = sanitizeDisplayName(displayName);
  const safeWave = Math.max(0, Math.floor(waveReached));
  const safeKills = Math.max(0, Math.floor(runKills));
  const safeBosses = Math.max(0, Math.floor(runBosses));

  try {
    const existingSnap = await getDoc(lbRef);
    if (!existingSnap.exists()) {
      await setDoc(lbRef, {
        uid,
        displayName: safeName,
        bestWave: safeWave,
        totalKills: safeKills,
        bossesDefeated: safeBosses,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const prev = existingSnap.data();
      const prevWave = typeof prev.bestWave === 'number' ? prev.bestWave : 0;
      const prevKills = typeof prev.totalKills === 'number' ? prev.totalKills : 0;
      const prevBosses = typeof prev.bossesDefeated === 'number' ? prev.bossesDefeated : 0;

      await updateDoc(lbRef, {
        displayName: safeName,
        bestWave: Math.max(prevWave, safeWave),
        totalKills: prevKills + safeKills,
        bossesDefeated: prevBosses + safeBosses,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeUserProfile(
  uid: string,
  onData: (profile: PlayerSaveData) => void,
): Unsubscribe {
  const path = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  return onSnapshot(
    userRef,
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      onData({
        uid,
        displayName: sanitizeDisplayName(data.displayName),
        crystals: typeof data.crystals === 'number' ? data.crystals : 0,
        unlockedSkins: Array.isArray(data.unlockedSkins) ? data.unlockedSkins : [],
        equippedSkins: sanitizeEquippedSkins(data.equippedSkins),
        unlockedSkills: Array.isArray(data.unlockedSkills) ? data.unlockedSkills : [],
        bestWave: typeof data.bestWave === 'number' ? data.bestWave : 0,
        totalKills: typeof data.totalKills === 'number' ? data.totalKills : 0,
        gamesPlayed: typeof data.gamesPlayed === 'number' ? data.gamesPlayed : 0,
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    },
  );
}

export function subscribeLeaderboard(
  onData: (entries: LeaderboardRecord[]) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  const path = 'leaderboard';
  const q = query(
    collection(db, path),
    where('bestWave', '>=', 0),
    orderBy('bestWave', 'desc'),
    limit(50),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const rows: LeaderboardRecord[] = snapshot.docs
        .map((d) => {
          const data = d.data();
          const updatedAt =
            data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : Date.now();
          return {
            uid: String(data.uid || d.id),
            displayName: sanitizeDisplayName(data.displayName),
            bestWave: typeof data.bestWave === 'number' ? data.bestWave : 0,
            totalKills: typeof data.totalKills === 'number' ? data.totalKills : 0,
            bossesDefeated: typeof data.bossesDefeated === 'number' ? data.bossesDefeated : 0,
            updatedAtMs: updatedAt,
          };
        })
        .sort((a, b) => b.bestWave - a.bestWave || b.totalKills - a.totalKills);
      onData(rows);
    },
    (error) => {
      if (onError) onError(error);
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch {
        // Handled cleanly by caller UI error banner
      }
    },
  );
}
