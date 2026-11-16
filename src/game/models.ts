import * as THREE from 'three';
import {
  ENEMY_ARCHETYPES,
} from '../data/gameConfig';
import {
  EnemyType,
  TowerBranch,
  TowerSkinDefinition,
  TowerType,
} from '../types/game';

export interface TowerRig {
  root: THREE.Group;
  turret: THREE.Group;
  muzzleOffset: THREE.Vector3;
  emissiveParts: THREE.Mesh[];
}

export interface EnemyRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  hpBarFill: THREE.Mesh;
  hpBarGroup: THREE.Group;
  burnAura: THREE.Mesh;
  frostAura: THREE.Mesh;
  baseMat: THREE.MeshStandardMaterial;
}

export function createCastleBastion(
  masonryTex: THREE.CanvasTexture,
  shadowTex: THREE.CanvasTexture,
): THREE.Group {
  const group = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    map: masonryTex,
    color: 0x94a3b8,
    roughness: 0.85,
    metalness: 0.08,
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.78,
    metalness: 0.15,
  });
  const woodGateMat = new THREE.MeshStandardMaterial({
    color: 0x5c3a21,
    roughness: 0.82,
    metalness: 0.05,
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.38,
    metalness: 0.82,
  });
  const bannerMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c,
    roughness: 0.68,
    metalness: 0.1,
  });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.25,
    metalness: 0.9,
  });
  const torchMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: 0xf97316,
    emissiveIntensity: 2.2,
    roughness: 0.3,
  });

  // Left & Right Main Curtain Walls flanking the Gatehouse
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(10.5, 4.4, 2.2), stoneMat);
  leftWall.position.set(-7.6, 2.2, 16.5);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  group.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(10.5, 4.4, 2.2), stoneMat);
  rightWall.position.set(7.6, 2.2, 16.5);
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;
  group.add(rightWall);

  // Upper Gatehouse Bridge above the Arch
  const gateBridge = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.2, 2.5), stoneMat);
  gateBridge.position.set(0, 4.4, 16.5);
  gateBridge.castShadow = true;
  gateBridge.receiveShadow = true;
  group.add(gateBridge);

  // Left & Right Gatehouse Bastion Pillars
  [-3.2, 3.2].forEach((xPos) => {
    const bastion = new THREE.Mesh(new THREE.BoxGeometry(2.0, 5.8, 2.8), darkStoneMat);
    bastion.position.set(xPos, 2.9, 16.4);
    bastion.castShadow = true;
    bastion.receiveShadow = true;
    group.add(bastion);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.45, 3.1), goldTrimMat);
    cap.position.set(xPos, 5.95, 16.4);
    group.add(cap);

    // Torch Sconce
    const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), torchMat);
    flame.position.set(xPos, 3.8, 14.9);
    group.add(flame);

    // Castle Banner
    const banner = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.2, 0.1), bannerMat);
    banner.position.set(xPos, 3.2, 14.95);
    group.add(banner);
  });

  // Arched Wooden Double Gate (recessed between pillars)
  const gateDoor = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.3, 0.5), woodGateMat);
  gateDoor.position.set(0, 1.65, 16.7);
  gateDoor.receiveShadow = true;
  group.add(gateDoor);

  // Iron Reinforcement Straps on Gate
  [0.9, 2.1, 3.0].forEach((yPos) => {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(4.45, 0.18, 0.56), ironMat);
    strap.position.set(0, yPos, 16.7);
    group.add(strap);
  });
  const centerSplit = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.35, 0.58), ironMat);
  centerSplit.position.set(0, 1.67, 16.7);
  group.add(centerSplit);

  // Crenelations (Merlons along the entire battlement wall)
  for (let x = -12.0; x <= 12.0; x += 1.6) {
    const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.85, 0.8), darkStoneMat);
    const yBase = Math.abs(x) < 3.5 ? 5.9 : 4.8;
    merlon.position.set(x, yBase, 15.6);
    merlon.castShadow = true;
    group.add(merlon);
  }

  // Ground contact shadow strip under castle
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 4.5),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    }),
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.set(0, 0.03, 16.5);
  group.add(shadowPlane);

  return group;
}

