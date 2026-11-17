export enum TowerType {
  ARCHER = 'archer',
  FLAME = 'flame',
  FROST = 'frost',
  TESLA = 'tesla',
}

export enum TowerBranch {
  NONE = 'none',
  PATH_A = 'path_a',
  PATH_B = 'path_b',
}

export enum EnemyType {
  GOBLIN = 'goblin',
  ORC = 'orc',
  SHADOW = 'shadow',
  GOLEM = 'golem',
  MINI_BOSS = 'mini_boss',
  BIG_BOSS = 'big_boss',
}

export enum SkillId {
  ARROW_RAIN = 'arrow_rain',
  METEOR_STRIKE = 'meteor_strike',
  ABSOLUTE_ZERO = 'absolute_zero',
}

export enum CameraPreset {
  SECOND_PERSON = 'second_person',
  TACTICAL_HIGH = 'tactical_high',
  SIDE_FLANK = 'side_flank',
}

export interface TowerBranchSpec {
  id: TowerBranch.PATH_A | TowerBranch.PATH_B;
  name: string;
  subtitle: string;
  cost: number;
  damage: number;
  interval: number;
  range: number;
  splashRadius?: number;
  burnChance?: number;
  burnDps?: number;
  slowFactor?: number;
  freezeChance?: number;
  chainCount?: number;
  bossMultiplier?: number;
  critChance?: number;
  multiShot?: number;
  armorMelt?: boolean;
}

export interface TowerTierStats {
  level: 1 | 2 | 3;
  upgradeCost: number; // cost to upgrade TO this level (for level 1, it is build cost)
  damage: number;
  interval: number; // seconds
  range: number; // world units
  splashRadius: number;
  burnChance: number; // 0..1
  burnDps: number;
  slowFactor: number; // 0..1 reduction
  chainCount: number;
  summary: string;
}

export interface TowerDefinition {
  type: TowerType;
  name: string;
  role: string;
  description: string;
  buildCost: number;
  accentColor: string;
  tiers: [TowerTierStats, TowerTierStats, TowerTierStats];
  branches: [TowerBranchSpec, TowerBranchSpec];
}

export interface TowerSkinDefinition {
  id: string;
  towerType: TowerType;
  name: string;
  description: string;
  price: number; // 30 crystals
  primaryColor: number;
  secondaryColor: number;
  accentColor: number;
  projectileColor: number;
  previewHex: string;
}

export interface LordSkillDefinition {
  id: SkillId;
  name: string;
  description: string;
  crystalCost: number;
  cooldown: number; // seconds
  damage: number;
  accentHex: string;
}

export interface PlacedTowerSnapshot {
  id: string;
  slotId: string;
  side: 'left' | 'right';
  col: number;
  row: number;
  type: TowerType;
  level: 1 | 2 | 3 | 4;
  branch: TowerBranch;
  damage: number;
  interval: number;
  range: number;
  kills: number;
  totalSpent: number;
  nextUpgradeCost: number | null;
  sellRefund: number;
}

export type GameMode = 'solo' | 'coop';

export type CoopSide = 'left' | 'right';

export interface BattleHudState {
  gameMode: GameMode;
  coopSide: CoopSide | null;
  partnerName: string | null;
  roomCode: string | null;
  phase: 'prep' | 'wave_active' | 'game_over';
  wave: number;
  coins: number;
  sessionCrystals: number;
  castleHp: number;
  maxCastleHp: number;
  enemiesRemaining: number;
  totalKills: number;
  bossesDefeated: number;
  activeBossType: 'mini_boss' | 'big_boss' | null;
  activeBossName: string | null;
  activeBossHp: number;
  activeBossMaxHp: number;
  speedMultiplier: 1 | 2;
  selectedBuildType: TowerType;
  selectedTower: PlacedTowerSnapshot | null;
  hoveredSlotLabel: string | null;
  skillCooldowns: Record<SkillId, number>;
  bannerMessage: string | null;
}

export interface PlayerSaveData {
  uid: string;
  displayName: string;
  crystals: number;
  unlockedSkins: string[];
  equippedSkins: Partial<Record<TowerType, string>>;
  unlockedSkills: SkillId[];
  bestWave: number;
  totalKills: number;
  gamesPlayed: number;
}

export interface LeaderboardRecord {
  uid: string;
  displayName: string;
  bestWave: number;
  totalKills: number;
  bossesDefeated: number;
  updatedAtMs: number;
}

export interface AuthErrorDiagnostic {
  code: string;
  title: string;
  detail: string;
  hostname: string;
  projectId: string;
  canTryRedirect: boolean;
}

export interface LobbyChatMessage {
  id: string;
  uid: string;
  displayName: string;
  text: string;
  createdAtMs: number;
}

export interface CoopChatMessage {
  id: string;
  uid: string;
  displayName: string;
  side: CoopSide;
  text: string;
  createdAtMs: number;
}

export interface CoopRoomState {
  roomId: string;
  roomCode: string;
  hostUid: string;
  hostName: string;
  guestUid: string;
  guestName: string;
  status: 'waiting' | 'playing' | 'ended';
  wave: number;
  phase: 'prep' | 'wave_active' | 'game_over';
  coins: number;
  castleHp: number;
  speedMultiplier: 1 | 2;
  lastSkillSeq: number;
  lastSkillId: string;
  lastSkillBy: string;
  updatedAtMs: number;
}

export interface CoopTowerRecord {
  slotId: string;
  side: CoopSide;
  col: number;
  row: number;
  type: TowerType;
  level: 1 | 2 | 3 | 4;
  branch: TowerBranch;
  ownerUid: string;
  spent: number;
}

