import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import supabaseSqlText from '../supabase_schema.sql?raw';
import { BattleHud } from './components/BattleHud';
import { LobbyOverlay } from './components/LobbyOverlay';
import {
  MAX_CASTLE_HP,
  STARTING_BATTLE_COINS,
} from './data/gameConfig';
import { TowerDefenseEngine } from './game/TowerDefenseEngine';
import { soundEngine } from './lib/audio';
import {
  auth,
  googleAuthProvider,
  testFirestoreConnection,
} from './lib/firebase';
import {
  loadGuestSaveData,
  saveGuestSaveData,
  ensureAndSyncUserProfile,
  subscribeLeaderboard,
  subscribeUserProfile,
  updateUserProfileFields,
  upsertLeaderboardRecord,
} from './lib/playerStorage';
import {
  BattleHudState,
  CameraPreset,
  LeaderboardRecord,
  PlayerSaveData,
  SkillId,
  TowerBranch,
  TowerType,
} from './types/game';

const INITIAL_HUD: BattleHudState = {
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
  const [hud, setHud] = useState<BattleHudState>(INITIAL_HUD);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>(CameraPreset.SECOND_PERSON);
  const [muted, setMuted] = useState(false);

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [saveData, setSaveData] = useState<PlayerSaveData>(() => loadGuestSaveData());
  const [leaderboard, setLeaderboard] = useState<LeaderboardRecord[]>([]);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  // Refs to ensure WebGL callbacks always access fresh user & saveData without remounting canvas
  const userRef = useRef<User | null>(null);
  const saveDataRef = useRef<PlayerSaveData>(saveData);
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

  // Boot Firestore connection check & subscribe to public real-time leaderboard
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
    return () => unsubLb();
  }, []);

  // Firebase Auth state & user profile real-time sync
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
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
    });

    engine.setEquippedSkins(saveDataRef.current.equippedSkins);
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleSignIn = useCallback(async () => {
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error) {
      console.error('Google Sign-In failed:', error);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign-Out failed:', error);
    }
  }, []);

  const handleStartBattle = useCallback(() => {
    setScreen('battle');
    setCameraPreset(CameraPreset.SECOND_PERSON);
    engineRef.current?.setCameraPreset(CameraPreset.SECOND_PERSON);
    engineRef.current?.startNewBattle();
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

      {screen === 'lobby' ? (
        <LobbyOverlay
          saveData={saveData}
          isSignedIn={Boolean(firebaseUser)}
          authLoading={authLoading}
          leaderboard={leaderboard}
          leaderboardError={leaderboardError}
          supabaseSqlText={supabaseSqlText}
          onStartBattle={handleStartBattle}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          onBuySkin={handleBuySkin}
          onEquipSkin={handleEquipSkin}
          onBuySkill={handleBuySkill}
        />
      ) : (
        <BattleHud
          hud={hud}
          unlockedSkills={saveData.unlockedSkills}
          muted={muted}
          cameraPreset={cameraPreset}
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
    </div>
  );
}