export function createSpawnArchway(): THREE.Group {
  const group = new THREE.Group();
  const obsidianMat = new THREE.MeshStandardMaterial({
    color: 0x1e1b4b,
    roughness: 0.72,
    metalness: 0.28,
  });
  const runeMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xe11d48,
    emissiveIntensity: 2.0,
    roughness: 0.2,
  });

  [-3.4, 3.4].forEach((xPos) => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 5.2, 1.6), obsidianMat);
    pillar.position.set(xPos, 2.6, -24.5);
    pillar.castShadow = true;
    group.add(pillar);

    const runeOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), runeMat);
    runeOrb.position.set(xPos, 5.5, -24.5);
    group.add(runeOrb);
  });

  const lintel = new THREE.Mesh(new THREE.BoxGeometry(8.6, 1.3, 1.8), obsidianMat);
  lintel.position.set(0, 5.5, -24.5);
  lintel.castShadow = true;
  group.add(lintel);

  const portalCurtain = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 4.8),
    new THREE.MeshBasicMaterial({
      color: 0x4c0519,
      transparent: true,
      opacity: 0.62,
      side: THREE.DoubleSide,
    }),
  );
  portalCurtain.position.set(0, 2.4, -24.5);
  group.add(portalCurtain);

  return group;
}

export function createTowerRig(
  type: TowerType,
  level: 1 | 2 | 3 | 4,
  branch: TowerBranch,
  skin?: TowerSkinDefinition,
): TowerRig {
  const root = new THREE.Group();
  const turret = new THREE.Group();
  const emissiveParts: THREE.Mesh[] = [];

  // Default material palettes by tower type, overridden cleanly when skin is equipped
  let primaryHex = 0x475569;
  let secondaryHex = 0x94a3b8;
  let accentHex = 0x38bdf8;

  if (type === TowerType.ARCHER) {
    primaryHex = 0x78350f;
    secondaryHex = 0xcbd5e1;
    accentHex = 0x38bdf8;
  } else if (type === TowerType.FLAME) {
    primaryHex = 0x451a03;
    secondaryHex = 0x475569;
    accentHex = 0xf97316;
  } else if (type === TowerType.FROST) {
    primaryHex = 0x164e63;
    secondaryHex = 0xe2e8f0;
    accentHex = 0x22d3ee;
  } else if (type === TowerType.TESLA) {
    primaryHex = 0x3b0764;
    secondaryHex = 0xb45309;
    accentHex = 0xa855f7;
  }

  if (skin) {
    primaryHex = skin.primaryColor;
    secondaryHex = skin.secondaryColor;
    accentHex = skin.accentColor;
  }

  const baseStoneMat = new THREE.MeshStandardMaterial({
    color: secondaryHex,
    roughness: 0.78,
    metalness: 0.14,
  });
  const bodyMat = new THREE.MeshStandardMaterial({
    color: primaryHex,
    roughness: 0.45,
    metalness: 0.42,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.22,
    metalness: 0.88,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 1.65,
    roughness: 0.2,
    metalness: 0.1,
  });

  // 1. Primary Base Pedestal (grounded at y=0)
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.04, 0.42, 8), baseStoneMat);
  plinth.position.y = 0.21;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  root.add(plinth);

  const heightScale = 1 + (level - 1) * 0.16;

  // 2. Tower Shaft & Level Accents
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.78, 1.35 * heightScale, 8),
    bodyMat,
  );
  shaft.position.y = 0.42 + (1.35 * heightScale) / 2;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  root.add(shaft);

  // Level Collar Rings
  for (let i = 1; i <= Math.min(3, level); i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.68 - i * 0.04, 0.06, 8, 16),
      i === level ? glowMat : metalMat,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.55 + i * 0.34;
    root.add(ring);
    if (i === level) emissiveParts.push(ring);
  }

  const turretY = 0.42 + 1.35 * heightScale + 0.12;
  turret.position.y = turretY;
  root.add(turret);

  let muzzleOffset = new THREE.Vector3(0, turretY + 0.35, 0.85);

  if (type === TowerType.ARCHER) {
    // Rotating Crossbow Platform
    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.22, 1.15), bodyMat);
    deck.castShadow = true;
    turret.add(deck);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 1.1), metalMat);
    stock.position.set(0, 0.22, 0.15);
    turret.add(stock);

    const bowLimb = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.12, 0.14), glowMat);
    bowLimb.position.set(0, 0.24, 0.55);
    turret.add(bowLimb);
    emissiveParts.push(bowLimb);

    // Branch specializations
    if (level === 4 && branch === TowerBranch.PATH_A) {
      // Twin Rapid Volley Crossbow
      const upperLimb = bowLimb.clone();
      upperLimb.position.set(0, 0.42, 0.48);
      turret.add(upperLimb);
    } else if (level === 4 && branch === TowerBranch.PATH_B) {
      // Marksman Long Barrel & Scope
      const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.7, 10), glowMat);
      scope.rotation.x = Math.PI / 2;
      scope.position.set(0, 0.44, 0.3);
      turret.add(scope);
      emissiveParts.push(scope);
    }

    muzzleOffset = new THREE.Vector3(0, turretY + 0.25, 0.85);
  } else if (type === TowerType.FLAME) {
    // Brazier Cauldron & Nozzle
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.5, 0.45, 8), metalMat);
    basin.position.y = 0.2;
    basin.castShadow = true;
    turret.add(basin);

    const fireCore = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), glowMat);
    fireCore.position.y = 0.54;
    turret.add(fireCore);
    emissiveParts.push(fireCore);

    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.65, 8), bodyMat);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(0, 0.36, 0.55);
    turret.add(nozzle);

    if (level === 4 && branch === TowerBranch.PATH_A) {
      // Inferno twin horns
      [-0.52, 0.52].forEach((xOff) => {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.65, 6), glowMat);
        horn.position.set(xOff, 0.68, 0);
        turret.add(horn);
        emissiveParts.push(horn);
      });
    } else if (level === 4 && branch === TowerBranch.PATH_B) {
      // Heavy Meteor Mortar Tube
      const mortar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.9, 10), metalMat);
      mortar.rotation.x = Math.PI / 3;
      mortar.position.set(0, 0.52, 0.45);
      turret.add(mortar);
    }

    muzzleOffset = new THREE.Vector3(0, turretY + 0.48, 0.78);
  } else if (type === TowerType.FROST) {
    // Levitating Crystal Prism & Rune Prongs
    for (let i = 0; i < 3; i++) {
      const ang = (i * Math.PI * 2) / 3;
      const prong = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.75, 5), baseStoneMat);
      prong.position.set(Math.cos(ang) * 0.52, 0.35, Math.sin(ang) * 0.52);
      turret.add(prong);
    }

    const prism = new THREE.Mesh(new THREE.OctahedronGeometry(0.46, 0), glowMat);
    prism.scale.set(0.85, 1.5, 0.85);
    prism.position.y = 0.78;
    turret.add(prism);
    emissiveParts.push(prism);

    if (level === 4) {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.05, 8, 24), glowMat);
      halo.rotation.x = Math.PI / 2;
      halo.position.y = 0.78;
      turret.add(halo);
      emissiveParts.push(halo);
    }

    muzzleOffset = new THREE.Vector3(0, turretY + 0.78, 0);
  } else if (type === TowerType.TESLA) {
    // Copper Coil Rings + Emitter Orb
    [0.18, 0.42, 0.66].forEach((yOff, idx) => {
      const coil = new THREE.Mesh(
        new THREE.TorusGeometry(0.52 - idx * 0.08, 0.07, 8, 18),
        metalMat,
      );
      coil.rotation.x = Math.PI / 2;
      coil.position.y = yOff;
      turret.add(coil);
    });

    const coreRod = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.82, 10), bodyMat);
    coreRod.position.y = 0.42;
    turret.add(coreRod);

    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), glowMat);
    orb.position.y = 0.96;
    turret.add(orb);
    emissiveParts.push(orb);

    if (level === 4) {
      const crownRing = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.045, 8, 20), glowMat);
      crownRing.position.y = 0.96;
      turret.add(crownRing);
      emissiveParts.push(crownRing);
    }

    muzzleOffset = new THREE.Vector3(0, turretY + 0.96, 0);
  }

  return { root, turret, muzzleOffset, emissiveParts };
}

