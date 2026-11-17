import {
  EnemyType,
  GameMode,
  LordSkillDefinition,
  SkillId,
  TowerBranch,
  TowerDefinition,
  TowerSkinDefinition,
  TowerType,
} from '../types/game';

export const STARTING_BATTLE_COINS = 7;
export const WAVE_CLEAR_COIN_REWARD = 3;
export const COOP_STARTING_COINS = 10;
export const COOP_WAVE_CLEAR_COIN_REWARD = 5;
export const MAX_CASTLE_HP = 100;

export const GRID_ROWS = 7;
export const GRID_COLS_PER_SIDE = 3;
export const TILE_SIZE = 2.4;
export const LANE_HALF_WIDTH = 3.2; // Road spans x: -3.2 to +3.2
export const ROAD_START_Z = -23.0;
export const CASTLE_GATE_Z = 15.5;

export const TOWER_DEFINITIONS: Record<TowerType, TowerDefinition> = {
  [TowerType.ARCHER]: {
    type: TowerType.ARCHER,
    name: '아처 타워',
    role: '원거리 정밀 사격',
    description: '1초마다 사격하며 데미지는 낮지만 사거리가 매우 길어 통로 건너편까지 견제합니다.',
    buildCost: 2,
    accentColor: '#38bdf8',
    tiers: [
      {
        level: 1,
        upgradeCost: 2,
        damage: 16,
        interval: 1.0,
        range: 11.5,
        splashRadius: 0,
        burnChance: 0,
        burnDps: 0,
        slowFactor: 0,
        chainCount: 1,
        summary: '1.0초 간격 · 공격력 16 · 사거리 11.5m',
      },
      {
        level: 2,
        upgradeCost: 2,
        damage: 22,
        interval: 0.78,
        range: 12.5,
        splashRadius: 0,
        burnChance: 0,
        burnDps: 0,
        slowFactor: 0,
        chainCount: 1,
        summary: '공속 +22% (0.78초) · 공격력 22 · 사거리 12.5m',
      },
      {
        level: 3,
        upgradeCost: 3,
        damage: 30,
        interval: 0.58,
        range: 13.5,
        splashRadius: 0,
        burnChance: 0,
        burnDps: 0,
        slowFactor: 0,
        chainCount: 1,
        summary: '공속 대폭 상승 (0.58초) · 공격력 30 · 사거리 13.5m',
      },
    ],
    branches: [
      {
        id: TowerBranch.PATH_A,
        name: '폭풍 속사수',
        subtitle: '0.36초 초고속 연사 · 2발 동시 사격',
        cost: 4,
        damage: 26,
        interval: 0.36,
        range: 13.5,
        multiShot: 2,
      },
      {
        id: TowerBranch.PATH_B,
        name: '왕실 명사수',
        subtitle: '초장거리 16m · 35% 치명타 (2.2배)',
        cost: 4,
        damage: 44,
        interval: 0.62,
        range: 16.0,
        critChance: 0.35,
      },
    ],
  },
  [TowerType.FLAME]: {
    type: TowerType.FLAME,
    name: '플레임 타워',
    role: '고화력 폭발 · 화상',
    description: '3초마다 강력한 화염구를 발사해 범위 피해를 주며 30% 확률로 화상을 입힙니다.',
    buildCost: 3,
    accentColor: '#f97316',
    tiers: [
      {
        level: 1,
        upgradeCost: 3,
        damage: 46,
        interval: 3.0,
        range: 7.5,
        splashRadius: 2.6,
        burnChance: 0.3,
        burnDps: 8,
        slowFactor: 0,
        chainCount: 1,
        summary: '3.0초 간격 · 공격력 46 · 범위 2.6m · 화상 30%',
      },
      {
        level: 2,
        upgradeCost: 2,
        damage: 70,
        interval: 2.8,
        range: 8.2,
        splashRadius: 3.0,
        burnChance: 0.38,
        burnDps: 12,
        slowFactor: 0,
        chainCount: 1,
        summary: '공격력 70 · 화상 확률 38% (초당 12 피해)',
      },
      {
        level: 3,
        upgradeCost: 3,
        damage: 98,
        interval: 2.6,
        range: 8.8,
        splashRadius: 3.4,
        burnChance: 0.45,
        burnDps: 18,
        slowFactor: 0,
        chainCount: 1,
        summary: '공격력 98 · 범위 3.4m · 화상 45% (초당 18 피해)',
      },
    ],
    branches: [
      {
        id: TowerBranch.PATH_A,
        name: '지옥불 화로',
        subtitle: '화상 확률 65% · 초당 28 화염 피해 · 4m 폭발',
        cost: 4,
        damage: 112,
        interval: 2.4,
        range: 9.0,
        splashRadius: 4.0,
        burnChance: 0.65,
        burnDps: 28,
      },
      {
        id: TowerBranch.PATH_B,
        name: '유성 화포',
        subtitle: '단일/소범위 극딜 165 · 방어 융해 (+25% 피해)',
        cost: 4,
        damage: 165,
        interval: 2.7,
        range: 9.8,
        splashRadius: 2.8,
        burnChance: 0.4,
        burnDps: 18,
        armorMelt: true,
      },
    ],
  },
  [TowerType.FROST]: {
    type: TowerType.FROST,
    name: '프로스트 타워',
    role: '광역 감속 · 전선 유지',
    description: '냉기 수정을 투사해 범위 내 몬스터의 이동 속도를 38% 늦춰 화력 집중을 돕습니다.',
    buildCost: 3,
    accentColor: '#22d3ee',
    tiers: [
      {
        level: 1,
        upgradeCost: 3,
        damage: 20,
        interval: 1.8,
        range: 7.4,
        splashRadius: 2.5,
        burnChance: 0,
        burnDps: 0,
        slowFactor: 0.38,
        chainCount: 1,
        summary: '1.8초 간격 · 이동속도 38% 감속 · 사거리 7.4m',
      },
      {
        level: 2,
        upgradeCost: 2,
        damage: 30,
        interval: 1.65,
        range: 8.2,
        splashRadius: 2.9,
        burnChance: 0,
        burnDps: 0,
        slowFactor: 0.45,
        chainCount: 1,
        summary: '이동속도 45% 감속 · 공격력 30 · 범위 2.9m',
      },
      {
        level: 3,
        upgradeCost: 3,
        damage: 42,
        interval: 1.5,
        range: 9.0,
        splashRadius: 3.3,
        burnChance: 0,
        burnDps: 0,
        slowFactor: 0.52,
        chainCount: 1,
        summary: '이동속도 52% 감속 · 사거리 9.0m · 범위 3.3m',
      },
    ],
    branches: [
      {
        id: TowerBranch.PATH_A,
        name: '빙결 감옥',
        subtitle: '25% 확률로 1.4초 완전 빙결 (행동 불가)',
        cost: 4,
        damage: 54,
        interval: 1.4,
        range: 9.2,
        splashRadius: 3.4,
        slowFactor: 0.52,
        freezeChance: 0.25,
      },
      {
        id: TowerBranch.PATH_B,
        name: '만년설 오라',
        subtitle: '강력한 62% 광역 감속 · 4.2m 광범위 냉기',
        cost: 4,
        damage: 48,
        interval: 1.35,
        range: 9.6,
        splashRadius: 4.2,
        slowFactor: 0.62,
      },
    ],
  },
  [TowerType.TESLA]: {
    type: TowerType.TESLA,
    name: '라이트닝 타워',
    role: '연쇄 번개 · 다수 제압',
    description: '고압 전류를 방출해 최대 3명의 적에게 튕기는 연쇄 번개 피해를 입힙니다.',
    buildCost: 4,
    accentColor: '#a855f7',
    tiers: [
      {
        level: 1,
        upgradeCost: 4,
        damage: 34,
        interval: 1.4,
        range: 8.5,
        splashRadius: 0,
        burnChance: 0,
        burnDps: 0,
        slowFactor: 0,
        chainCount: 3,
        summary: '1.4초 간격 · 공격력 34 · 3연쇄 · 사거리 8.5m',
      },
      {
        level: 2,
        upgradeCost: 2,
        damage: 48,
        interval: 1.25,
        range: 9.2,
        splashRadius: 0,
        burnChance: 0,
        burnDps: 0,
        slowFactor: 0,
        chainCount: 4,
        summary: '공격력 48 · 4연쇄 · 공속 1.25초',
      },
      {
        level: 3,
        upgradeCost: 3,
        damage: 64,
        interval: 1.1,
        range: 10.0,
        splashRadius: 0,
        burnChance: 0,
        burnDps: 0,
        slowFactor: 0,
        chainCount: 5,
        summary: '공격력 64 · 5연쇄 · 사거리 10.0m',
      },
    ],
    branches: [
      {
        id: TowerBranch.PATH_A,
        name: '연쇄 폭풍',
        subtitle: '최대 7연쇄 전격 · 웨이브 물량 제압 특화',
        cost: 4,
        damage: 74,
        interval: 0.95,
        range: 10.4,
        chainCount: 7,
      },
      {
        id: TowerBranch.PATH_B,
        name: '과부하 광선',
        subtitle: '보스 및 중장갑 대상 +65% 추가 피해',
        cost: 4,
        damage: 98,
        interval: 1.05,
        range: 10.8,
        chainCount: 3,
        bossMultiplier: 1.65,
      },
    ],
  },
};

