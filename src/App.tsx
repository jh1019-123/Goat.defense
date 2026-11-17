import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  User,
} from 'firebase/auth';
import supabaseSqlText from '../supabase_schema.sql?raw';
import { BattleHud } from './components/BattleHud';
import { BattleTransitionOverlay } from './components/BattleTransitionOverlay';
import { IntroOverlay } from './components/IntroOverlay';
import { LobbyOverlay } from './components/LobbyOverlay';
import {
  COOP_STARTING_COINS,
  COOP_WAVE_CLEAR_COIN_REWARD,
  MAX_CASTLE_HP,
  STARTING_BATTLE_COINS,
} from './data/gameConfig';
import { TowerDefenseEngine } from './game/TowerDefenseEngine';
import { soundEngine } from './lib/audio';
import {
  sendCoopChatMessage,
  sendLobbyChatMessage,
  subscribeCoopChat,
  subscribeLobbyChat,
} from './lib/chatStorage';
import {
  coopBuildTowerTx,
  coopSellTowerTx,
  coopSetSpeedTx,
  coopStartWaveTx,
  coopTriggerSkillTx,
  coopUpdateCastleHpTx,
  coopUpgradeTowerTx,
  coopWaveClearTx,
  createCoopRoom,
  endCoopRoom,
  joinCoopRoomByCode,
  joinCoopRoomById,
  subscribeCoopRoom,
  subscribeCoopTowers,
  subscribeWaitingCoopRooms,
} from './lib/coopStorage';
import {
  auth,
  firebaseProjectId,
  googleAuthProvider,
  testFirestoreConnection,
} from './lib/firebase';
import {
  loadGuestSaveData,
  sanitizeDisplayName,
  saveGuestSaveData,
  ensureAndSyncUserProfile,
  subscribeLeaderboard,
  subscribeUserProfile,
  updateLeaderboardDisplayName,
  updateUserProfileFields,
  upsertLeaderboardRecord,
} from './lib/playerStorage';
import {
  AuthErrorDiagnostic,
  BattleHudState,
  CameraPreset,
  CoopChatMessage,
  CoopRoomState,
  CoopSide,
  GameMode,
  LeaderboardRecord,
  LobbyChatMessage,
  PlayerSaveData,
  SkillId,
  TowerBranch,
  TowerType,
} from './types/game';

function buildAuthErrorDiagnostic(error: unknown): AuthErrorDiagnostic | null {
  const errObj = error as { code?: string; message?: string } | null;
  const code = errObj?.code ?? 'auth/unknown';

  // User manually closed the popup window
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return null;
  }

  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isTopFrame = typeof window !== 'undefined' && window.self === window.top;

  if (code === 'auth/unauthorized-domain') {
    return {
      code,
      title: '승인되지 않은 도메인 (Vercel 등 외부 배포 환경)',
      detail:
        'Firebase 인증 보안 설정에 현재 도메인이 등록되어 있지 않아 Google 로그인이 차단되었습니다. 아래 도메인을 복사해 Firebase Console의 승인된 도메인에 추가해주세요.',
      hostname,
      projectId: firebaseProjectId,
      canTryRedirect: false,
    };
  }

  if (code === 'auth/popup-blocked') {
    return {
      code,
      title: '로그인 팝업이 차단되었습니다',
      detail:
        '브라우저 팝업 차단을 해제하거나, 아래 버튼을 눌러 리다이렉트 방식으로 로그인해주세요.',
      hostname,
      projectId: firebaseProjectId,
      canTryRedirect: isTopFrame,
    };
  }

  if (code === 'auth/operation-not-allowed') {
    return {
      code,
      title: 'Google 로그인 공급자 비활성화',
      detail: 'Firebase Console Authentication에서 Google 로그인 사용 설정을 확인해주세요.',
      hostname,
      projectId: firebaseProjectId,
      canTryRedirect: false,
    };
  }

  return {
    code,
    title: 'Google 로그인에 실패했습니다',
    detail: `오류 코드(${code})가 발생했습니다. 외부 배포 도메인이라면 승인된 도메인 등록 여부를 확인해주세요.`,
    hostname,
    projectId: firebaseProjectId,
    canTryRedirect: isTopFrame,
  };
}