export function createEnemyRig(
  type: EnemyType,
  shadowTex: THREE.CanvasTexture,
): EnemyRig {
  const arch = ENEMY_ARCHETYPES[type];
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const baseMat = new THREE.MeshStandardMaterial({
    color: arch.color,
    roughness: 0.62,
    metalness: type === EnemyType.GOLEM || type === EnemyType.MINI_BOSS ? 0.55 : 0.18,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: arch.accentColor,
    emissive: arch.accentColor,
    emissiveIntensity: type === EnemyType.BIG_BOSS || type === EnemyType.MINI_BOSS ? 1.15 : 0.45,
    roughness: 0.3,
    metalness: 0.4,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.5,
    metalness: 0.6,
  });

  const s = arch.scale;

  // Contact shadow disc
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.45 * s, 1.45 * s),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  root.add(shadow);

  // Legs
  [-0.22 * s, 0.22 * s].forEach((xPos) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24 * s, 0.48 * s, 0.28 * s), darkMat);
    leg.position.set(xPos, 0.24 * s, 0);
    bodyGroup.add(leg);
  });

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.76 * s, 0.82 * s, 0.52 * s), baseMat);
  torso.position.y = 0.85 * s;
  torso.castShadow = true;
  bodyGroup.add(torso);

  // Head
  const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32 * s, 0), baseMat);
  head.position.set(0, 1.48 * s, 0.06 * s);
  bodyGroup.add(head);

  // Glowing eyes visor
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34 * s, 0.09 * s, 0.16 * s), accentMat);
  visor.position.set(0, 1.5 * s, 0.28 * s);
  bodyGroup.add(visor);

  // Pauldrons / Armor
  if (type !== EnemyType.GOBLIN) {
    [-0.5 * s, 0.5 * s].forEach((xPos) => {
      const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.32 * s, 0.34 * s, 0.46 * s), accentMat);
      shoulder.position.set(xPos, 1.15 * s, 0);
      bodyGroup.add(shoulder);
    });
  }

  // Boss Horns & Core Crown
  if (type === EnemyType.MINI_BOSS || type === EnemyType.BIG_BOSS) {
    [-0.24 * s, 0.24 * s].forEach((xPos) => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12 * s, 0.58 * s, 6), accentMat);
      horn.position.set(xPos, 1.85 * s, 0);
      horn.rotation.z = xPos < 0 ? 0.35 : -0.35;
      bodyGroup.add(horn);
    });

    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.24 * s, 0), accentMat);
    core.position.set(0, 0.9 * s, 0.28 * s);
    bodyGroup.add(core);
  }

  // Status Auras (hidden until afflicted)
  const burnAura = new THREE.Mesh(
    new THREE.ConeGeometry(0.55 * s, 1.2 * s, 7),
    new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.45,
      wireframe: false,
    }),
  );
  burnAura.position.y = 0.8 * s;
  burnAura.visible = false;
  root.add(burnAura);

  const frostAura = new THREE.Mesh(
    new THREE.BoxGeometry(0.95 * s, 1.45 * s, 0.95 * s),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.32,
    }),
  );
  frostAura.position.y = 0.75 * s;
  frostAura.visible = false;
  root.add(frostAura);

  // Floating 3D Health Bar above Enemy
  const hpBarGroup = new THREE.Group();
  hpBarGroup.position.set(0, 2.05 * s + 0.25, 0);

  const barW = type === EnemyType.BIG_BOSS ? 2.4 : type === EnemyType.MINI_BOSS ? 1.8 : 1.05;
  const barBg = new THREE.Mesh(
    new THREE.PlaneGeometry(barW, 0.16),
    new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide }),
  );
  hpBarGroup.add(barBg);

  const hpBarFill = new THREE.Mesh(
    new THREE.PlaneGeometry(barW - 0.06, 0.11),
    new THREE.MeshBasicMaterial({
      color: type === EnemyType.BIG_BOSS ? 0xf43f5e : type === EnemyType.MINI_BOSS ? 0xf59e0b : 0x22c55e,
      side: THREE.DoubleSide,
    }),
  );
  hpBarFill.position.z = 0.01;
  hpBarGroup.add(hpBarFill);
  root.add(hpBarGroup);

  return {
    root,
    bodyGroup,
    hpBarFill,
    hpBarGroup,
    burnAura,
    frostAura,
    baseMat,
  };
}