export const TOWER_SKINS: TowerSkinDefinition[] = [
  {
    id: 'archer_royal_gold',
    towerType: TowerType.ARCHER,
    name: '황금 왕실 아처',
    description: '백금 석재와 순금 쇠뇌, 황금 화살 궤적이 적용됩니다.',
    price: 30,
    primaryColor: 0xf59e0b,
    secondaryColor: 0xe2e8f0,
    accentColor: 0xfef08a,
    projectileColor: 0xfbbf24,
    previewHex: '#f59e0b',
  },
  {
    id: 'archer_moon_shadow',
    towerType: TowerType.ARCHER,
    name: '달빛 그림자 아처',
    description: '흑요석 망루와 청록빛 달빛 궁시 외형으로 변경됩니다.',
    price: 30,
    primaryColor: 0x0f172a,
    secondaryColor: 0x1e293b,
    accentColor: 0x2dd4bf,
    projectileColor: 0x5eead4,
    previewHex: '#2dd4bf',
  },
  {
    id: 'flame_azure_dragon',
    towerType: TowerType.FLAME,
    name: '푸른 용염 플레임',
    description: '청룡 화로와 코발트빛 푸른 불꽃 탄환이 적용됩니다.',
    price: 30,
    primaryColor: 0x1d4ed8,
    secondaryColor: 0x334155,
    accentColor: 0x38bdf8,
    projectileColor: 0x60a5fa,
    previewHex: '#3b82f6',
  },
  {
    id: 'flame_obsidian_hell',
    towerType: TowerType.FLAME,
    name: '흑요석 지옥불',
    description: '검은 용암석과 심홍색 마그마 화염구를 투사합니다.',
    price: 30,
    primaryColor: 0x18181b,
    secondaryColor: 0x450a0a,
    accentColor: 0xf43f5e,
    projectileColor: 0xfb7185,
    previewHex: '#f43f5e',
  },
  {
    id: 'frost_aurora',
    towerType: TowerType.FROST,
    name: '북극 오로라 프로스트',
    description: '에메랄드 빛 오로라 수정 첨탑으로 외형이 변경됩니다.',
    price: 30,
    primaryColor: 0x0f766e,
    secondaryColor: 0xecfeff,
    accentColor: 0x34d399,
    projectileColor: 0x6ee7b7,
    previewHex: '#34d399',
  },
  {
    id: 'tesla_solar_storm',
    towerType: TowerType.TESLA,
    name: '태양 폭풍 테슬라',
    description: '황동 코일과 강렬한 호박색 태양 전격 아크를 방출합니다.',
    price: 30,
    primaryColor: 0xb45309,
    secondaryColor: 0x78350f,
    accentColor: 0xfde047,
    projectileColor: 0xfacc15,
    previewHex: '#facc15',
  },
];

