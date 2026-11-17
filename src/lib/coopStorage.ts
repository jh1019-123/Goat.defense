import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  COOP_STARTING_COINS,
  MAX_CASTLE_HP,
} from '../data/gameConfig';
import {
  CoopRoomState,
  CoopSide,
  CoopTowerRecord,
  SkillId,
  TowerBranch,
  TowerType,
} from '../types/game';
import { db, handleFirestoreError, OperationType } from './firebase';
import { sanitizeDisplayName } from './playerStorage';

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRoomId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `coop_${Date.now()}_${rand}`;
}

function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

function mapRoomSnapshot(roomId: string, data: Record<string, unknown>): CoopRoomState {
  const updatedAtMs =
    data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : Date.now();
  return {
    roomId: String(data.roomId || roomId),
    roomCode: String(data.roomCode || ''),
    hostUid: String(data.hostUid || ''),
    hostName: sanitizeDisplayName(typeof data.hostName === 'string' ? data.hostName : ''),
    guestUid: typeof data.guestUid === 'string' ? data.guestUid : '',
    guestName: typeof data.guestName === 'string' ? data.guestName : '',
    status:
      data.status === 'playing' || data.status === 'ended' ? data.status : 'waiting',
    wave: typeof data.wave === 'number' ? data.wave : 1,
    phase:
      data.phase === 'wave_active' || data.phase === 'game_over' ? data.phase : 'prep',
    coins: typeof data.coins === 'number' ? data.coins : COOP_STARTING_COINS,
    castleHp: typeof data.castleHp === 'number' ? data.castleHp : MAX_CASTLE_HP,
    speedMultiplier: data.speedMultiplier === 2 ? 2 : 1,
    lastSkillSeq: typeof data.lastSkillSeq === 'number' ? data.lastSkillSeq : 0,
    lastSkillId: typeof data.lastSkillId === 'string' ? data.lastSkillId : '',
    lastSkillBy: typeof data.lastSkillBy === 'string' ? data.lastSkillBy : '',
    updatedAtMs,
  };
}

