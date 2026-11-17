import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  buildWavePlan,
  CASTLE_GATE_Z,
  COOP_STARTING_COINS,
  COOP_WAVE_CLEAR_COIN_REWARD,
  ENEMY_ARCHETYPES,
  GRID_COLS_PER_SIDE,
  GRID_ROWS,
  LANE_HALF_WIDTH,
  MAX_CASTLE_HP,
  ROAD_START_Z,
  STARTING_BATTLE_COINS,
  TILE_SIZE,
  TOWER_DEFINITIONS,
  TOWER_SKINS,
  WAVE_CLEAR_COIN_REWARD,
  WaveSpawnItem,
} from '../data/gameConfig';
import { soundEngine } from '../lib/audio';
import {
  BattleHudState,
  CameraPreset,
  CoopRoomState,
  CoopSide,
  CoopTowerRecord,
  EnemyType,
  GameMode,
  PlacedTowerSnapshot,
  SkillId,
  TowerBranch,
  TowerSkinDefinition,
  TowerType,
} from '../types/game';
import {
  createCastleBastion,
  createEnemyRig,
  createSpawnArchway,
  createTowerRig,
  EnemyRig,
  TowerRig,
} from './models';
import {
  createCastleMasonryTexture,
  createCobblestoneTexture,
  createContactShadowTexture,
  createCoordinateGridTexture,
} from './textures';
import { ManagedVfx, VfxLibrary } from './vfx';

interface GridSlot {
  id: string;
  label: string;
  side: 'left' | 'right';
  col: number;
  row: number;
  x: number;
  y: number;
  z: number;
  tileMesh: THREE.Mesh;
  towerId: string | null;
}

interface ActiveTower {
  id: string;
  slot: GridSlot;
  type: TowerType;
  level: 1 | 2 | 3 | 4;
  branch: TowerBranch;
  damage: number;
  interval: number;
  range: number;
  splashRadius: number;
  burnChance: number;
  burnDps: number;
  slowFactor: number;
  freezeChance: number;
  chainCount: number;
  bossMultiplier: number;
  critChance: number;
  multiShot: number;
  armorMelt: boolean;
  cooldownTimer: number;
  kills: number;
  totalSpent: number;
  rig: TowerRig;
}

interface ActiveEnemy {
  id: number;
  type: EnemyType;
  hp: number;
  maxHp: number;
  baseSpeed: number;
  gateDamage: number;
  x: number;
  z: number;
  burnTimer: number;
  burnDps: number;
  slowTimer: number;
  slowFactor: number;
  freezeTimer: number;
  armorMelted: boolean;
  walkPhase: number;
  rig: EnemyRig;
}

interface ActiveProjectile {
  mesh: THREE.Group;
  type: TowerType;
  color: number;
  targetEnemyId: number;
  lastKnownPos: THREE.Vector3;
  speed: number;
  damage: number;
  splashRadius: number;
  burnChance: number;
  burnDps: number;
  slowFactor: number;
  freezeChance: number;
  armorMelt: boolean;
  towerRef: ActiveTower;
  isCrit: boolean;
  life: number;
  trailTimer: number;
}

const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _camCurrentLook = new THREE.Vector3(0, 1.0, -4.0);

export interface StartBattleOptions {
  gameMode?: GameMode;
  coopSide?: CoopSide;
  isHost?: boolean;
  partnerName?: string;
  roomCode?: string;
  initialCoins?: number;
}

export interface EngineCallbacks {
  onHudUpdate: (hud: BattleHudState) => void;
  onWaveCleared: (wave: number, crystalsEarned: number, kills: number, bosses: number) => void;
  onGameOver: (waveReached: number, totalKills: number, bossesDefeated: number) => void;
  onCoopBuildTower?: (
    slotId: string,
    side: CoopSide,
    col: number,
    row: number,
    type: TowerType,
    cost: number,
  ) => void;
  onCoopUpgradeTower?: (
    slotId: string,
    cost: number,
    nextLevel: 2 | 3 | 4,
    branch: TowerBranch,
  ) => void;
  onCoopSellTower?: (slotId: string) => void;
  onCoopStartWave?: () => void;
  onCoopWaveCleared?: (
    clearedWave: number,
    crystalsEarned: number,
    kills: number,
    bosses: number,
  ) => void;
  onCoopCastleDamaged?: (nextHp: number) => void;
  onCoopTriggerSkill?: (skillId: SkillId) => void;
  onCoopSpeedChange?: (mult: 1 | 2) => void;
}