export const LORD_SKILLS: LordSkillDefinition[] = [
  {
    id: SkillId.ARROW_RAIN,
    name: '성벽 화살 비',
    description: '성문 전방 통로에 24발의 황금 화살 비를 퍼부어 광역 110 피해를 줍니다.',
    crystalCost: 25,
    cooldown: 18,
    damage: 110,
    accentHex: '#fbbf24',
  },
  {
    id: SkillId.METEOR_STRIKE,
    name: '천벌의 운석',
    description: '전장 중앙에 거대 운석을 낙하시켜 220 폭발 피해와 100% 화상을 입힙니다.',
    crystalCost: 40,
    cooldown: 26,
    damage: 220,
    accentHex: '#f97316',
  },
  {
    id: SkillId.ABSOLUTE_ZERO,
    name: '절대 영도 빙결',
    description: '통로의 모든 몬스터를 3.5초 동안 완전히 얼리고 85 냉기 피해를 줍니다.',
    crystalCost: 35,
    cooldown: 24,
    damage: 85,
    accentHex: '#22d3ee',
  },
];

export interface EnemyArchetype {
  type: EnemyType;
  name: string;
  baseHp: number;
  baseSpeed: number; // world units per second
  gateDamage: number;
  scale: number;
  color: number;
  accentColor: number;
}