export async function createCoopRoom(
  hostUid: string,
  hostDisplayName: string,
): Promise<CoopRoomState> {
  const roomId = generateRoomId();
  const roomCode = generateRoomCode();
  const hostName = sanitizeDisplayName(hostDisplayName);
  const path = `coop_rooms/${roomId}`;
  const roomRef = doc(db, 'coop_rooms', roomId);

  try {
    await setDoc(roomRef, {
      roomId,
      roomCode,
      hostUid,
      hostName,
      guestUid: '',
      guestName: '',
      status: 'waiting',
      wave: 1,
      phase: 'prep',
      coins: COOP_STARTING_COINS,
      castleHp: MAX_CASTLE_HP,
      speedMultiplier: 1,
      lastSkillSeq: 0,
      lastSkillId: '',
      lastSkillBy: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      roomId,
      roomCode,
      hostUid,
      hostName,
      guestUid: '',
      guestName: '',
      status: 'waiting',
      wave: 1,
      phase: 'prep',
      coins: COOP_STARTING_COINS,
      castleHp: MAX_CASTLE_HP,
      speedMultiplier: 1,
      lastSkillSeq: 0,
      lastSkillId: '',
      lastSkillBy: '',
      updatedAtMs: Date.now(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeWaitingCoopRooms(
  onRooms: (rooms: CoopRoomState[]) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  const path = 'coop_rooms';
  const q = query(
    collection(db, path),
    where('status', '==', 'waiting'),
    limit(20),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const now = Date.now();
      const rows = snapshot.docs
        .map((d) => mapRoomSnapshot(d.id, d.data() as Record<string, unknown>))
        // Hide stale rooms older than 30 minutes
        .filter((r) => now - r.updatedAtMs < 30 * 60 * 1000)
        .sort((a, b) => b.updatedAtMs - a.updatedAtMs);
      onRooms(rows);
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

export async function joinCoopRoomById(
  roomId: string,
  guestUid: string,
  guestDisplayName: string,
): Promise<CoopRoomState> {
  const path = `coop_rooms/${roomId}`;
  const roomRef = doc(db, 'coop_rooms', roomId);
  const guestName = sanitizeDisplayName(guestDisplayName);

  try {
    const joined = await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) {
        throw new Error('협동 방을 찾을 수 없습니다.');
      }
      const room = mapRoomSnapshot(roomId, snap.data() as Record<string, unknown>);
      if (room.status !== 'waiting' || room.guestUid !== '') {
        throw new Error('이미 게임이 시작되었거나 정원이 가득 찬 방입니다.');
      }
      if (room.hostUid === guestUid) {
        throw new Error('본인이 만든 방에는 다른 계정으로만 참가할 수 있습니다.');
      }

      tx.update(roomRef, {
        guestUid,
        guestName,
        status: 'playing',
        updatedAt: serverTimestamp(),
      });

      return {
        ...room,
        guestUid,
        guestName,
        status: 'playing' as const,
      };
    });

    return joined;
  } catch (error) {
    if (error instanceof Error && !error.message.includes('permission')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function joinCoopRoomByCode(
  rawCode: string,
  guestUid: string,
  guestDisplayName: string,
): Promise<CoopRoomState> {
  const code = rawCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) {
    throw new Error('6자리 영문/숫자 방 코드를 정확히 입력해주세요.');
  }

  const q = query(
    collection(db, 'coop_rooms'),
    where('status', '==', 'waiting'),
    limit(20),
  );

  const snaps = await getDocs(q);
  const match = snaps.docs.find((d) => d.data().roomCode === code);
  if (!match) {
    throw new Error('해당 코드의 대기 중인 방을 찾을 수 없습니다.');
  }

  return joinCoopRoomById(match.id, guestUid, guestDisplayName);
}

export async function endCoopRoom(roomId: string): Promise<void> {
  const path = `coop_rooms/${roomId}`;
  const roomRef = doc(db, 'coop_rooms', roomId);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.status === 'ended') return;
      tx.update(roomRef, {
        status: 'ended',
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } catch {
      // Ignore on exit cleanup
    }
  }
}

export function subscribeCoopRoom(
  roomId: string,
  onRoom: (room: CoopRoomState | null) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  const path = `coop_rooms/${roomId}`;
  const roomRef = doc(db, 'coop_rooms', roomId);

  return onSnapshot(
    roomRef,
    (snap) => {
      if (!snap.exists()) {
        onRoom(null);
        return;
      }
      onRoom(mapRoomSnapshot(roomId, snap.data() as Record<string, unknown>));
    },
    (error) => {
      if (onError) onError(error);
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch {
        // Handled by UI
      }
    },
  );
}

export function subscribeCoopTowers(
  roomId: string,
  onTowers: (towers: CoopTowerRecord[]) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  const path = `coop_rooms/${roomId}/towers`;
  const q = query(
    collection(db, 'coop_rooms', roomId, 'towers'),
    where('side', 'in', ['left', 'right']),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: CoopTowerRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          slotId: String(data.slotId || d.id),
          side: data.side === 'right' ? 'right' : 'left',
          col: typeof data.col === 'number' ? data.col : 0,
          row: typeof data.row === 'number' ? data.row : 0,
          type: (data.type as TowerType) || TowerType.ARCHER,
          level: (typeof data.level === 'number' ? data.level : 1) as 1 | 2 | 3 | 4,
          branch: (data.branch as TowerBranch) || TowerBranch.NONE,
          ownerUid: String(data.ownerUid || ''),
          spent: typeof data.spent === 'number' ? data.spent : 2,
        };
      });
      onTowers(list);
    },
    (error) => {
      if (onError) onError(error);
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch {
        // Handled by UI
      }
    },
  );
}

export async function coopBuildTowerTx(
  roomId: string,
  ownerUid: string,
  slotId: string,
  side: CoopSide,
  col: number,
  row: number,
  type: TowerType,
  cost: number,
): Promise<boolean> {
  const roomRef = doc(db, 'coop_rooms', roomId);
  const towerRef = doc(db, 'coop_rooms', roomId, 'towers', slotId);

  try {
    return await runTransaction(db, async (tx) => {
      const [roomSnap, towerSnap] = await Promise.all([
        tx.get(roomRef),
        tx.get(towerRef),
      ]);
      if (!roomSnap.exists() || towerSnap.exists()) return false;
      const room = roomSnap.data();
      if (room.status !== 'playing' || room.phase === 'game_over') return false;
      const currentCoins = typeof room.coins === 'number' ? room.coins : 0;
      if (currentCoins < cost) return false;

      tx.update(roomRef, {
        coins: currentCoins - cost,
        updatedAt: serverTimestamp(),
      });
      tx.set(towerRef, {
        slotId,
        side,
        col,
        row,
        type,
        level: 1,
        branch: TowerBranch.NONE,
        ownerUid,
        spent: cost,
        updatedAt: serverTimestamp(),
      });
      return true;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `coop_rooms/${roomId}/towers/${slotId}`);
  }
}

export async function coopUpgradeTowerTx(
  roomId: string,
  slotId: string,
  cost: number,
  nextLevel: 2 | 3 | 4,
  branch: TowerBranch,
): Promise<boolean> {
  const roomRef = doc(db, 'coop_rooms', roomId);
  const towerRef = doc(db, 'coop_rooms', roomId, 'towers', slotId);

  try {
    return await runTransaction(db, async (tx) => {
      const [roomSnap, towerSnap] = await Promise.all([
        tx.get(roomRef),
        tx.get(towerRef),
      ]);
      if (!roomSnap.exists() || !towerSnap.exists()) return false;
      const room = roomSnap.data();
      const tower = towerSnap.data();
      if (room.status !== 'playing' || room.phase === 'game_over') return false;
      const currentCoins = typeof room.coins === 'number' ? room.coins : 0;
      if (currentCoins < cost) return false;
      if ((tower.level as number) >= nextLevel) return false;

      tx.update(roomRef, {
        coins: currentCoins - cost,
        updatedAt: serverTimestamp(),
      });
      tx.update(towerRef, {
        level: nextLevel,
        branch,
        spent: (typeof tower.spent === 'number' ? tower.spent : 0) + cost,
        updatedAt: serverTimestamp(),
      });
      return true;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `coop_rooms/${roomId}/towers/${slotId}`);
  }
}

export async function coopSellTowerTx(
  roomId: string,
  slotId: string,
): Promise<boolean> {
  const roomRef = doc(db, 'coop_rooms', roomId);
  const towerRef = doc(db, 'coop_rooms', roomId, 'towers', slotId);

  try {
    return await runTransaction(db, async (tx) => {
      const [roomSnap, towerSnap] = await Promise.all([
        tx.get(roomRef),
        tx.get(towerRef),
      ]);
      if (!roomSnap.exists() || !towerSnap.exists()) return false;
      const room = roomSnap.data();
      const tower = towerSnap.data();
      if (room.status !== 'playing' || room.phase === 'game_over') return false;

      const spent = typeof tower.spent === 'number' ? tower.spent : 2;
      const refund = Math.max(1, Math.floor(spent * 0.7));
      const currentCoins = typeof room.coins === 'number' ? room.coins : 0;

      tx.update(roomRef, {
        coins: currentCoins + refund,
        updatedAt: serverTimestamp(),
      });
      tx.delete(towerRef);
      return true;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `coop_rooms/${roomId}/towers/${slotId}`);
  }
}

export async function coopStartWaveTx(roomId: string): Promise<boolean> {
  const roomRef = doc(db, 'coop_rooms', roomId);
  try {
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) return false;
      const room = snap.data();
      if (room.status !== 'playing' || room.phase !== 'prep') return false;

      tx.update(roomRef, {
        phase: 'wave_active',
        updatedAt: serverTimestamp(),
      });
      return true;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `coop_rooms/${roomId}`);
  }
}

export async function coopWaveClearTx(
  roomId: string,
  clearedWave: number,
  coinReward: number,
): Promise<boolean> {
  const roomRef = doc(db, 'coop_rooms', roomId);
  try {
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) return false;
      const room = snap.data();
      if (
        room.status !== 'playing' ||
        room.phase !== 'wave_active' ||
        room.wave !== clearedWave
      ) {
        return false;
      }

      const currentCoins = typeof room.coins === 'number' ? room.coins : 0;
      tx.update(roomRef, {
        wave: clearedWave + 1,
        phase: 'prep',
        coins: currentCoins + coinReward,
        updatedAt: serverTimestamp(),
      });
      return true;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `coop_rooms/${roomId}`);
  }
}