export class TowerDefenseEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private frameId = 0;
  private disposed = false;

  private clock = new THREE.Clock();
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();
  private lastHoverRaycastTime = 0;

  private shadowTex: THREE.CanvasTexture;
  private gridTileBaseMat: THREE.MeshStandardMaterial;
  private gridTileHoverMat: THREE.MeshStandardMaterial;
  private gridTileOccupiedMat: THREE.MeshStandardMaterial;
  private gridTileAllyMat: THREE.MeshStandardMaterial;

  private slots: GridSlot[] = [];
  private slotClickables: THREE.Mesh[] = [];
  private hoveredSlot: GridSlot | null = null;
  private selectedSlot: GridSlot | null = null;

  private rangeRingGroup: THREE.Group;
  private rangeRingLine: THREE.Mesh;
  private rangeDisc: THREE.Mesh;

  private vfx = new VfxLibrary();
  private towers = new Map<string, ActiveTower>();
  private enemies: ActiveEnemy[] = [];
  private enemyMap = new Map<number, ActiveEnemy>();
  private projectiles: ActiveProjectile[] = [];
  private effects: ManagedVfx[] = [];

  private nextEnemyId = 1;
  private nextTowerSeq = 1;

  // Game State
  private mode: 'lobby_preview' | 'battle' = 'lobby_preview';
  private gameMode: GameMode = 'solo';
  private coopSide: CoopSide | null = null;
  private isCoopHost = false;
  private partnerName: string | null = null;
  private roomCode: string | null = null;
  private lastSyncedSkillSeq = 0;
  private coopWaveClearSentForWave = 0;

  private phase: 'prep' | 'wave_active' | 'game_over' = 'prep';
  private wave = 1;
  private coins = STARTING_BATTLE_COINS;
  private sessionCrystals = 0;
  private castleHp = MAX_CASTLE_HP;
  private totalKills = 0;
  private bossesDefeated = 0;
  private speedMultiplier: 1 | 2 = 1;
  private selectedBuildType: TowerType = TowerType.ARCHER;

  private pendingSpawns: WaveSpawnItem[] = [];
  private spawnTimer = 0;
  private currentWaveCrystalReward = 5;

  private equippedSkins: Partial<Record<TowerType, string>> = {};
  private skillCooldowns: Record<SkillId, number> = {
    [SkillId.ARROW_RAIN]: 0,
    [SkillId.METEOR_STRIKE]: 0,
    [SkillId.ABSOLUTE_ZERO]: 0,
  };
  private bannerMessage: string | null = null;
  private bannerTimer = 0;

  private cameraPreset: CameraPreset = CameraPreset.SECOND_PERSON;
  private introActive = true;
  private lobbySceneIndex = 0;
  private lobbySceneElapsed = 0;
  private lobbyDemoSpawnTimer = 0.8;
  private lobbyDemoSeq = 0;
  private lastHudPushTime = 0;

  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x0c1322);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(0x0c1322, 0.0145);

    const aspect = (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.2, 160);
    // Start slightly elevated for the intense smooth intro camera push-in toward the castle
    this.camera.position.set(0, 23.5, 36.0);
    _camCurrentLook.set(0, 2.8, -9.0);
    this.camera.lookAt(_camCurrentLook);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.shadowTex = createContactShadowTexture();
    const cobbleTex = createCobblestoneTexture(maxAnisotropy);
    const gridTex = createCoordinateGridTexture(maxAnisotropy);
    const masonryTex = createCastleMasonryTexture(maxAnisotropy);

    this.gridTileBaseMat = new THREE.MeshStandardMaterial({
      map: gridTex,
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.05,
    });
    this.gridTileHoverMat = new THREE.MeshStandardMaterial({
      map: gridTex,
      color: 0xfef08a,
      emissive: 0xd97706,
      emissiveIntensity: 0.5,
      roughness: 0.65,
    });
    this.gridTileOccupiedMat = new THREE.MeshStandardMaterial({
      map: gridTex,
      color: 0x94a3b8,
      roughness: 0.8,
      metalness: 0.12,
    });
    this.gridTileAllyMat = new THREE.MeshStandardMaterial({
      map: gridTex,
      color: 0x334155,
      roughness: 0.9,
      metalness: 0.05,
    });

    this.setupLighting();
    this.buildEnvironment(cobbleTex, masonryTex);
    this.buildGridPlots();

    // Attack Range Indicator Ring
    this.rangeRingGroup = new THREE.Group();
    this.rangeRingGroup.visible = false;
    this.rangeRingLine = new THREE.Mesh(
      new THREE.RingGeometry(0.97, 1.0, 64),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    this.rangeRingLine.rotation.x = -Math.PI / 2;
    this.rangeRingGroup.add(this.rangeRingLine);

    this.rangeDisc = new THREE.Mesh(
      new THREE.CircleGeometry(1.0, 64),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
      }),
    );
    this.rangeDisc.rotation.x = -Math.PI / 2;
    this.rangeDisc.position.y = -0.01;
    this.rangeRingGroup.add(this.rangeDisc);
    this.scene.add(this.rangeRingGroup);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    // Populate a scenic demo tower pair during lobby preview
    this.seedLobbyPreviewTowers();
    this.pushHudState(true);
    this.tick();
  }

  private setupLighting(): void {
    // Cool sky / warm ground Hemisphere fill
    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x292524, 0.85);
    this.scene.add(hemi);

    // Warm Golden Key Light (directional sun/moonlight casting tight shadow frustum)
    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.0);
    keyLight.position.set(16, 28, 18);
    keyLight.castShadow = !this.isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 75;
    keyLight.shadow.camera.left = -24;
    keyLight.shadow.camera.right = 24;
    keyLight.shadow.camera.top = 24;
    keyLight.shadow.camera.bottom = -24;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    // Cool Rim Light from behind the spawn portal for dramatic silhouettes
    const rimLight = new THREE.DirectionalLight(0x6366f1, 0.9);
    rimLight.position.set(-14, 16, -28);
    this.scene.add(rimLight);
  }

  private buildEnvironment(
    cobbleTex: THREE.CanvasTexture,
    masonryTex: THREE.CanvasTexture,
  ): void {
    // Extended Outdoor Terrain (no floating box void)
    const outerTerrain = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 180),
      new THREE.MeshStandardMaterial({
        color: 0x142018,
        roughness: 0.95,
        metalness: 0.02,
      }),
    );
    outerTerrain.rotation.x = -Math.PI / 2;
    outerTerrain.position.y = -0.05;
    outerTerrain.receiveShadow = true;
    this.scene.add(outerTerrain);

    // Central Monster Corridor ("길")
    const roadMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(LANE_HALF_WIDTH * 2, 46),
      new THREE.MeshStandardMaterial({
        map: cobbleTex,
        color: 0xd6d3d1,
        roughness: 0.88,
        metalness: 0.05,
      }),
    );
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0.01, -4);
    roadMesh.receiveShadow = true;
    this.scene.add(roadMesh);

    // Left & Right Stone Curbs framing the corridor (matches diagonal border lines in user's drawing)
    const curbMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.78,
      metalness: 0.14,
    });
    [-LANE_HALF_WIDTH - 0.28, LANE_HALF_WIDTH + 0.28].forEach((xPos) => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.44, 42), curbMat);
      curb.position.set(xPos, 0.22, -4);
      curb.castShadow = true;
      curb.receiveShadow = true;
      this.scene.add(curb);
    });

    // Left & Right Elevated Tower Embankments
    const bankMat = new THREE.MeshStandardMaterial({
      color: 0x1e2c22,
      roughness: 0.92,
      metalness: 0.02,
    });
    [-8.0, 8.0].forEach((xPos) => {
      const bank = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.26, 42), bankMat);
      bank.position.set(xPos, 0.12, -4);
      bank.receiveShadow = true;
      this.scene.add(bank);
    });

    // Castle Wall & Gatehouse ("성") in Foreground (+Z)
    const castle = createCastleBastion(masonryTex, this.shadowTex);
    this.scene.add(castle);

    // Spawn Portal Archway at Far End (-Z)
    const spawnArch = createSpawnArchway();
    this.scene.add(spawnArch);

    // Natural Perimeter Forest & Rocks (InstancedMesh > 20 items)
    this.buildPerimeterFoliageAndRocks();
  }

  private buildPerimeterFoliageAndRocks(): void {
    const treeCount = 64;
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.3, 1.4, 6);
    trunkGeo.translate(0, 0.7, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);

    const canopyGeo = new THREE.ConeGeometry(1.15, 2.9, 7);
    canopyGeo.translate(0, 2.35, 0);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.85 });
    const canopyInst = new THREE.InstancedMesh(canopyGeo, canopyMat, treeCount);

    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();

    for (let i = 0; i < treeCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = -34 + (i * 1.05);
      const x = side * (13.8 + ((i * 7) % 14));
      const scale = 0.85 + ((i * 13) % 30) / 100;

      dummy.position.set(x, 0, z);
      dummy.rotation.y = (i * 1.1) % (Math.PI * 2);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();

      trunkInst.setMatrixAt(i, dummy.matrix);
      canopyInst.setMatrixAt(i, dummy.matrix);

      tint.setHSL(0.36 + ((i % 5) * 0.015), 0.45, 0.22 + ((i % 4) * 0.03));
      canopyInst.setColorAt(i, tint);
    }

    trunkInst.instanceMatrix.needsUpdate = true;
    canopyInst.instanceMatrix.needsUpdate = true;
    if (canopyInst.instanceColor) canopyInst.instanceColor.needsUpdate = true;
    trunkInst.computeBoundingSphere();
    canopyInst.computeBoundingSphere();
    this.scene.add(trunkInst);
    this.scene.add(canopyInst);

    // Distant Perimeter Rocks
    const rockCount = 28;
    const rockGeo = new THREE.DodecahedronGeometry(1.0, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.88 });
    const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    for (let i = 0; i < rockCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      dummy.position.set(side * (12.5 + ((i * 5) % 10)), 0.35, -30 + i * 2.1);
      dummy.rotation.set(i * 0.4, i * 0.9, 0);
      dummy.scale.set(0.9 + (i % 3) * 0.4, 0.65 + (i % 2) * 0.35, 0.9 + (i % 3) * 0.3);
      dummy.updateMatrix();
      rockInst.setMatrixAt(i, dummy.matrix);
    }
    rockInst.instanceMatrix.needsUpdate = true;
    rockInst.computeBoundingSphere();
    this.scene.add(rockInst);
  }

  private buildGridPlots(): void {
    const tileGeo = new THREE.BoxGeometry(TILE_SIZE - 0.14, 0.08, TILE_SIZE - 0.14);
    const zStart = -13.5; // 7 rows extending from z = -13.5 toward castle gate (+Z)

    const sides: Array<'left' | 'right'> = ['left', 'right'];
    for (const side of sides) {
      for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS_PER_SIDE; col++) {
          const x =
            side === 'left'
              ? -(LANE_HALF_WIDTH + 1.85 + col * TILE_SIZE)
              : LANE_HALF_WIDTH + 1.85 + col * TILE_SIZE;
          const z = zStart + row * (TILE_SIZE + 0.35);
          const y = 0.27;

          const tileMesh = new THREE.Mesh(tileGeo, this.gridTileBaseMat);
          tileMesh.position.set(x, y, z);
          tileMesh.receiveShadow = true;

          const sideChar = side === 'left' ? 'L' : 'R';
          const id = `${side}_${col}_${row}`;
          const label = `${sideChar} (${col + 1}, ${row + 1})`;

          const slot: GridSlot = {
            id,
            label,
            side,
            col,
            row,
            x,
            y: y + 0.04,
            z,
            tileMesh,
            towerId: null,
          };
          tileMesh.userData.slot = slot;
          this.slots.push(slot);
          this.slotClickables.push(tileMesh);
          this.scene.add(tileMesh);
        }
      }
    }
  }

  private seedLobbyPreviewTowers(): void {
    const previewPlacements: Array<{ side: 'left' | 'right'; col: number; row: number; type: TowerType }> = [
      { side: 'left', col: 0, row: 5, type: TowerType.ARCHER },
      { side: 'right', col: 0, row: 5, type: TowerType.FLAME },
      { side: 'left', col: 0, row: 3, type: TowerType.FROST },
      { side: 'right', col: 0, row: 3, type: TowerType.TESLA },
    ];
    for (const p of previewPlacements) {
      const slot = this.slots.find((s) => s.side === p.side && s.col === p.col && s.row === p.row);
      if (slot) {
        this.spawnTowerOnSlot(slot, p.type, false);
      }
    }
    this.seedLobbyDemoEnemies();
  }

  private seedLobbyDemoEnemies(): void {
    const initialSpots: Array<{ z: number; laneOffset: number; type: EnemyType }> = [
      { z: -15.5, laneOffset: -1.1, type: EnemyType.SHADOW },
      { z: -9.5, laneOffset: 1.0, type: EnemyType.GOLEM },
      { z: -3.5, laneOffset: -0.4, type: EnemyType.MINI_BOSS },
      { z: 3.0, laneOffset: 1.2, type: EnemyType.ORC },
    ];
    for (const spot of initialSpots) {
      this.spawnLobbyDemoEnemyAt(spot.z, spot.laneOffset, spot.type);
    }
    this.lobbyDemoSpawnTimer = 1.6;
  }

  private spawnLobbyDemoEnemyAt(z: number, laneOffset: number, enemyType: EnemyType): void {
    const arch = ENEMY_ARCHETYPES[enemyType];
    const rig = createEnemyRig(enemyType, this.shadowTex);
    rig.hpBarGroup.visible = false;
    rig.root.position.set(laneOffset, 0.02, z);
    this.scene.add(rig.root);

    const demoHp =
      enemyType === EnemyType.MINI_BOSS
        ? 480
        : enemyType === EnemyType.GOLEM
          ? 280
          : enemyType === EnemyType.ORC
            ? 180
            : 120;

    const enemy: ActiveEnemy = {
      id: this.nextEnemyId++,
      type: enemyType,
      hp: demoHp,
      maxHp: demoHp,
      baseSpeed: arch.baseSpeed * 0.88,
      gateDamage: 0,
      x: laneOffset,
      z,
      burnTimer: 0,
      burnDps: 0,
      slowTimer: 0,
      slowFactor: 0,
      freezeTimer: 0,
      armorMelted: false,
      walkPhase: Math.random() * Math.PI * 2,
      rig,
    };
    this.enemies.push(enemy);
    this.enemyMap.set(enemy.id, enemy);
  }

  // ===========================================================================
  // Public API for React UI
  // ===========================================================================

  public setIntroActive(active: boolean): void {
    this.introActive = active;
  }

  public setLobbyScene(index: number, snap = false): void {
    this.lobbySceneIndex = ((index % 4) + 4) % 4;
    this.lobbySceneElapsed = 0;
    if (snap && this.mode === 'lobby_preview') {
      this.computeLobbySceneCamera(this.lobbySceneIndex, 0, _camTargetPos, _camTargetLook);
      this.camera.position.copy(_camTargetPos);
      _camCurrentLook.copy(_camTargetLook);
      this.camera.lookAt(_camCurrentLook);
    }
  }

  public startNewBattle(options: StartBattleOptions = {}): void {
    this.introActive = false;
    this.lobbySceneIndex = 0;
    this.lobbySceneElapsed = 0;
    this.clearBattleEntities();

    this.mode = 'battle';
    this.gameMode = options.gameMode ?? 'solo';
    this.coopSide = this.gameMode === 'coop' ? (options.coopSide ?? 'left') : null;
    this.isCoopHost = this.gameMode === 'coop' ? Boolean(options.isHost) : false;
    this.partnerName = this.gameMode === 'coop' ? (options.partnerName ?? null) : null;
    this.roomCode = this.gameMode === 'coop' ? (options.roomCode ?? null) : null;
    this.lastSyncedSkillSeq = 0;
    this.coopWaveClearSentForWave = 0;

    this.phase = 'prep';
    this.wave = 1;
    this.coins =
      options.initialCoins ??
      (this.gameMode === 'coop' ? COOP_STARTING_COINS : STARTING_BATTLE_COINS);
    this.sessionCrystals = 0;
    this.castleHp = MAX_CASTLE_HP;
    this.totalKills = 0;
    this.bossesDefeated = 0;
    this.speedMultiplier = 1;
    this.selectedSlot = null;
    this.hoveredSlot = null;
    this.skillCooldowns = {
      [SkillId.ARROW_RAIN]: 0,
      [SkillId.METEOR_STRIKE]: 0,
      [SkillId.ABSOLUTE_ZERO]: 0,
    };

    for (const slot of this.slots) {
      slot.tileMesh.material = this.getDefaultSlotMaterial(slot);
    }

    // Start elevated so the scene transition reveals a smooth swoop into the 2nd-person battlement
    this.camera.position.set(0, 25.5, 34.5);
    _camCurrentLook.set(0, 1.8, -8.5);
    this.camera.lookAt(_camCurrentLook);

    if (this.gameMode === 'coop' && this.coopSide) {
      const sideLabel = this.coopSide === 'left' ? '왼쪽 진영' : '오른쪽 진영';
      this.showBanner(
        `실시간 협동 시작! 당신은 [${sideLabel}] 담당입니다. (공용 코인 · 웨이브당 +5)`,
        5.0,
      );
    } else {
      this.showBanner('전투 준비! 격자 위에 타워를 배치한 뒤 웨이브를 시작하세요.', 4.0);
    }
    this.updateRangeIndicator();
    this.pushHudState(true);
  }

  public returnToLobby(): void {
    this.introActive = false;
    this.lobbySceneIndex = 0;
    this.lobbySceneElapsed = 0;
    this.gameMode = 'solo';
    this.coopSide = null;
    this.isCoopHost = false;
    this.partnerName = null;
    this.roomCode = null;
    this.clearBattleEntities();
    this.mode = 'lobby_preview';
    this.phase = 'prep';
    this.selectedSlot = null;
    this.hoveredSlot = null;
    this.cameraPreset = CameraPreset.SECOND_PERSON;
    this.seedLobbyPreviewTowers();
    this.updateRangeIndicator();
    this.pushHudState(true);
  }

  private getDefaultSlotMaterial(slot: GridSlot): THREE.MeshStandardMaterial {
    if (slot.towerId) return this.gridTileOccupiedMat;
    if (this.mode === 'battle' && this.gameMode === 'coop' && this.coopSide && slot.side !== this.coopSide) {
      return this.gridTileAllyMat;
    }
    return this.gridTileBaseMat;
  }

  public startNextWave(): void {
    if (this.mode !== 'battle' || this.phase !== 'prep') return;
    if (this.gameMode === 'coop') {
      this.callbacks.onCoopStartWave?.();
      return;
    }
    this.beginWaveInternal(this.wave);
  }

  private beginWaveInternal(waveNum: number): void {
    this.wave = waveNum;
    const plan = buildWavePlan(waveNum, this.gameMode);
    this.pendingSpawns = [...plan.spawns];
    this.spawnTimer = 0.2;
    this.currentWaveCrystalReward = plan.crystalReward;
    this.phase = 'wave_active';

    if (plan.bossKind === 'big_boss') {
      this.showBanner(`제 ${waveNum} 웨이브 — 빅 보스 [심연의 베히모스] 출현!`, 4.5);
      soundEngine.playWaveStart(true);
    } else if (plan.bossKind === 'mini_boss') {
      this.showBanner(`제 ${waveNum} 웨이브 — 중간보스 [철혈의 군주] 출현!`, 4.0);
      soundEngine.playWaveStart(true);
    } else if (this.gameMode === 'coop' && waveNum === 4) {
      this.showBanner('제 4 웨이브 — 협동전 카오스 강화 구간 진입! (1.5배~2배 난이도)', 4.2);
      soundEngine.playWaveStart(true);
    } else {
      this.showBanner(`제 ${waveNum} 웨이브 시작!`, 2.2);
      soundEngine.playWaveStart(false);
    }
    this.pushHudState(true);
  }

  public syncCoopRoomState(room: CoopRoomState): void {
    if (this.mode !== 'battle' || this.gameMode !== 'coop') return;

    this.coins = room.coins;
    this.speedMultiplier = room.speedMultiplier;

    if (!this.isCoopHost) {
      this.castleHp = room.castleHp;
    }

    if (room.lastSkillSeq > this.lastSyncedSkillSeq && room.lastSkillId) {
      this.lastSyncedSkillSeq = room.lastSkillSeq;
      if (this.phase === 'wave_active') {
        this.executeLordSkillEffect(room.lastSkillId as SkillId, false);
      }
    }

    if (room.phase === 'game_over' && this.phase !== 'game_over') {
      this.phase = 'game_over';
      this.pendingSpawns = [];
      this.castleHp = 0;
      this.showBanner('성문이 함락되었습니다! 협동 방어 종료', 6.0);
      if (!this.isCoopHost) {
        this.callbacks.onGameOver(this.wave, this.totalKills, this.bossesDefeated);
      }
      this.pushHudState(true);
      return;
    }

    if (!this.isCoopHost && room.wave > this.wave && this.phase === 'wave_active') {
      // Host cleared wave on authoritative timeline; finalize guest wave clear cleanly
      const clearedWave = room.wave - 1;
      for (const e of this.enemies) {
        this.scene.remove(e.rig.root);
        this.disposeObject3D(e.rig.root);
      }
      this.enemies = [];
      this.enemyMap.clear();
      this.pendingSpawns = [];

      this.sessionCrystals += this.currentWaveCrystalReward;
      this.callbacks.onWaveCleared(
        clearedWave,
        this.currentWaveCrystalReward,
        this.totalKills,
        this.bossesDefeated,
      );
      this.wave = room.wave;
      this.phase = 'prep';
      this.showBanner(
        `제 ${clearedWave} 웨이브 협동 방어 성공! (+${COOP_WAVE_CLEAR_COIN_REWARD} 공용 코인 · +${this.currentWaveCrystalReward} 크리스탈)`,
        3.2,
      );
    }

    if (room.phase === 'wave_active' && this.phase === 'prep' && room.wave === this.wave) {
      this.beginWaveInternal(room.wave);
      return;
    }

    this.pushHudState(true);
  }

  public syncCoopTowers(remoteTowers: CoopTowerRecord[]): void {
    if (this.mode !== 'battle' || this.gameMode !== 'coop') return;

    const remoteBySlot = new Map<string, CoopTowerRecord>();
    for (const r of remoteTowers) {
      remoteBySlot.set(r.slotId, r);
    }

    // 1. Remove local towers absent from authoritative remote list
    for (const [towerId, tower] of Array.from(this.towers.entries())) {
      if (!remoteBySlot.has(tower.slot.id)) {
        this.scene.remove(tower.rig.root);
        this.disposeObject3D(tower.rig.root);
        this.towers.delete(towerId);
        tower.slot.towerId = null;
        if (this.selectedSlot === tower.slot) {
          this.selectedSlot = null;
        }
        tower.slot.tileMesh.material = this.getDefaultSlotMaterial(tower.slot);
      }
    }

    // 2. Add or upgrade towers to match remote records
    for (const remote of remoteTowers) {
      const slot = this.slots.find((s) => s.id === remote.slotId);
      if (!slot) continue;

      if (!slot.towerId) {
        this.spawnTowerOnSlot(slot, remote.type, false);
        const created = slot.towerId ? this.towers.get(slot.towerId) : undefined;
        if (created) {
          created.totalSpent = remote.spent;
          if (remote.level > 1) {
            this.applyTowerLevelAndBranch(created, remote.level, remote.branch);
          }
          soundEngine.playBuildOrUpgrade();
        }
      } else {
        const existingTower = this.towers.get(slot.towerId);
        if (
          existingTower &&
          (existingTower.level !== remote.level || existingTower.branch !== remote.branch)
        ) {
          existingTower.totalSpent = remote.spent;
          this.applyTowerLevelAndBranch(existingTower, remote.level, remote.branch);
          soundEngine.playBuildOrUpgrade();
        } else if (existingTower) {
          existingTower.totalSpent = remote.spent;
        }
      }
    }

    this.updateRangeIndicator();
    this.pushHudState(true);
  }

  private applyTowerLevelAndBranch(
    tower: ActiveTower,
    targetLevel: 1 | 2 | 3 | 4,
    branch: TowerBranch,
  ): void {
    const def = TOWER_DEFINITIONS[tower.type];
    if (targetLevel <= 3) {
      const tier = def.tiers[targetLevel - 1];
      if (!tier) return;
      tower.level = tier.level;
      tower.branch = TowerBranch.NONE;
      tower.damage = tier.damage;
      tower.interval = tier.interval;
      tower.range = tier.range;
      tower.splashRadius = tier.splashRadius;
      tower.burnChance = tier.burnChance;
      tower.burnDps = tier.burnDps;
      tower.slowFactor = tier.slowFactor;
      tower.chainCount = tier.chainCount;
    } else {
      const spec = def.branches.find((b) => b.id === branch) ?? def.branches[0];
      tower.level = 4;
      tower.branch = spec.id;
      tower.damage = spec.damage;
      tower.interval = spec.interval;
      tower.range = spec.range;
      tower.splashRadius = spec.splashRadius ?? tower.splashRadius;
      tower.burnChance = spec.burnChance ?? tower.burnChance;
      tower.burnDps = spec.burnDps ?? tower.burnDps;
      tower.slowFactor = spec.slowFactor ?? tower.slowFactor;
      tower.freezeChance = spec.freezeChance ?? 0;
      tower.chainCount = spec.chainCount ?? tower.chainCount;
      tower.bossMultiplier = spec.bossMultiplier ?? 1;
      tower.critChance = spec.critChance ?? 0;
      tower.multiShot = spec.multiShot ?? 1;
      tower.armorMelt = Boolean(spec.armorMelt);
    }
    this.rebuildTowerRig(tower);
  }

  public setSelectedBuildType(type: TowerType): void {
    this.selectedBuildType = type;
    this.updateRangeIndicator();
    this.pushHudState(true);
  }

  public setSpeedMultiplier(mult: 1 | 2): void {
    if (this.gameMode === 'coop') {
      this.callbacks.onCoopSpeedChange?.(mult);
      return;
    }
    this.speedMultiplier = mult;
    this.pushHudState(true);
  }

  public setCameraPreset(preset: CameraPreset): void {
    this.cameraPreset = preset;
  }

  public setEquippedSkins(skins: Partial<Record<TowerType, string>>): void {
    this.equippedSkins = { ...skins };
    // Refresh all existing towers visually to reflect newly equipped skin
    for (const tower of this.towers.values()) {
      this.rebuildTowerRig(tower);
    }
  }

  public upgradeSelectedTower(branchChoice?: TowerBranch.PATH_A | TowerBranch.PATH_B): void {
    if (this.mode !== 'battle' || this.phase === 'game_over' || !this.selectedSlot?.towerId) return;
    const tower = this.towers.get(this.selectedSlot.towerId);
    if (!tower) return;

    if (this.gameMode === 'coop' && this.coopSide && tower.slot.side !== this.coopSide) {
      this.showBanner('파트너의 타워는 강화할 수 없습니다.', 2.0);
      this.pushHudState(true);
      return;
    }

    const def = TOWER_DEFINITIONS[tower.type];

    if (tower.level < 3) {
      const nextLevel: 2 | 3 = tower.level === 1 ? 2 : 3;
      const nextTier = def.tiers[nextLevel - 1];
      if (!nextTier || this.coins < nextTier.upgradeCost) return;

      if (this.gameMode === 'coop') {
        this.callbacks.onCoopUpgradeTower?.(
          tower.slot.id,
          nextTier.upgradeCost,
          nextLevel,
          TowerBranch.NONE,
        );
        return;
      }

      this.coins -= nextTier.upgradeCost;
      tower.totalSpent += nextTier.upgradeCost;
      this.applyTowerLevelAndBranch(tower, nextTier.level, TowerBranch.NONE);
      this.updateRangeIndicator();
      soundEngine.playBuildOrUpgrade();
      this.pushHudState(true);
    } else if (tower.level === 3 && branchChoice) {
      const spec = def.branches.find((b) => b.id === branchChoice);
      if (!spec || this.coins < spec.cost) return;

      if (this.gameMode === 'coop') {
        this.callbacks.onCoopUpgradeTower?.(tower.slot.id, spec.cost, 4, spec.id);
        return;
      }

      this.coins -= spec.cost;
      tower.totalSpent += spec.cost;
      this.applyTowerLevelAndBranch(tower, 4, spec.id);
      this.updateRangeIndicator();
      soundEngine.playBuildOrUpgrade();
      this.pushHudState(true);
    }
  }

  public sellSelectedTower(): void {
    if (this.mode !== 'battle' || this.phase === 'game_over' || !this.selectedSlot?.towerId) return;
    const tower = this.towers.get(this.selectedSlot.towerId);
    if (!tower) return;

    if (this.gameMode === 'coop' && this.coopSide && tower.slot.side !== this.coopSide) {
      this.showBanner('파트너의 타워는 회수할 수 없습니다.', 2.0);
      this.pushHudState(true);
      return;
    }

    if (this.gameMode === 'coop') {
      this.callbacks.onCoopSellTower?.(tower.slot.id);
      return;
    }

    const refund = Math.max(1, Math.floor(tower.totalSpent * 0.7));
    this.coins += refund;
    this.scene.remove(tower.rig.root);
    this.disposeObject3D(tower.rig.root);
    this.towers.delete(tower.id);
    this.selectedSlot.towerId = null;
    this.selectedSlot.tileMesh.material = this.getDefaultSlotMaterial(this.selectedSlot);
    this.selectedSlot = null;
    this.updateRangeIndicator();
    soundEngine.playBuildOrUpgrade();
    this.pushHudState(true);
  }

  public triggerLordSkill(skillId: SkillId): void {
    if (this.mode !== 'battle' || this.phase !== 'wave_active') return;
    if (this.skillCooldowns[skillId] > 0) return;

    if (this.gameMode === 'coop') {
      this.skillCooldowns[skillId] =
        skillId === SkillId.ARROW_RAIN ? 18 : skillId === SkillId.METEOR_STRIKE ? 26 : 24;
      this.callbacks.onCoopTriggerSkill?.(skillId);
      this.pushHudState(true);
      return;
    }

    this.executeLordSkillEffect(skillId, true);
    this.pushHudState(true);
  }

  private executeLordSkillEffect(skillId: SkillId, setCooldown: boolean): void {
    soundEngine.playLordSkill();

    if (skillId === SkillId.ARROW_RAIN) {
      if (setCooldown) this.skillCooldowns[skillId] = 18;
      const targetZ = this.enemies.length > 0 ? this.enemies[0].z : 2;
      this.spawnArrowRainEffect(0, targetZ);
      for (const e of this.enemies) {
        if (Math.abs(e.z - targetZ) <= 6.5) {
          this.damageEnemy(e, 110);
        }
      }
      this.showBanner('성주 특수공격 발동: 성벽 화살 비!', 2.2);
    } else if (skillId === SkillId.METEOR_STRIKE) {
      if (setCooldown) this.skillCooldowns[skillId] = 26;
      const targetEnemy = this.enemies[0];
      const targetX = targetEnemy ? targetEnemy.x : 0;
      const targetZ = targetEnemy ? targetEnemy.z : -2;
      this.spawnMeteorEffect(targetX, targetZ);
      for (const e of this.enemies) {
        const dist = Math.hypot(e.x - targetX, e.z - targetZ);
        if (dist <= 5.5) {
          this.damageEnemy(e, 220);
          e.burnTimer = Math.max(e.burnTimer, 4.5);
          e.burnDps = Math.max(e.burnDps, 24);
        }
      }
      this.showBanner('성주 특수공격 발동: 천벌의 운석!', 2.5);
    } else if (skillId === SkillId.ABSOLUTE_ZERO) {
      if (setCooldown) this.skillCooldowns[skillId] = 24;
      this.spawnFrostWaveEffect();
      for (const e of this.enemies) {
        this.damageEnemy(e, 85);
        e.freezeTimer = Math.max(e.freezeTimer, 3.5);
        e.slowTimer = Math.max(e.slowTimer, 5.0);
        e.slowFactor = Math.max(e.slowFactor, 0.5);
      }
      this.showBanner('성주 특수공격 발동: 절대 영도 빙결!', 2.5);
    }
  }

  // ===========================================================================
  // Internal Combat & Simulation Loop
  // ===========================================================================

  private clearBattleEntities(): void {
    for (const t of this.towers.values()) {
      this.scene.remove(t.rig.root);
      this.disposeObject3D(t.rig.root);
    }
    this.towers.clear();

    for (const slot of this.slots) {
      slot.towerId = null;
      slot.tileMesh.material = this.gridTileBaseMat;
    }

    for (const e of this.enemies) {
      this.scene.remove(e.rig.root);
      this.disposeObject3D(e.rig.root);
    }
    this.enemies = [];
    this.enemyMap.clear();

    for (const p of this.projectiles) {
      this.scene.remove(p.mesh);
    }
    this.projectiles = [];

    for (const fx of this.effects) {
      this.scene.remove(fx.object);
    }
    this.effects = [];

    this.pendingSpawns = [];
  }

  private getSkinForType(type: TowerType): TowerSkinDefinition | undefined {
    const skinId = this.equippedSkins[type];
    if (!skinId) return undefined;
    return TOWER_SKINS.find((s) => s.id === skinId);
  }

  private spawnTowerOnSlot(slot: GridSlot, type: TowerType, spendCoins: boolean): void {
    const def = TOWER_DEFINITIONS[type];
    if (spendCoins && this.coins < def.buildCost) return;
    if (spendCoins) {
      this.coins -= def.buildCost;
    }

    const tier1 = def.tiers[0];
    const rig = createTowerRig(type, 1, TowerBranch.NONE, this.getSkinForType(type));
    rig.root.position.set(slot.x, slot.y, slot.z);
    // Face toward the central lane
    rig.turret.rotation.y = slot.side === 'left' ? Math.PI / 2 : -Math.PI / 2;
    this.scene.add(rig.root);

    const id = `t_${this.nextTowerSeq++}`;
    const tower: ActiveTower = {
      id,
      slot,
      type,
      level: 1,
      branch: TowerBranch.NONE,
      damage: tier1.damage,
      interval: tier1.interval,
      range: tier1.range,
      splashRadius: tier1.splashRadius,
      burnChance: tier1.burnChance,
      burnDps: tier1.burnDps,
      slowFactor: tier1.slowFactor,
      freezeChance: 0,
      chainCount: tier1.chainCount,
      bossMultiplier: 1,
      critChance: 0,
      multiShot: 1,
      armorMelt: false,
      cooldownTimer: 0.25,
      kills: 0,
      totalSpent: def.buildCost,
      rig,
    };

    this.towers.set(id, tower);
    slot.towerId = id;
    slot.tileMesh.material = this.gridTileOccupiedMat;
    if (spendCoins) {
      soundEngine.playBuildOrUpgrade();
    }
  }

  private rebuildTowerRig(tower: ActiveTower): void {
    const prevRot = tower.rig.turret.rotation.y;
    this.scene.remove(tower.rig.root);
    this.disposeObject3D(tower.rig.root);

    const newRig = createTowerRig(
      tower.type,
      tower.level,
      tower.branch,
      this.getSkinForType(tower.type),
    );
    newRig.root.position.set(tower.slot.x, tower.slot.y, tower.slot.z);
    newRig.turret.rotation.y = prevRot;
    this.scene.add(newRig.root);
    tower.rig = newRig;
  }

  private spawnEnemyFromPlan(item: WaveSpawnItem): void {
    const rig = createEnemyRig(item.enemyType, this.shadowTex);
    rig.root.position.set(item.laneOffset, 0.02, ROAD_START_Z);
    this.scene.add(rig.root);

    const enemy: ActiveEnemy = {
      id: this.nextEnemyId++,
      type: item.enemyType,
      hp: item.hp,
      maxHp: item.hp,
      baseSpeed: item.speed,
      gateDamage: item.gateDamage,
      x: item.laneOffset,
      z: ROAD_START_Z,
      burnTimer: 0,
      burnDps: 0,
      slowTimer: 0,
      slowFactor: 0,
      freezeTimer: 0,
      armorMelted: false,
      walkPhase: Math.random() * Math.PI * 2,
      rig,
    };
    this.enemies.push(enemy);
    this.enemyMap.set(enemy.id, enemy);
  }

  private damageEnemy(enemy: ActiveEnemy, rawDamage: number, sourceTower?: ActiveTower): void {
    if (enemy.hp <= 0) return;
    const mult = enemy.armorMelted ? 1.25 : 1;
    enemy.hp -= rawDamage * mult;
    if (enemy.hp <= 0 && sourceTower) {
      sourceTower.kills += 1;
    }
  }

  private updateTowerCombat(dt: number, silent = false): void {
    for (const tower of this.towers.values()) {
      tower.cooldownTimer -= dt;

      // Subtle idle rotation on frost crystal & tesla orb
      if (tower.type === TowerType.FROST || tower.type === TowerType.TESLA) {
        tower.rig.turret.rotation.y += dt * 1.4;
      }
      // Recover turret recoil smoothly
      if (tower.rig.turret.scale.y !== 1) {
        tower.rig.turret.scale.y = THREE.MathUtils.damp(tower.rig.turret.scale.y, 1, 14, dt);
      }

      if (this.enemies.length === 0) continue;

      // Find enemy closest to castle gate within tower range
      let bestTarget: ActiveEnemy | null = null;
      let bestZ = -999;

      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];
        if (e.hp <= 0) continue;
        const dx = e.x - tower.slot.x;
        const dz = e.z - tower.slot.z;
        if (dx * dx + dz * dz <= tower.range * tower.range && e.z > bestZ) {
          bestZ = e.z;
          bestTarget = e;
        }
      }

      if (!bestTarget) continue;

      // Orient turret toward target
      if (tower.type === TowerType.ARCHER || tower.type === TowerType.FLAME) {
        tower.rig.turret.rotation.y = Math.atan2(
          bestTarget.x - tower.slot.x,
          bestTarget.z - tower.slot.z,
        );
      }

      if (tower.cooldownTimer > 0) continue;
      tower.cooldownTimer = tower.interval;

      // Recoil squash kickback
      tower.rig.turret.scale.y = 0.86;
      this.fireTower(tower, bestTarget, silent);
    }
  }

  private fireTower(tower: ActiveTower, target: ActiveEnemy, silent = false): void {
    const skin = this.getSkinForType(tower.type);

    if (tower.type === TowerType.TESLA) {
      if (!silent) soundEngine.playTeslaZap();
      const arcColor = skin ? skin.projectileColor : 0xc084fc;
      const hitIds = new Set<number>();
      let currentOrigin = _vecA.set(
        tower.slot.x,
        tower.slot.y + tower.rig.muzzleOffset.y,
        tower.slot.z,
      );
      this.effects.push(this.vfx.spawnMuzzleFlash(this.scene, currentOrigin, arcColor));

      let currentTarget: ActiveEnemy | null = target;
      let currentDmg = tower.damage;

      for (let hop = 0; hop < tower.chainCount && currentTarget; hop++) {
        hitIds.add(currentTarget.id);
        const isBoss =
          currentTarget.type === EnemyType.MINI_BOSS ||
          currentTarget.type === EnemyType.BIG_BOSS;
        const dmg = isBoss ? currentDmg * tower.bossMultiplier : currentDmg;
        this.damageEnemy(currentTarget, dmg, tower);

        _vecB.set(currentTarget.x, 1.05, currentTarget.z);
        this.effects.push(this.vfx.spawnPlasmaLightning(this.scene, currentOrigin, _vecB, arcColor));
        currentOrigin = _vecB.clone();
        currentDmg *= 0.82;

        // Find next nearest unhit enemy within 4.8m
        let nextEnemy: ActiveEnemy | null = null;
        let minDistSq = 4.8 * 4.8;
        for (let i = 0; i < this.enemies.length; i++) {
          const candidate = this.enemies[i];
          if (candidate.hp <= 0 || hitIds.has(candidate.id)) continue;
          const dx = candidate.x - currentTarget.x;
          const dz = candidate.z - currentTarget.z;
          const dSq = dx * dx + dz * dz;
          if (dSq < minDistSq) {
            minDistSq = dSq;
            nextEnemy = candidate;
          }
        }
        currentTarget = nextEnemy;
      }
      return;
    }

    // Projectile-based towers (Archer, Flame, Frost)
    const shots = tower.multiShot;
    const muzzlePos = _vecA.set(
      tower.slot.x,
      tower.slot.y + tower.rig.muzzleOffset.y,
      tower.slot.z,
    );
    const projColor = skin
      ? skin.projectileColor
      : tower.type === TowerType.ARCHER
        ? 0xfef08a
        : tower.type === TowerType.FLAME
          ? 0xf97316
          : 0x38bdf8;

    this.effects.push(this.vfx.spawnMuzzleFlash(this.scene, muzzlePos, projColor));

    for (let s = 0; s < shots; s++) {
      let projTarget = target;
      if (s > 0) {
        const alt = this.enemies.find(
          (e) =>
            e.hp > 0 &&
            e.id !== target.id &&
            Math.hypot(e.x - tower.slot.x, e.z - tower.slot.z) <= tower.range,
        );
        if (alt) projTarget = alt;
      }

      const isCrit = tower.critChance > 0 && Math.random() < tower.critChance;
      const finalDmg = isCrit ? tower.damage * 2.2 : tower.damage;

      const mesh =
        tower.type === TowerType.ARCHER
          ? this.vfx.createArcherProjectile(projColor)
          : tower.type === TowerType.FLAME
            ? this.vfx.createFlameProjectile(projColor)
            : this.vfx.createFrostProjectile(projColor);

      mesh.position.set(
        tower.slot.x + (s === 1 ? 0.25 : 0),
        tower.slot.y + tower.rig.muzzleOffset.y,
        tower.slot.z,
      );
      this.scene.add(mesh);

      this.projectiles.push({
        mesh,
        type: tower.type,
        color: projColor,
        targetEnemyId: projTarget.id,
        lastKnownPos: new THREE.Vector3(projTarget.x, 1.0, projTarget.z),
        speed: tower.type === TowerType.ARCHER ? 28 : tower.type === TowerType.FROST ? 18 : 16,
        damage: finalDmg,
        splashRadius: tower.splashRadius,
        burnChance: tower.burnChance,
        burnDps: tower.burnDps,
        slowFactor: tower.slowFactor,
        freezeChance: tower.freezeChance,
        armorMelt: tower.armorMelt,
        towerRef: tower,
        isCrit,
        life: 3.0,
        trailTimer: 0,
      });
    }

    if (!silent) {
      if (tower.type === TowerType.ARCHER) soundEngine.playBowShot();
      else if (tower.type === TowerType.FLAME) soundEngine.playFlameLaunch();
      else if (tower.type === TowerType.FROST) soundEngine.playFrostPulse();
    }
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;

      const target = this.enemyMap.get(p.targetEnemyId);
      if (target && target.hp > 0) {
        p.lastKnownPos.set(target.x, 1.0, target.z);
      }

      _vecA.subVectors(p.lastKnownPos, p.mesh.position);
      const dist = _vecA.length();
      const step = p.speed * dt;

      if (dist <= step + 0.35 || p.life <= 0) {
        this.resolveProjectileImpact(p, p.lastKnownPos);
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      } else {
        _vecA.normalize().multiplyScalar(step);
        p.mesh.position.add(_vecA);
        p.mesh.lookAt(p.lastKnownPos);

        if (p.type === TowerType.FLAME) {
          p.mesh.rotation.z += dt * 10;
          p.trailTimer += dt;
          if (p.trailTimer >= 0.045) {
            p.trailTimer = 0;
            this.effects.push(this.vfx.spawnFlameEmber(this.scene, p.mesh.position, p.color));
          }
        } else if (p.type === TowerType.FROST) {
          p.mesh.rotation.z += dt * 12;
        }
      }
    }
  }

  private resolveProjectileImpact(p: ActiveProjectile, impactPos: THREE.Vector3): void {
    if (p.splashRadius > 0) {
      if (p.type === TowerType.FLAME) {
        this.effects.push(
          ...this.vfx.spawnFlameExplosion(
            this.scene,
            impactPos.x,
            impactPos.z,
            p.splashRadius,
            p.color,
          ),
        );
      } else {
        this.effects.push(
          ...this.vfx.spawnFrostBurst(
            this.scene,
            impactPos.x,
            impactPos.z,
            p.splashRadius,
            p.color,
          ),
        );
      }

      const rSq = p.splashRadius * p.splashRadius;
      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];
        if (e.hp <= 0) continue;
        const dx = e.x - impactPos.x;
        const dz = e.z - impactPos.z;
        if (dx * dx + dz * dz <= rSq) {
          this.damageEnemy(e, p.damage, p.towerRef);
          if (p.burnChance > 0 && Math.random() < p.burnChance) {
            e.burnTimer = Math.max(e.burnTimer, 4.0);
            e.burnDps = Math.max(e.burnDps, p.burnDps);
          }
          if (p.slowFactor > 0) {
            e.slowTimer = Math.max(e.slowTimer, 2.5);
            e.slowFactor = Math.max(e.slowFactor, p.slowFactor);
          }
          if (p.freezeChance > 0 && Math.random() < p.freezeChance) {
            e.freezeTimer = Math.max(e.freezeTimer, 1.4);
          }
          if (p.armorMelt) {
            e.armorMelted = true;
          }
        }
      }
    } else {
      const target = this.enemyMap.get(p.targetEnemyId);
      if (target && target.hp > 0) {
        this.damageEnemy(target, p.damage, p.towerRef);
        this.effects.push(
          ...this.vfx.spawnArcherImpact(
            this.scene,
            target.x,
            1.0,
            target.z,
            p.color,
            p.isCrit,
          ),
        );
      }
    }
  }

  private updateEnemies(dt: number): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      // Burn DoT
      if (e.burnTimer > 0) {
        e.burnTimer -= dt;
        e.hp -= e.burnDps * dt;
        e.rig.burnAura.visible = true;
        e.rig.burnAura.rotation.y += dt * 5;
      } else {
        e.rig.burnAura.visible = false;
      }

      // Check defeat
      if (e.hp <= 0) {
        this.totalKills += 1;
        if (e.type === EnemyType.MINI_BOSS || e.type === EnemyType.BIG_BOSS) {
          this.bossesDefeated += 1;
        }
        this.spawnEnemyDefeatEffect(e);
        this.scene.remove(e.rig.root);
        this.disposeObject3D(e.rig.root);
        this.enemyMap.delete(e.id);
        this.enemies.splice(i, 1);
        continue;
      }

      // Chill / Freeze
      let speedMult = 1;
      if (e.freezeTimer > 0) {
        e.freezeTimer -= dt;
        speedMult = 0;
        e.rig.frostAura.visible = true;
      } else if (e.slowTimer > 0) {
        e.slowTimer -= dt;
        speedMult = Math.max(0.25, 1 - e.slowFactor);
        e.rig.frostAura.visible = true;
      } else {
        e.rig.frostAura.visible = false;
      }

      // Advance toward castle gate (+Z)
      const moveDist = e.baseSpeed * speedMult * dt;
      e.z += moveDist;
      e.walkPhase += moveDist * 3.4;

      e.rig.root.position.set(e.x, 0.02, e.z);
      e.rig.bodyGroup.position.y = speedMult > 0 ? Math.abs(Math.sin(e.walkPhase)) * 0.14 : 0;
      e.rig.bodyGroup.rotation.z = speedMult > 0 ? Math.sin(e.walkPhase) * 0.06 : 0;

      // Health bar scale & billboard toward camera
      const hpRatio = Math.max(0.01, e.hp / e.maxHp);
      e.rig.hpBarFill.scale.x = hpRatio;
      e.rig.hpBarFill.position.x = -((1 - hpRatio) * (e.type === EnemyType.BIG_BOSS ? 1.15 : e.type === EnemyType.MINI_BOSS ? 0.85 : 0.48));
      e.rig.hpBarGroup.quaternion.copy(this.camera.quaternion);

      // Reached Castle Gate
      if (e.z >= CASTLE_GATE_Z) {
        this.spawnImpactRing(e.x, CASTLE_GATE_Z, 1.8, 0xef4444);
        this.scene.remove(e.rig.root);
        this.disposeObject3D(e.rig.root);
        this.enemyMap.delete(e.id);
        this.enemies.splice(i, 1);

        if (this.gameMode === 'solo' || this.isCoopHost) {
          this.castleHp = Math.max(0, this.castleHp - e.gateDamage);
          if (this.gameMode === 'coop') {
            this.callbacks.onCoopCastleDamaged?.(this.castleHp);
          }

          if (this.castleHp <= 0) {
            this.phase = 'game_over';
            this.pendingSpawns = [];
            this.showBanner('성문이 함락되었습니다! 방어 종료', 6.0);
            this.callbacks.onGameOver(this.wave, this.totalKills, this.bossesDefeated);
            this.pushHudState(true);
            return;
          }
        }
      }
    }
  }

  private updateLobbyDemoEnemies(dt: number): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      if (e.burnTimer > 0) {
        e.burnTimer -= dt;
        e.hp -= e.burnDps * dt;
        e.rig.burnAura.visible = true;
        e.rig.burnAura.rotation.y += dt * 5;
      } else {
        e.rig.burnAura.visible = false;
      }

      if (e.hp <= 0) {
        this.spawnEnemyDefeatEffect(e);
        this.scene.remove(e.rig.root);
        this.disposeObject3D(e.rig.root);
        this.enemyMap.delete(e.id);
        this.enemies.splice(i, 1);
        continue;
      }

      let speedMult = 1;
      if (e.freezeTimer > 0) {
        e.freezeTimer -= dt;
        speedMult = 0;
        e.rig.frostAura.visible = true;
      } else if (e.slowTimer > 0) {
        e.slowTimer -= dt;
        speedMult = Math.max(0.25, 1 - e.slowFactor);
        e.rig.frostAura.visible = true;
      } else {
        e.rig.frostAura.visible = false;
      }

      const moveDist = e.baseSpeed * speedMult * dt;
      e.z += moveDist;
      e.walkPhase += moveDist * 3.4;

      e.rig.root.position.set(e.x, 0.02, e.z);
      e.rig.bodyGroup.position.y = speedMult > 0 ? Math.abs(Math.sin(e.walkPhase)) * 0.14 : 0;
      e.rig.bodyGroup.rotation.z = speedMult > 0 ? Math.sin(e.walkPhase) * 0.06 : 0;

      if (e.z >= CASTLE_GATE_Z - 1.5) {
        this.scene.remove(e.rig.root);
        this.disposeObject3D(e.rig.root);
        this.enemyMap.delete(e.id);
        this.enemies.splice(i, 1);
      }
    }
  }

  private updateEffects(dt: number): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const fx = this.effects[i];
      fx.age += dt;
      const t = Math.min(1, fx.age / fx.duration);
      fx.onUpdate(t, dt);
      if (fx.age >= fx.duration) {
        this.scene.remove(fx.object);
        this.effects.splice(i, 1);
      }
    }
  }

  private spawnImpactRing(x: number, z: number, maxRadius: number, color: number): void {
    this.effects.push(this.vfx.spawnImpactRing(this.scene, x, z, maxRadius, color));
  }

  private spawnEnemyDefeatEffect(enemy: ActiveEnemy): void {
    const accent = ENEMY_ARCHETYPES[enemy.type].accentColor;
    const bossTier =
      enemy.type === EnemyType.BIG_BOSS
        ? 'big'
        : enemy.type === EnemyType.MINI_BOSS
          ? 'mini'
          : 'normal';
    this.effects.push(...this.vfx.spawnEnemyDefeat(this.scene, enemy.x, enemy.z, accent, bossTier));
  }

  private spawnArrowRainEffect(centerX: number, centerZ: number): void {
    this.effects.push(...this.vfx.spawnArrowRain(this.scene, centerX, centerZ));
  }

  private spawnMeteorEffect(x: number, z: number): void {
    this.effects.push(this.vfx.spawnMeteor(this.scene, x, z));
    this.effects.push(...this.vfx.spawnFlameExplosion(this.scene, x, z, 5.2, 0xf97316));
  }

  private spawnFrostWaveEffect(): void {
    for (let z = -18; z <= 12; z += 6) {
      this.effects.push(...this.vfx.spawnFrostBurst(this.scene, 0, z, 4.2, 0x22d3ee));
    }
  }

  private tick = (): void => {
    if (this.disposed) return;

    const rawDelta = Math.min(0.05, this.clock.getDelta());
    const simDt =
      this.mode === 'battle' && this.phase !== 'game_over'
        ? rawDelta * this.speedMultiplier
        : rawDelta;

    // Smooth camera preset interpolation (exponential damping)
    this.updateCamera(rawDelta);

    // Banner countdown
    if (this.bannerTimer > 0) {
      this.bannerTimer -= rawDelta;
      if (this.bannerTimer <= 0) {
        this.bannerMessage = null;
        this.pushHudState(true);
      }
    }

    if (this.mode === 'battle') {
      // Skill cooldowns
      for (const skill of Object.values(SkillId)) {
        if (this.skillCooldowns[skill] > 0) {
          this.skillCooldowns[skill] = Math.max(0, this.skillCooldowns[skill] - simDt);
        }
      }

      if (this.phase === 'wave_active') {
        if (this.pendingSpawns.length > 0) {
          this.spawnTimer -= simDt;
          if (this.spawnTimer <= 0) {
            const nextItem = this.pendingSpawns.shift()!;
            this.spawnEnemyFromPlan(nextItem);
            this.spawnTimer = this.pendingSpawns[0]?.spawnDelay ?? 0;
          }
        }

        this.updateTowerCombat(simDt);
        this.updateProjectiles(simDt);
        this.updateEnemies(simDt);

        if (
          this.phase === 'wave_active' &&
          this.pendingSpawns.length === 0 &&
          this.enemies.length === 0
        ) {
          if (this.gameMode === 'solo') {
            // Solo Wave Cleared! Award +3 Coins & Crystals
            const clearedWave = this.wave;
            this.coins += WAVE_CLEAR_COIN_REWARD;
            this.sessionCrystals += this.currentWaveCrystalReward;
            this.callbacks.onWaveCleared(
              clearedWave,
              this.currentWaveCrystalReward,
              this.totalKills,
              this.bossesDefeated,
            );
            this.wave += 1;
            this.phase = 'prep';
            this.showBanner(
              `제 ${clearedWave} 웨이브 방어 성공! (+${WAVE_CLEAR_COIN_REWARD} 코인 · +${this.currentWaveCrystalReward} 크리스탈)`,
              3.2,
            );
            this.pushHudState(true);
          } else if (this.isCoopHost && this.coopWaveClearSentForWave < this.wave) {
            // Host is authoritative for advancing co-op waves and awarding +5 shared coins
            const clearedWave = this.wave;
            this.coopWaveClearSentForWave = clearedWave;
            this.sessionCrystals += this.currentWaveCrystalReward;
            this.callbacks.onCoopWaveCleared?.(
              clearedWave,
              this.currentWaveCrystalReward,
              this.totalKills,
              this.bossesDefeated,
            );
            this.wave += 1;
            this.phase = 'prep';
            this.showBanner(
              `제 ${clearedWave} 웨이브 협동 방어 성공! (+${COOP_WAVE_CLEAR_COIN_REWARD} 공용 코인 · +${this.currentWaveCrystalReward} 크리스탈)`,
              3.2,
            );
            this.pushHudState(true);
          }
        }
      }
    } else {
      this.lobbySceneElapsed += rawDelta;
      this.lobbyDemoSpawnTimer -= rawDelta;
      if (this.lobbyDemoSpawnTimer <= 0 && this.enemies.length < 6) {
        const cycle = [
          EnemyType.GOBLIN,
          EnemyType.ORC,
          EnemyType.SHADOW,
          EnemyType.GOLEM,
          EnemyType.MINI_BOSS,
        ];
        const nextType = cycle[this.lobbyDemoSeq % cycle.length];
        const laneOffset = ((this.lobbyDemoSeq % 5) - 2) * 0.72;
        this.lobbyDemoSeq += 1;
        this.spawnLobbyDemoEnemyAt(ROAD_START_Z, laneOffset, nextType);
        this.lobbyDemoSpawnTimer = 1.9;
      }
      this.updateTowerCombat(rawDelta, true);
      this.updateProjectiles(rawDelta);
      this.updateLobbyDemoEnemies(rawDelta);
    }

    this.updateEffects(simDt);

    // Periodic HUD refresh during active wave
    if (this.clock.elapsedTime - this.lastHudPushTime > 0.18) {
      this.pushHudState(false);
    }

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private computeLobbySceneCamera(
    sceneIdx: number,
    elapsed: number,
    outPos: THREE.Vector3,
    outLook: THREE.Vector3,
  ): void {
    if (sceneIdx === 1) {
      // Scene 1: Side-flank view tracking monsters marching down the central corridor
      const pan = Math.sin(elapsed * 0.28) * 3.0;
      outPos.set(10.6, 3.6, -2.5 + pan);
      outLook.set(0, 1.3, -2.0 + pan * 0.45);
    } else if (sceneIdx === 2) {
      // Scene 2: Low-angle upward hero shot looking up at the Flame Tower against the night sky
      const orbit = Math.sin(elapsed * 0.35) * 1.1;
      outPos.set(1.5 + orbit * 0.6, 1.15, 4.4 - orbit * 0.4);
      outLook.set(5.05, 3.15, 0.25);
    } else if (sceneIdx === 3) {
      // Scene 3: Far Chaos Portal reverse perspective looking down the lane toward the castle
      const sway = Math.sin(elapsed * 0.3) * 1.6;
      outPos.set(-2.6 + sway, 3.4, -18.8);
      outLook.set(0.6, 2.1, 6.0);
    } else {
      // Scene 0: Iconic 2nd-person castle battlement overlook
      const sway = Math.sin(elapsed * 0.28) * 2.2;
      outPos.set(sway, 14.0, 25.0);
      outLook.set(0, 1.2, -5.0);
    }
  }

  private updateCamera(dt: number): void {
    let lambda = 4.5;
    if (this.mode === 'lobby_preview' && this.introActive) {
      const introSway = Math.sin(this.clock.elapsedTime * 0.22) * 3.4;
      _camTargetPos.set(introSway, 15.6, 26.5);
      _camTargetLook.set(introSway * 0.15, 1.3, -5.5);
      lambda = 1.65;
    } else if (this.mode === 'lobby_preview') {
      this.computeLobbySceneCamera(
        this.lobbySceneIndex,
        this.lobbySceneElapsed,
        _camTargetPos,
        _camTargetLook,
      );
      lambda = 3.2;
    } else if (this.cameraPreset === CameraPreset.SECOND_PERSON) {
      _camTargetPos.set(0, 14.8, 24.8);
      _camTargetLook.set(0, 0.8, -5.5);
      lambda = 3.2;
    } else if (this.cameraPreset === CameraPreset.TACTICAL_HIGH) {
      _camTargetPos.set(0, 27.5, 13.5);
      _camTargetLook.set(0, 0.0, -3.5);
    } else {
      _camTargetPos.set(17.5, 16.5, 14.5);
      _camTargetLook.set(0, 0.8, -3.5);
    }

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _camTargetPos.x, lambda, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _camTargetPos.y, lambda, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _camTargetPos.z, lambda, dt);

    _camCurrentLook.x = THREE.MathUtils.damp(_camCurrentLook.x, _camTargetLook.x, lambda, dt);
    _camCurrentLook.y = THREE.MathUtils.damp(_camCurrentLook.y, _camTargetLook.y, lambda, dt);
    _camCurrentLook.z = THREE.MathUtils.damp(_camCurrentLook.z, _camTargetLook.z, lambda, dt);
    this.camera.lookAt(_camCurrentLook);
  }

  private updateRangeIndicator(): void {
    const slot = this.selectedSlot ?? this.hoveredSlot;
    if (!slot || this.mode !== 'battle') {
      this.rangeRingGroup.visible = false;
      return;
    }

    let range = TOWER_DEFINITIONS[this.selectedBuildType].tiers[0].range;
    let colorHex = 0x38bdf8;

    if (slot.towerId) {
      const t = this.towers.get(slot.towerId);
      if (t) {
        range = t.range;
        colorHex = new THREE.Color(TOWER_DEFINITIONS[t.type].accentColor).getHex();
      }
    } else {
      colorHex = new THREE.Color(TOWER_DEFINITIONS[this.selectedBuildType].accentColor).getHex();
    }

    this.rangeRingGroup.visible = true;
    this.rangeRingGroup.position.set(slot.x, slot.y + 0.04, slot.z);
    this.rangeRingGroup.scale.set(range, 1, range);
    (this.rangeRingLine.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
    (this.rangeDisc.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
  }

  // ===========================================================================
  // Pointer Raycasting & Grid Interaction
  // ===========================================================================

  private bindEvents(): void {
    const dom = this.renderer.domElement;
    dom.addEventListener('pointermove', this.onPointerMove);
    dom.addEventListener('click', this.onCanvasClick);
  }

  private updatePointerNdc(e: PointerEvent | MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onPointerMove = (e: PointerEvent): void => {
    if (this.mode !== 'battle') return;
    const now = performance.now();
    if (now - this.lastHoverRaycastTime < 40) return;
    this.lastHoverRaycastTime = now;

    this.updatePointerNdc(e);
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObjects(this.slotClickables, false);

    let nextHovered: GridSlot | null = null;
    if (hits.length > 0) {
      nextHovered = hits[0].object.userData.slot as GridSlot;
    }

    if (nextHovered === this.hoveredSlot) return;

    if (this.hoveredSlot && this.hoveredSlot !== this.selectedSlot) {
      this.hoveredSlot.tileMesh.material = this.getDefaultSlotMaterial(this.hoveredSlot);
    }

    this.hoveredSlot = nextHovered;
    if (nextHovered) {
      const canPlaceHere =
        this.gameMode === 'solo' || !this.coopSide || nextHovered.side === this.coopSide || Boolean(nextHovered.towerId);
      if (nextHovered !== this.selectedSlot && canPlaceHere) {
        nextHovered.tileMesh.material = this.gridTileHoverMat;
      }
      this.renderer.domElement.style.cursor = canPlaceHere ? 'pointer' : 'not-allowed';
    } else {
      this.renderer.domElement.style.cursor = 'default';
    }

    this.updateRangeIndicator();
    this.pushHudState(false);
  };

  private onCanvasClick = (e: MouseEvent): void => {
    if (this.mode !== 'battle' || this.phase === 'game_over') return;
    this.updatePointerNdc(e);
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObjects(this.slotClickables, false);

    if (hits.length === 0) {
      this.selectedSlot = null;
      this.updateRangeIndicator();
      this.pushHudState(true);
      return;
    }

    const clickedSlot = hits[0].object.userData.slot as GridSlot;

    if (clickedSlot.towerId) {
      // Select existing tower for inspection/upgrades
      this.selectedSlot = clickedSlot;
    } else if (this.gameMode === 'coop' && this.coopSide && clickedSlot.side !== this.coopSide) {
      const mySideKr = this.coopSide === 'left' ? '왼쪽' : '오른쪽';
      const allySideKr = this.coopSide === 'left' ? '오른쪽' : '왼쪽';
      this.showBanner(`파트너 진영(${allySideKr})입니다. 내 진영(${mySideKr})에 타워를 배치하세요!`, 2.2);
      this.selectedSlot = null;
    } else {
      // Build selected tower type on empty grid tile
      const def = TOWER_DEFINITIONS[this.selectedBuildType];
      if (this.coins >= def.buildCost) {
        if (this.gameMode === 'coop') {
          this.callbacks.onCoopBuildTower?.(
            clickedSlot.id,
            clickedSlot.side,
            clickedSlot.col,
            clickedSlot.row,
            this.selectedBuildType,
            def.buildCost,
          );
          this.selectedSlot = clickedSlot;
        } else {
          this.spawnTowerOnSlot(clickedSlot, this.selectedBuildType, true);
          this.selectedSlot = clickedSlot;
        }
      } else {
        this.showBanner(`코인이 부족합니다! (${def.name}: ${def.buildCost} 코인 필요)`, 2.0);
        this.selectedSlot = null;
      }
    }

    this.updateRangeIndicator();
    this.pushHudState(true);
  };

  private showBanner(msg: string, duration = 2.5): void {
    this.bannerMessage = msg;
    this.bannerTimer = duration;
  }

  private buildSelectedTowerSnapshot(): PlacedTowerSnapshot | null {
    if (!this.selectedSlot?.towerId) return null;
    const t = this.towers.get(this.selectedSlot.towerId);
    if (!t) return null;
    const def = TOWER_DEFINITIONS[t.type];
    let nextUpgradeCost: number | null = null;
    if (t.level < 3) {
      nextUpgradeCost = (t.level === 1 ? def.tiers[1] : def.tiers[2]).upgradeCost;
    } else if (t.level === 3) {
      nextUpgradeCost = def.branches[0].cost;
    }

    return {
      id: t.id,
      slotId: t.slot.id,
      side: t.slot.side,
      col: t.slot.col,
      row: t.slot.row,
      type: t.type,
      level: t.level,
      branch: t.branch,
      damage: t.damage,
      interval: t.interval,
      range: t.range,
      kills: t.kills,
      totalSpent: t.totalSpent,
      nextUpgradeCost,
      sellRefund: Math.max(1, Math.floor(t.totalSpent * 0.7)),
    };
  }

  private pushHudState(force: boolean): void {
    if (!force) {
      this.lastHudPushTime = this.clock.elapsedTime;
    }
    const boss = this.enemies.find(
      (e) => e.type === EnemyType.BIG_BOSS || e.type === EnemyType.MINI_BOSS,
    );

    this.callbacks.onHudUpdate({
      gameMode: this.gameMode,
      coopSide: this.coopSide,
      partnerName: this.partnerName,
      roomCode: this.roomCode,
      phase: this.phase,
      wave: this.wave,
      coins: this.coins,
      sessionCrystals: this.sessionCrystals,
      castleHp: this.castleHp,
      maxCastleHp: MAX_CASTLE_HP,
      enemiesRemaining: this.enemies.length + this.pendingSpawns.length,
      totalKills: this.totalKills,
      bossesDefeated: this.bossesDefeated,
      activeBossType:
        boss?.type === EnemyType.BIG_BOSS
          ? 'big_boss'
          : boss?.type === EnemyType.MINI_BOSS
            ? 'mini_boss'
            : null,
      activeBossName: boss ? ENEMY_ARCHETYPES[boss.type].name : null,
      activeBossHp: boss ? Math.max(0, Math.ceil(boss.hp)) : 0,
      activeBossMaxHp: boss ? boss.maxHp : 0,
      speedMultiplier: this.speedMultiplier,
      selectedBuildType: this.selectedBuildType,
      selectedTower: this.buildSelectedTowerSnapshot(),
      hoveredSlotLabel: this.hoveredSlot ? this.hoveredSlot.label : null,
      skillCooldowns: { ...this.skillCooldowns },
      bannerMessage: this.bannerMessage,
    });
  }

  private handleResize(): void {
    if (this.disposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.5));
  }

  private disposeObject3D(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.removeEventListener('click', this.onCanvasClick);
    this.clearBattleEntities();
    this.vfx.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