export const ENEMY_ARCHETYPES: Record<EnemyType, EnemyArchetype> = {
  [EnemyType.GOBLIN]: {
    type: EnemyType.GOBLIN,
    name: '고블린 정찰병',
    baseHp: 42,
    baseSpeed: 3.1,
    gateDamage: 6,
    scale: 0.72,
    color: 0x4d7c0f,
    accentColor: 0xa3e635,
  },
  [EnemyType.ORC]: {
    type: EnemyType.ORC,
    name: '오크 돌격병',
    baseHp: 88,
    baseSpeed: 2.3,
    gateDamage: 10,
    scale: 0.96,
    color: 0x3f6212,
    accentColor: 0xd97706,
  },
  [EnemyType.SHADOW]: {
    type: EnemyType.SHADOW,
    name: '그림자 러너',
    baseHp: 64,
    baseSpeed: 4.1,
    gateDamage: 8,
    scale: 0.82,
    color: 0x312e81,
    accentColor: 0xc084fc,
  },
  [EnemyType.GOLEM]: {
    type: EnemyType.GOLEM,
    name: '철갑 골렘',
    baseHp: 175,
    baseSpeed: 1.55,
    gateDamage: 15,
    scale: 1.2,
    color: 0x475569,
    accentColor: 0x38bdf8,
  },
  [EnemyType.MINI_BOSS]: {
    type: EnemyType.MINI_BOSS,
    name: '철혈의 군주 (중간보스)',
    baseHp: 270,
    baseSpeed: 1.38,
    gateDamage: 22,
    scale: 1.65,
    color: 0x7f1d1d,
    accentColor: 0xf59e0b,
  },
  [EnemyType.BIG_BOSS]: {
    type: EnemyType.BIG_BOSS,
    name: '심연의 베히모스 (빅보스)',
    baseHp: 580,
    baseSpeed: 1.15,
    gateDamage: 35,
    scale: 2.25,
    color: 0x1e1b4b,
    accentColor: 0xf43f5e,
  },
};

export interface WaveSpawnItem {
  enemyType: EnemyType;
  hp: number;
  speed: number;
  gateDamage: number;
  spawnDelay: number; // seconds after previous spawn
  laneOffset: number; // x coordinate inside corridor (-2.1 to +2.1)
}

export interface WavePlan {
  wave: number;
  bossKind: 'none' | 'mini_boss' | 'big_boss';
  crystalReward: number;
  spawns: WaveSpawnItem[];
}