const INITIAL_HUD: BattleHudState = {
  gameMode: 'solo',
  coopSide: null,
  partnerName: null,
  roomCode: null,
  phase: 'prep',
  wave: 1,
  coins: STARTING_BATTLE_COINS,
  sessionCrystals: 0,
  castleHp: MAX_CASTLE_HP,
  maxCastleHp: MAX_CASTLE_HP,
  enemiesRemaining: 0,
  totalKills: 0,
  bossesDefeated: 0,
  activeBossType: null,
  activeBossName: null,
  activeBossHp: 0,
  activeBossMaxHp: 0,
  speedMultiplier: 1,
  selectedBuildType: TowerType.ARCHER,
  selectedTower: null,
  hoveredSlotLabel: null,
  skillCooldowns: {
    [SkillId.ARROW_RAIN]: 0,
    [SkillId.METEOR_STRIKE]: 0,
    [SkillId.ABSOLUTE_ZERO]: 0,
  },
  bannerMessage: null,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<TowerDefenseEngine | null>(null);

  const [screen, setScreen] = useState<'lobby' | 'battle'>('lobby');
  const [showIntro, setShowIntro] = useState(true);
  const [battleTransitioning, setBattleTransitioning] = useState(false);
  const [transitionIsCoop, setTransitionIsCoop] = useState(false);
  const [lobbyBgFade, setLobbyBgFade] = useState(false);
  const lobbySceneRef = useRef(0);
  const [hud, setHud] = useState<BattleHudState>(INITIAL_HUD);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>(CameraPreset.SECOND_PERSON);
  const [muted, setMuted] = useState(false);

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<AuthErrorDiagnostic | null>(null);
  const [saveData, setSaveData] = useState<PlayerSaveData>(() => loadGuestSaveData());
  const [leaderboard, setLeaderboard] = useState<LeaderboardRecord[]>([]);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  // Lobby & Co-op Chat State
  const [lobbyMessages, setLobbyMessages] = useState<LobbyChatMessage[]>([]);
  const [lobbyChatError, setLobbyChatError] = useState<string | null>(null);
  const [coopMessages, setCoopMessages] = useState<CoopChatMessage[]>([]);
  const [coopChatError, setCoopChatError] = useState<string | null>(null);

  // Co-op Room State
  const [openCoopRooms, setOpenCoopRooms] = useState<CoopRoomState[]>([]);
  const [activeCoopRoom, setActiveCoopRoom] = useState<CoopRoomState | null>(null);
  const [coopActionLoading, setCoopActionLoading] = useState(false);
  const [coopError, setCoopError] = useState<string | null>(null);

  // Refs to ensure WebGL callbacks always access fresh user, saveData & co-op room without remounting canvas
  const userRef = useRef<User | null>(null);
  const saveDataRef = useRef<PlayerSaveData>(saveData);
  const pendingBattleModeRef = useRef<GameMode>('solo');
  const activeCoopRoomRef = useRef<CoopRoomState | null>(null);
  const coopBattleStartedForRoomIdRef = useRef<string | null>(null);
  const screenRef = useRef<'lobby' | 'battle'>('lobby');

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);
  useEffect(() => {
    userRef.current = firebaseUser;
  }, [firebaseUser]);
  useEffect(() => {
    saveDataRef.current = saveData;
    engineRef.current?.setEquippedSkins(saveData.equippedSkins);
    if (!userRef.current) {
      saveGuestSaveData(saveData);
    }
  }, [saveData]);
  useEffect(() => {
    activeCoopRoomRef.current = activeCoopRoom;
  }, [activeCoopRoom]);

  // Cycle lobby 3D background camera angles every 7s with smooth fade-out / fade-in
  useEffect(() => {
    if (screen !== 'lobby' || showIntro || battleTransitioning) {
      setLobbyBgFade(false);
      return;
    }
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    lobbySceneRef.current = 0;
    engineRef.current?.setLobbyScene(0, false);

    let fadeTimer: number | null = null;
    let revealTimer: number | null = null;

    const intervalId = window.setInterval(() => {
      setLobbyBgFade(true);
      fadeTimer = window.setTimeout(() => {
        lobbySceneRef.current = (lobbySceneRef.current + 1) % 4;
        engineRef.current?.setLobbyScene(lobbySceneRef.current, true);
        revealTimer = window.setTimeout(() => {
          setLobbyBgFade(false);
        }, 70);
      }, 520);
    }, 7000);

    return () => {
      clearInterval(intervalId);
      if (fadeTimer !== null) clearTimeout(fadeTimer);
      if (revealTimer !== null) clearTimeout(revealTimer);
      setLobbyBgFade(false);
    };
  }, [screen, showIntro, battleTransitioning]);

  // Boot Firestore connection check & subscribe to public real-time leaderboard + lobby chat
  useEffect(() => {
    void testFirestoreConnection();
    const unsubLb = subscribeLeaderboard(
      (rows) => {
        setLeaderboard(rows);
        setLeaderboardError(null);
      },
      () => {
        setLeaderboardError('리더보드 연결 실패');
      },
    );
    const unsubLobbyChat = subscribeLobbyChat(
      (msgs) => {
        setLobbyMessages(msgs);
        setLobbyChatError(null);
      },
      () => {
        setLobbyChatError('채팅을 불러오는 중 오류가 발생했습니다.');
      },
    );
    return () => {
      unsubLb();
      unsubLobbyChat();
    };
  }, []);

  // Subscribe to open co-op rooms while on lobby & signed in
  useEffect(() => {
    if (!firebaseUser || screen !== 'lobby') {
      setOpenCoopRooms([]);
      return;
    }
    const unsub = subscribeWaitingCoopRooms(
      (rooms) => setOpenCoopRooms(rooms),
      () => {
        // Ignore transient list errors cleanly
      },
    );
    return () => unsub();
  }, [firebaseUser, screen]);

  // Subscribe to active co-op room, towers, and room chat
  const activeRoomId = activeCoopRoom?.roomId ?? null;
  useEffect(() => {
    if (!activeRoomId || !firebaseUser) {
      setCoopMessages([]);
      return;
    }

    const unsubRoom = subscribeCoopRoom(activeRoomId, (room) => {
      if (!room) {
        setActiveCoopRoom(null);
        return;
      }
      setActiveCoopRoom(room);

      if (
        room.status === 'playing' &&
        coopBattleStartedForRoomIdRef.current !== room.roomId
      ) {
        coopBattleStartedForRoomIdRef.current = room.roomId;
        pendingBattleModeRef.current = 'coop';
        setTransitionIsCoop(true);
        setBattleTransitioning(true);
      }

      if (screenRef.current === 'battle' && room.status === 'playing') {
        engineRef.current?.syncCoopRoomState(room);
      }
    });

    const unsubTowers = subscribeCoopTowers(activeRoomId, (towers) => {
      if (screenRef.current === 'battle') {
        engineRef.current?.syncCoopTowers(towers);
      }
    });

    const unsubChat = subscribeCoopChat(
      activeRoomId,
      (msgs) => {
        setCoopMessages(msgs);
        setCoopChatError(null);
      },
      () => {
        setCoopChatError('협동 채팅 연결 오류');
      },
    );

    return () => {
      unsubRoom();
      unsubTowers();
      unsubChat();
    };
  }, [activeRoomId, firebaseUser]);

  // Firebase Auth state & user profile real-time sync + redirect fallback result check
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    getRedirectResult(auth).catch((err) => {
      const diag = buildAuthErrorDiagnostic(err);
      if (diag) setAuthError(diag);
    });

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        setAuthError(null);
      }
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (user) {
        try {
          const synced = await ensureAndSyncUserProfile(user, saveDataRef.current);
          setSaveData(synced);
          unsubProfile = subscribeUserProfile(user.uid, (remoteProfile) => {
            setSaveData(remoteProfile);
          });
        } catch (err) {
          console.error('Failed to sync profile:', err);
        }
      } else {
        setSaveData(loadGuestSaveData());
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  // Mount Three.js WebGL Engine once
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const engine = new TowerDefenseEngine(mountEl, {
      onHudUpdate: (nextHud) => {
        setHud(nextHud);
      },
      onWaveCleared: (clearedWave, crystalsEarned, totalKills, bossesDefeated) => {
        const current = saveDataRef.current;
        const nextCrystals = current.crystals + crystalsEarned;
        const nextBestWave = Math.max(current.bestWave, clearedWave);

        const updated: PlayerSaveData = {
          ...current,
          crystals: nextCrystals,
          bestWave: nextBestWave,
        };
        setSaveData(updated);

        const activeUser = userRef.current;
        if (activeUser) {
          void updateUserProfileFields(activeUser.uid, {
            crystals: nextCrystals,
            bestWave: nextBestWave,
          });
          void upsertLeaderboardRecord(
            activeUser.uid,
            updated.displayName,
            nextBestWave,
            0,
            0,
          );
        } else {
          // Track incremental wave crystal gains in guest save
          void totalKills;
          void bossesDefeated;
        }
      },
      onGameOver: (waveReached, runKills, runBosses) => {
        const current = saveDataRef.current;
        const nextBestWave = Math.max(current.bestWave, waveReached);
        const nextTotalKills = current.totalKills + runKills;
        const nextGamesPlayed = current.gamesPlayed + 1;

        const updated: PlayerSaveData = {
          ...current,
          bestWave: nextBestWave,
          totalKills: nextTotalKills,
          gamesPlayed: nextGamesPlayed,
        };
        setSaveData(updated);

        const activeUser = userRef.current;
        if (activeUser) {
          void updateUserProfileFields(activeUser.uid, {
            bestWave: nextBestWave,
            totalKills: nextTotalKills,
            gamesPlayed: nextGamesPlayed,
          });
          void upsertLeaderboardRecord(
            activeUser.uid,
            updated.displayName,
            waveReached,
            runKills,
            runBosses,
          );
        }
      },
      onCoopBuildTower: (slotId, side, col, row, type, cost) => {
        const room = activeCoopRoomRef.current;
        const activeUser = userRef.current;
        if (!room || !activeUser) return;
        void coopBuildTowerTx(room.roomId, activeUser.uid, slotId, side, col, row, type, cost);
      },
      onCoopUpgradeTower: (slotId, cost, nextLevel, branch) => {
        const room = activeCoopRoomRef.current;
        if (!room) return;
        void coopUpgradeTowerTx(room.roomId, slotId, cost, nextLevel, branch);
      },
      onCoopSellTower: (slotId) => {
        const room = activeCoopRoomRef.current;
        if (!room) return;
        void coopSellTowerTx(room.roomId, slotId);
      },
      onCoopStartWave: () => {
        const room = activeCoopRoomRef.current;
        if (!room) return;
        void coopStartWaveTx(room.roomId);
      },
      onCoopWaveCleared: (clearedWave, crystalsEarned) => {
        const room = activeCoopRoomRef.current;
        if (room) {
          void coopWaveClearTx(room.roomId, clearedWave, COOP_WAVE_CLEAR_COIN_REWARD);
        }

        const current = saveDataRef.current;
        const nextCrystals = current.crystals + crystalsEarned;
        const nextBestWave = Math.max(current.bestWave, clearedWave);
        const updated: PlayerSaveData = {
          ...current,
          crystals: nextCrystals,
          bestWave: nextBestWave,
        };
        setSaveData(updated);

        const activeUser = userRef.current;
        if (activeUser) {
          void updateUserProfileFields(activeUser.uid, {
            crystals: nextCrystals,
            bestWave: nextBestWave,
          });
          void upsertLeaderboardRecord(
            activeUser.uid,
            updated.displayName,
            nextBestWave,
            0,
            0,
          );
        }
      },
      onCoopCastleDamaged: (nextHp) => {
        const room = activeCoopRoomRef.current;
        if (!room) return;
        void coopUpdateCastleHpTx(room.roomId, nextHp);
      },
      onCoopTriggerSkill: (skillId) => {
        const room = activeCoopRoomRef.current;
        const activeUser = userRef.current;
        if (!room || !activeUser) return;
        void coopTriggerSkillTx(room.roomId, activeUser.uid, skillId);
      },
      onCoopSpeedChange: (mult) => {
        const room = activeCoopRoomRef.current;
        if (!room) return;
        void coopSetSpeedTx(room.roomId, mult);
      },
    });

    engine.setEquippedSkins(saveDataRef.current.equippedSkins);
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleIntroComplete = useCallback(() => {
    setShowIntro(false);
    engineRef.current?.setIntroActive(false);
  }, []);

  const handleSignIn = useCallback(async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      const diag = buildAuthErrorDiagnostic(error);
      if (diag) {
        setAuthError(diag);
      }
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const handleSignInRedirect = useCallback(async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithRedirect(auth, googleAuthProvider);
    } catch (error) {
      console.error('Google Redirect Sign-In failed:', error);
      const diag = buildAuthErrorDiagnostic(error);
      if (diag) {
        setAuthError(diag);
      }
      setAuthLoading(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut(auth);
      setAuthError(null);
    } catch (error) {
      console.error('Sign-Out failed:', error);
    }
  }, []);

  const handleStartBattle = useCallback(() => {
    pendingBattleModeRef.current = 'solo';
    setTransitionIsCoop(false);
    setBattleTransitioning(true);
  }, []);

  const handleBattleTransitionPeak = useCallback(() => {
    setScreen('battle');
    setCameraPreset(CameraPreset.SECOND_PERSON);
    engineRef.current?.setCameraPreset(CameraPreset.SECOND_PERSON);

    if (pendingBattleModeRef.current === 'coop' && activeCoopRoomRef.current && userRef.current) {
      const room = activeCoopRoomRef.current;
      const isHost = room.hostUid === userRef.current.uid;
      const coopSide: CoopSide = isHost ? 'left' : 'right';
      const partnerName = isHost ? room.guestName : room.hostName;

      engineRef.current?.startNewBattle({
        gameMode: 'coop',
        coopSide,
        isHost,
        partnerName,
        roomCode: room.roomCode,
        initialCoins: COOP_STARTING_COINS,
      });
      engineRef.current?.syncCoopRoomState(room);
    } else {
      engineRef.current?.startNewBattle({ gameMode: 'solo' });
    }
  }, []);

  const handleBattleTransitionFinished = useCallback(() => {
    setBattleTransitioning(false);
  }, []);

  const handleCreateCoopRoom = useCallback(async () => {
    const activeUser = userRef.current;
    if (!activeUser) return;
    setCoopActionLoading(true);
    setCoopError(null);
    try {
      const room = await createCoopRoom(activeUser.uid, saveDataRef.current.displayName);
      coopBattleStartedForRoomIdRef.current = null;
      setActiveCoopRoom(room);
    } catch (err) {
      setCoopError(err instanceof Error ? err.message : '협동 방 생성에 실패했습니다.');
    } finally {
      setCoopActionLoading(false);
    }
  }, []);

  const handleJoinCoopRoomById = useCallback(async (roomId: string) => {
    const activeUser = userRef.current;
    if (!activeUser) return;
    setCoopActionLoading(true);
    setCoopError(null);
    try {
      const room = await joinCoopRoomById(
        roomId,
        activeUser.uid,
        saveDataRef.current.displayName,
      );
      coopBattleStartedForRoomIdRef.current = null;
      setActiveCoopRoom(room);
    } catch (err) {
      setCoopError(err instanceof Error ? err.message : '협동 방 입장에 실패했습니다.');
    } finally {
      setCoopActionLoading(false);
    }
  }, []);

  const handleJoinCoopRoomByCode = useCallback(async (code: string) => {
    const activeUser = userRef.current;
    if (!activeUser) return;
    setCoopActionLoading(true);
    setCoopError(null);
    try {
      const room = await joinCoopRoomByCode(
        code,
        activeUser.uid,
        saveDataRef.current.displayName,
      );
      coopBattleStartedForRoomIdRef.current = null;
      setActiveCoopRoom(room);
    } catch (err) {
      setCoopError(err instanceof Error ? err.message : '방 코드 입장에 실패했습니다.');
    } finally {
      setCoopActionLoading(false);
    }
  }, []);

  const handleCancelCoopRoom = useCallback(async () => {
    const room = activeCoopRoomRef.current;
    setActiveCoopRoom(null);
    coopBattleStartedForRoomIdRef.current = null;
    if (room) {
      await endCoopRoom(room.roomId);
    }
  }, []);

  const handleSendLobbyChat = useCallback(async (text: string) => {
    const activeUser = userRef.current;
    if (!activeUser) return;
    await sendLobbyChatMessage(activeUser.uid, saveDataRef.current.displayName, text);
  }, []);

  const handleSendCoopChat = useCallback(async (text: string) => {
    const activeUser = userRef.current;
    const room = activeCoopRoomRef.current;
    if (!activeUser || !room) return;
    const side: CoopSide = room.hostUid === activeUser.uid ? 'left' : 'right';
    await sendCoopChatMessage(
      room.roomId,
      activeUser.uid,
      saveDataRef.current.displayName,
      side,
      text,
    );
  }, []);

  const handleExitToLobby = useCallback(() => {
    if (hud.phase !== 'game_over' && (hud.totalKills > 0 || hud.wave > 1)) {
      const current = saveDataRef.current;
      const reachedWave = Math.max(current.bestWave, hud.wave - 1);
      const nextTotalKills = current.totalKills + hud.totalKills;
      const nextGamesPlayed = current.gamesPlayed + 1;

      const updated: PlayerSaveData = {
        ...current,
        bestWave: reachedWave,
        totalKills: nextTotalKills,
        gamesPlayed: nextGamesPlayed,
      };
      setSaveData(updated);

      const activeUser = userRef.current;
      if (activeUser && reachedWave > 0) {
        void updateUserProfileFields(activeUser.uid, {
          bestWave: reachedWave,
          totalKills: nextTotalKills,
          gamesPlayed: nextGamesPlayed,
        });
        void upsertLeaderboardRecord(
          activeUser.uid,
          updated.displayName,
          reachedWave,
          hud.totalKills,
          hud.bossesDefeated,
        );
      }
    }

    const room = activeCoopRoomRef.current;
    if (room) {
      void endCoopRoom(room.roomId);
    }
    setActiveCoopRoom(null);
    coopBattleStartedForRoomIdRef.current = null;
    pendingBattleModeRef.current = 'solo';

    setScreen('lobby');
    engineRef.current?.returnToLobby();
  }, [hud.phase, hud.totalKills, hud.wave, hud.bossesDefeated]);

  const handleBuySkin = useCallback((skinId: string, price: number) => {
    const current = saveDataRef.current;
    if (current.crystals < price || current.unlockedSkins.includes(skinId)) return;

    const nextCrystals = current.crystals - price;
    const nextSkins = [...current.unlockedSkins, skinId];

    setSaveData({
      ...current,
      crystals: nextCrystals,
      unlockedSkins: nextSkins,
    });

    if (userRef.current) {
      void updateUserProfileFields(userRef.current.uid, {
        crystals: nextCrystals,
        unlockedSkins: nextSkins,
      });
    }
  }, []);

  const handleEquipSkin = useCallback((towerType: TowerType, skinId: string | undefined) => {
    const current = saveDataRef.current;
    const nextEquipped = { ...current.equippedSkins };
    if (skinId) {
      nextEquipped[towerType] = skinId;
    } else {
      delete nextEquipped[towerType];
    }

    setSaveData({
      ...current,
      equippedSkins: nextEquipped,
    });

    if (userRef.current) {
      void updateUserProfileFields(userRef.current.uid, {
        equippedSkins: nextEquipped,
      });
    }
  }, []);

  const handleBuySkill = useCallback((skillId: SkillId, cost: number) => {
    const current = saveDataRef.current;
    if (current.crystals < cost || current.unlockedSkills.includes(skillId)) return;

    const nextCrystals = current.crystals - cost;
    const nextSkills = [...current.unlockedSkills, skillId];

    setSaveData({
      ...current,
      crystals: nextCrystals,
      unlockedSkills: nextSkills,
    });

    if (userRef.current) {
      void updateUserProfileFields(userRef.current.uid, {
        crystals: nextCrystals,
        unlockedSkills: nextSkills,
      });
    }
  }, []);

  const handleUpdateDisplayName = useCallback(async (rawName: string) => {
    const safeName = sanitizeDisplayName(rawName);
    const current = saveDataRef.current;
    setSaveData({
      ...current,
      displayName: safeName,
    });

    if (userRef.current) {
      await Promise.all([
        updateUserProfileFields(userRef.current.uid, { displayName: safeName }),
        updateLeaderboardDisplayName(userRef.current.uid, safeName),
      ]);
    }
  }, []);

  const handleCycleCamera = useCallback(() => {
    setCameraPreset((prev) => {
      const next =
        prev === CameraPreset.SECOND_PERSON
          ? CameraPreset.TACTICAL_HIGH
          : prev === CameraPreset.TACTICAL_HIGH
            ? CameraPreset.SIDE_FLANK
            : CameraPreset.SECOND_PERSON;
      engineRef.current?.setCameraPreset(next);
      return next;
    });
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const handleUpgradeTower = useCallback(
    (branch?: TowerBranch.PATH_A | TowerBranch.PATH_B) => {
      engineRef.current?.upgradeSelectedTower(branch);
    },
    [],
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0b0f17]">
      {/* Isolated WebGL Canvas Container */}
      <div ref={canvasMountRef} className="absolute inset-0 h-full w-full" />

      {/* Background-only Fade Curtain for 10s Lobby Camera Angle Cuts (sits under LobbyOverlay z-10) */}
      {screen === 'lobby' && !showIntro && (
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed inset-0 z-[5] bg-[#060912] transition-opacity duration-500 ease-in-out ${
            lobbyBgFade ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {screen === 'lobby' ? (
        <div
          className={`relative z-10 transition-opacity duration-700 ease-out ${
            showIntro ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
        >
          <LobbyOverlay
            saveData={saveData}
            isSignedIn={Boolean(firebaseUser)}
            authLoading={authLoading}
            authError={authError}
            leaderboard={leaderboard}
            leaderboardError={leaderboardError}
            supabaseSqlText={supabaseSqlText}
            lobbyMessages={lobbyMessages}
            lobbyChatError={lobbyChatError}
            openCoopRooms={openCoopRooms}
            waitingCoopRoom={
              activeCoopRoom && activeCoopRoom.status === 'waiting' ? activeCoopRoom : null
            }
            coopActionLoading={coopActionLoading}
            coopError={coopError}
            onStartBattle={handleStartBattle}
            onCreateCoopRoom={handleCreateCoopRoom}
            onJoinCoopRoomById={handleJoinCoopRoomById}
            onJoinCoopRoomByCode={handleJoinCoopRoomByCode}
            onCancelCoopRoom={handleCancelCoopRoom}
            onClearCoopError={() => setCoopError(null)}
            onSendLobbyChat={handleSendLobbyChat}
            onSignIn={handleSignIn}
            onSignInRedirect={handleSignInRedirect}
            onDismissAuthError={() => setAuthError(null)}
            onSignOut={handleSignOut}
            onUpdateDisplayName={handleUpdateDisplayName}
            onBuySkin={handleBuySkin}
            onEquipSkin={handleEquipSkin}
            onBuySkill={handleBuySkill}
          />
        </div>
      ) : (
        <BattleHud
          hud={hud}
          unlockedSkills={saveData.unlockedSkills}
          muted={muted}
          cameraPreset={cameraPreset}
          currentUid={saveData.uid}
          isSignedIn={Boolean(firebaseUser)}
          coopMessages={coopMessages}
          coopChatError={coopChatError}
          onSendCoopChat={handleSendCoopChat}
          onStartWave={() => engineRef.current?.startNextWave()}
          onSelectBuildType={(type) => engineRef.current?.setSelectedBuildType(type)}
          onUpgradeTower={handleUpgradeTower}
          onSellTower={() => engineRef.current?.sellSelectedTower()}
          onTriggerSkill={(skillId) => engineRef.current?.triggerLordSkill(skillId)}
          onToggleSpeed={() =>
            engineRef.current?.setSpeedMultiplier(hud.speedMultiplier === 1 ? 2 : 1)
          }
          onCycleCamera={handleCycleCamera}
          onToggleMute={handleToggleMute}
          onRestartBattle={handleStartBattle}
          onExitToLobby={handleExitToLobby}
        />
      )}

      {showIntro && <IntroOverlay onComplete={handleIntroComplete} />}

      <BattleTransitionOverlay
        active={battleTransitioning}
        isCoop={transitionIsCoop}
        onCurtainPeak={handleBattleTransitionPeak}
        onFinished={handleBattleTransitionFinished}
      />
    </div>
  );
}