export async function coopUpdateCastleHpTx(
  roomId: string,
  nextHp: number,
): Promise<void> {
  const roomRef = doc(db, 'coop_rooms', roomId);
  const clampedHp = Math.max(0, Math.min(MAX_CASTLE_HP, Math.round(nextHp)));
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) return;
      const room = snap.data();
      if (room.status !== 'playing' || room.phase === 'game_over') return;
      tx.update(roomRef, {
        castleHp: clampedHp,
        phase: clampedHp <= 0 ? 'game_over' : room.phase,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `coop_rooms/${roomId}`);
  }
}

export async function coopSetSpeedTx(
  roomId: string,
  speedMultiplier: 1 | 2,
): Promise<void> {
  const roomRef = doc(db, 'coop_rooms', roomId);
  try {
    await updateDoc(roomRef, {
      speedMultiplier,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `coop_rooms/${roomId}`);
  }
}

export async function coopTriggerSkillTx(
  roomId: string,
  uid: string,
  skillId: SkillId,
): Promise<void> {
  const roomRef = doc(db, 'coop_rooms', roomId);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) return;
      const room = snap.data();
      if (room.status !== 'playing' || room.phase !== 'wave_active') return;
      const prevSeq = typeof room.lastSkillSeq === 'number' ? room.lastSkillSeq : 0;
      tx.update(roomRef, {
        lastSkillSeq: prevSeq + 1,
        lastSkillId: skillId,
        lastSkillBy: uid,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `coop_rooms/${roomId}`);
  }
}