export function buildWavePlan(wave: number, mode: GameMode = 'solo'): WavePlan {
  // Big Boss every 10 waves (10, 20, 30...), Mini-Boss every 5 waves excluding 10s (5, 15, 25...)
  const isBigBoss = wave % 10 === 0;
  const isMiniBoss = !isBigBoss && wave % 5 === 0;
  const bossKind: WavePlan['bossKind'] = isBigBoss
    ? 'big_boss'
    : isMiniBoss
      ? 'mini_boss'
      : 'none';

  // Progressive difficulty scaling for unlimited waves
  const baseHpMultiplier = 1 + (wave - 1) * 0.25 + Math.pow(wave - 1, 1.32) * 0.045;
  const baseSpeedMultiplier = 1 + Math.min(1.5, (wave - 1) * 0.028);

  // Co-op difficulty: accessible on Waves 1-3, then ramps 1.5x -> 2.0x harder after Wave 3
  let coopHpScale = 1;
  let coopSpeedScale = 1;
  let coopCountScale = 1;
  let coopCadenceScale = 1;

  if (mode === 'coop') {
    if (wave <= 3) {
      coopHpScale = 1 + (wave - 1) * 0.06; // 1.00 -> 1.06 -> 1.12
      coopSpeedScale = 1.0;
      coopCountScale = 1.12;
      coopCadenceScale = 0.96;
    } else {
      const ramp = Math.min(1, (wave - 4) / 4); // Wave 4 = 0, Wave 8+ = 1
      coopHpScale = 1.5 + ramp * 0.5; // 1.50x at Wave 4 -> 2.00x at Wave 8+
      coopSpeedScale = 1.06 + ramp * 0.08;
      coopCountScale = 1.25 + ramp * 0.25;
      coopCadenceScale = 0.88 - ramp * 0.08;
    }
  }

  const hpMultiplier = baseHpMultiplier * coopHpScale;
  const speedMultiplier = baseSpeedMultiplier * coopSpeedScale;

  const baseCount = Math.min(34, 6 + Math.floor(wave * 1.45));
  const count = Math.min(54, Math.round(baseCount * coopCountScale));
  const spawns: WaveSpawnItem[] = [];

  for (let i = 0; i < count; i++) {
    let type: EnemyType = EnemyType.GOBLIN;
    const roll = (i * 37 + wave * 13) % 100;

    if (wave >= 4 && roll > 78) {
      type = EnemyType.GOLEM;
    } else if (wave >= 3 && roll > 54) {
      type = EnemyType.SHADOW;
    } else if (wave >= 2 && roll > 30) {
      type = EnemyType.ORC;
    }

    const arch = ENEMY_ARCHETYPES[type];
    const laneOffset = (((i % 5) - 2) * 0.82) + (Math.sin(i * 1.7 + wave) * 0.25);

    spawns.push({
      enemyType: type,
      hp: Math.round(arch.baseHp * hpMultiplier),
      speed: Number((arch.baseSpeed * speedMultiplier).toFixed(2)),
      gateDamage: arch.gateDamage,
      spawnDelay: i === 0 ? 0.35 : Math.max(0.28, (1.15 - wave * 0.02) * coopCadenceScale),
      laneOffset: Math.max(-2.1, Math.min(2.1, laneOffset)),
    });
  }

  if (isMiniBoss) {
    const arch = ENEMY_ARCHETYPES[EnemyType.MINI_BOSS];
    const cycleMult = 1 + Math.max(0, Math.floor((wave - 5) / 10)) * 0.15;
    spawns.push({
      enemyType: EnemyType.MINI_BOSS,
      hp: Math.round(arch.baseHp * hpMultiplier * cycleMult),
      speed: Number((arch.baseSpeed * speedMultiplier).toFixed(2)),
      gateDamage: arch.gateDamage,
      spawnDelay: 1.6,
      laneOffset: 0,
    });
  } else if (isBigBoss) {
    const arch = ENEMY_ARCHETYPES[EnemyType.BIG_BOSS];
    const cycleMult = 1 + Math.max(0, Math.floor(wave / 10) - 1) * 0.22;
    spawns.push({
      enemyType: EnemyType.BIG_BOSS,
      hp: Math.round(arch.baseHp * hpMultiplier * cycleMult),
      speed: Number((arch.baseSpeed * speedMultiplier).toFixed(2)),
      gateDamage: arch.gateDamage,
      spawnDelay: 2.0,
      laneOffset: 0,
    });
  }

  const crystalReward =
    (isBigBoss ? 20 : isMiniBoss ? 10 : 5) + (mode === 'coop' ? 2 : 0);

  return {
    wave,
    bossKind,
    crystalReward,
    spawns,
  };
}
