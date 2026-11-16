import * as THREE from 'three';

export interface ManagedVfx {
  object: THREE.Object3D;
  age: number;
  duration: number;
  onUpdate: (t: number, dt: number) => void;
}

const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _quat = new THREE.Quaternion();

export class VfxLibrary {
  // Shared Geometries (allocated once, disposed on engine teardown)
  private arrowHeadGeo: THREE.ConeGeometry;
  private arrowShaftGeo: THREE.CylinderGeometry;
  private arrowTrailGeo: THREE.ConeGeometry;

  private fireCoreGeo: THREE.SphereGeometry;
  private fireShellGeo: THREE.DodecahedronGeometry;
  private emberGeo: THREE.OctahedronGeometry;

  private frostStarGeo: THREE.OctahedronGeometry;
  private frostHexRingGeo: THREE.RingGeometry;
  private frostSpikeGeo: THREE.ConeGeometry;

  private boltUnitGeo: THREE.CylinderGeometry;
  private sparkOrbGeo: THREE.IcosahedronGeometry;
  private impactRingGeo: THREE.RingGeometry;
  private shockDomeGeo: THREE.SphereGeometry;
  private sparkShardGeo: THREE.BoxGeometry;

  private meteorGeo: THREE.DodecahedronGeometry;
  private rainArrowGeo: THREE.ConeGeometry;

  private basicMats = new Map<string, THREE.MeshBasicMaterial>();
  private additiveMats = new Map<string, THREE.MeshBasicMaterial>();

  constructor() {
    this.arrowHeadGeo = new THREE.ConeGeometry(0.11, 0.36, 5);
    this.arrowHeadGeo.rotateX(Math.PI / 2);

    this.arrowShaftGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.52, 5);
    this.arrowShaftGeo.rotateX(Math.PI / 2);
    this.arrowShaftGeo.translate(0, 0, -0.34);

    this.arrowTrailGeo = new THREE.ConeGeometry(0.085, 0.95, 5);
    this.arrowTrailGeo.rotateX(-Math.PI / 2);
    this.arrowTrailGeo.translate(0, 0, -0.78);

    this.fireCoreGeo = new THREE.SphereGeometry(0.22, 8, 8);
    this.fireShellGeo = new THREE.DodecahedronGeometry(0.32, 0);
    this.emberGeo = new THREE.OctahedronGeometry(0.12, 0);

    this.frostStarGeo = new THREE.OctahedronGeometry(0.26, 0);
    this.frostHexRingGeo = new THREE.RingGeometry(0.62, 0.92, 6);
    this.frostHexRingGeo.rotateX(-Math.PI / 2);
    this.frostSpikeGeo = new THREE.ConeGeometry(0.14, 0.85, 5);
    this.frostSpikeGeo.translate(0, 0.42, 0);

    this.boltUnitGeo = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true);
    this.sparkOrbGeo = new THREE.IcosahedronGeometry(0.28, 0);

    this.impactRingGeo = new THREE.RingGeometry(0.55, 0.88, 20);
    this.impactRingGeo.rotateX(-Math.PI / 2);

    this.shockDomeGeo = new THREE.SphereGeometry(0.75, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    this.sparkShardGeo = new THREE.BoxGeometry(0.08, 0.08, 0.36);

    this.meteorGeo = new THREE.DodecahedronGeometry(1.15, 0);
    this.rainArrowGeo = new THREE.ConeGeometry(0.1, 1.15, 5);
    this.rainArrowGeo.rotateX(Math.PI);
  }

  private getMat(color: number, opacity = 1, additive = false): THREE.MeshBasicMaterial {
    const key = `${color}_${opacity.toFixed(2)}_${additive ? 'a' : 'n'}`;
    const pool = additive ? this.additiveMats : this.basicMats;
    let mat = pool.get(key);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({
        color,
        transparent: opacity < 1 || additive,
        opacity,
        side: THREE.DoubleSide,
        depthWrite: !additive && opacity >= 1,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
      pool.set(key, mat);
    }
    return mat;
  }

  public createArcherProjectile(color: number): THREE.Group {
    const g = new THREE.Group();
    const head = new THREE.Mesh(this.arrowHeadGeo, this.getMat(0xffffff));
    const shaft = new THREE.Mesh(this.arrowShaftGeo, this.getMat(color));
    const trail = new THREE.Mesh(this.arrowTrailGeo, this.getMat(color, 0.45, true));
    g.add(head, shaft, trail);
    return g;
  }

  public createFlameProjectile(color: number): THREE.Group {
    const g = new THREE.Group();
    const core = new THREE.Mesh(this.fireCoreGeo, this.getMat(0xfef08a));
    const shell = new THREE.Mesh(this.fireShellGeo, this.getMat(color, 0.78, true));
    g.add(core, shell);
    return g;
  }

  public createFrostProjectile(color: number): THREE.Group {
    const g = new THREE.Group();
    const c1 = new THREE.Mesh(this.frostStarGeo, this.getMat(0xe0f2fe));
    const c2 = new THREE.Mesh(this.frostStarGeo, this.getMat(color, 0.75, true));
    c2.rotation.y = Math.PI / 4;
    c2.scale.setScalar(1.25);
    g.add(c1, c2);
    return g;
  }

  public spawnMuzzleFlash(scene: THREE.Scene, pos: THREE.Vector3, color: number): ManagedVfx {
    const flash = new THREE.Mesh(this.sparkOrbGeo, this.getMat(color, 0.85, true));
    flash.position.copy(pos);
    flash.scale.setScalar(0.8);
    scene.add(flash);
    return {
      object: flash,
      age: 0,
      duration: 0.14,
      onUpdate: (t) => {
        const s = 0.8 + t * 0.9;
        flash.scale.setScalar(s * (1 - t));
      },
    };
  }

  public spawnArcherImpact(
    scene: THREE.Scene,
    x: number,
    y: number,
    z: number,
    color: number,
    isCrit: boolean,
  ): ManagedVfx[] {
    const out: ManagedVfx[] = [];
    const ring = new THREE.Mesh(this.impactRingGeo, this.getMat(isCrit ? 0xfacc15 : color, 0.85, true));
    ring.position.set(x, 0.1, z);
    scene.add(ring);

    const maxR = isCrit ? 1.55 : 0.75;
    out.push({
      object: ring,
      age: 0,
      duration: 0.24,
      onUpdate: (t) => {
        const s = 0.25 + t * maxR;
        ring.scale.set(s, 1 - t * 0.65, s);
      },
    });

    const shardsGroup = new THREE.Group();
    shardsGroup.position.set(x, y, z);
    const shardCount = isCrit ? 6 : 4;
    const shardMat = this.getMat(isCrit ? 0xfef08a : color, 0.9, true);
    for (let i = 0; i < shardCount; i++) {
      const shard = new THREE.Mesh(this.sparkShardGeo, shardMat);
      shard.rotation.y = (i / shardCount) * Math.PI * 2 + 0.3;
      shardsGroup.add(shard);
    }
    scene.add(shardsGroup);

    out.push({
      object: shardsGroup,
      age: 0,
      duration: 0.22,
      onUpdate: (t) => {
        const spread = t * (isCrit ? 1.35 : 0.85);
        const shrink = Math.max(0.01, 1 - t);
        for (let i = 0; i < shardsGroup.children.length; i++) {
          const c = shardsGroup.children[i];
          const ang = c.rotation.y;
          c.position.set(Math.sin(ang) * spread, t * 0.35, Math.cos(ang) * spread);
          c.scale.set(shrink, shrink, shrink);
        }
      },
    });

    return out;
  }

  public spawnFlameEmber(scene: THREE.Scene, pos: THREE.Vector3, color: number): ManagedVfx {
    const ember = new THREE.Mesh(this.emberGeo, this.getMat(color, 0.85, true));
    ember.position.set(
      pos.x + (Math.random() - 0.5) * 0.22,
      pos.y + (Math.random() - 0.5) * 0.22,
      pos.z + (Math.random() - 0.5) * 0.22,
    );
    scene.add(ember);
    return {
      object: ember,
      age: 0,
      duration: 0.22,
      onUpdate: (t) => {
        ember.position.y += 0.025;
        ember.scale.setScalar(Math.max(0.01, 1 - t));
      },
    };
  }

  public spawnFlameExplosion(
    scene: THREE.Scene,
    x: number,
    z: number,
    radius: number,
    color: number,
  ): ManagedVfx[] {
    const out: ManagedVfx[] = [];

    const ring = new THREE.Mesh(this.impactRingGeo, this.getMat(color, 0.9, true));
    ring.position.set(x, 0.1, z);
    scene.add(ring);

    const dome = new THREE.Mesh(this.shockDomeGeo, this.getMat(0xfef08a, 0.55, true));
    dome.position.set(x, 0.05, z);
    scene.add(dome);

    out.push({
      object: ring,
      age: 0,
      duration: 0.38,
      onUpdate: (t) => {
        const s = 0.4 + t * radius * 1.15;
        ring.scale.set(s, 1, s);
      },
    });

    out.push({
      object: dome,
      age: 0,
      duration: 0.3,
      onUpdate: (t) => {
        const s = 0.45 + t * (radius * 0.95);
        dome.scale.set(s, s * (1 - t * 0.65), s);
      },
    });

    const embers = new THREE.Group();
    embers.position.set(x, 0.4, z);
    const emberMat = this.getMat(color, 0.95, true);
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(this.emberGeo, emberMat);
      m.userData.ang = (i / 6) * Math.PI * 2 + Math.random() * 0.35;
      embers.add(m);
    }
    scene.add(embers);
    out.push({
      object: embers,
      age: 0,
      duration: 0.36,
      onUpdate: (t) => {
        const r = t * radius * 0.85;
        const y = Math.sin(t * Math.PI) * 1.35;
        const s = Math.max(0.01, (1 - t) * 1.3);
        for (const c of embers.children) {
          const ang = c.userData.ang as number;
          c.position.set(Math.cos(ang) * r, y, Math.sin(ang) * r);
          c.scale.setScalar(s);
        }
      },
    });

    return out;
  }

  public spawnFrostBurst(
    scene: THREE.Scene,
    x: number,
    z: number,
    radius: number,
    color: number,
  ): ManagedVfx[] {
    const out: ManagedVfx[] = [];

    const hexRing = new THREE.Mesh(this.frostHexRingGeo, this.getMat(color, 0.85, true));
    hexRing.position.set(x, 0.1, z);
    scene.add(hexRing);

    out.push({
      object: hexRing,
      age: 0,
      duration: 0.4,
      onUpdate: (t, dt) => {
        const s = 0.35 + t * radius * 1.05;
        hexRing.scale.set(s, 1, s);
        hexRing.rotation.y += dt * 3.5;
      },
    });

    const spikes = new THREE.Group();
    spikes.position.set(x, 0.05, z);
    const spikeMat = this.getMat(0xe0f2fe, 0.85, true);
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const sp = new THREE.Mesh(this.frostSpikeGeo, spikeMat);
      sp.position.set(Math.cos(ang) * (radius * 0.42), 0, Math.sin(ang) * (radius * 0.42));
      sp.rotation.z = -Math.cos(ang) * 0.25;
      sp.rotation.x = Math.sin(ang) * 0.25;
      spikes.add(sp);
    }
    scene.add(spikes);

    out.push({
      object: spikes,
      age: 0,
      duration: 0.36,
      onUpdate: (t) => {
        const yScale = t < 0.35 ? t / 0.35 : Math.max(0.01, 1 - (t - 0.35) / 0.65);
        spikes.scale.set(1, yScale, 1);
      },
    });

    return out;
  }

  public spawnPlasmaLightning(
    scene: THREE.Scene,
    from: THREE.Vector3,
    to: THREE.Vector3,
    color: number,
  ): ManagedVfx {
    const group = new THREE.Group();
    const coreMat = this.getMat(0xffffff);
    const outerMat = this.getMat(color, 0.72, true);

    const segments = 4;
    const pts: THREE.Vector3[] = [from.clone()];
    for (let i = 1; i < segments; i++) {
      const alpha = i / segments;
      const p = new THREE.Vector3().lerpVectors(from, to, alpha);
      p.x += (Math.random() - 0.5) * 0.75;
      p.y += (Math.random() - 0.5) * 0.5 + 0.15;
      p.z += (Math.random() - 0.5) * 0.75;
      pts.push(p);
    }
    pts.push(to.clone());

    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      _dir.subVectors(b, a);
      const len = _dir.length();
      if (len < 0.01) continue;
      _mid.addVectors(a, b).multiplyScalar(0.5);
      _quat.setFromUnitVectors(_up, _dir.normalize());

      const outer = new THREE.Mesh(this.boltUnitGeo, outerMat);
      outer.position.copy(_mid);
      outer.quaternion.copy(_quat);
      outer.scale.set(0.095, len, 0.095);
      group.add(outer);

      const core = new THREE.Mesh(this.boltUnitGeo, coreMat);
      core.position.copy(_mid);
      core.quaternion.copy(_quat);
      core.scale.set(0.036, len, 0.036);
      group.add(core);
    }

    const hitBurst = new THREE.Mesh(this.sparkOrbGeo, outerMat);
    hitBurst.position.copy(to);
    hitBurst.scale.setScalar(1.35);
    group.add(hitBurst);

    scene.add(group);
    return {
      object: group,
      age: 0,
      duration: 0.18,
      onUpdate: (t) => {
        const thickness = Math.max(0.05, 1 - t);
        for (const c of group.children) {
          if (c === hitBurst) {
            c.scale.setScalar(1.35 * thickness);
          } else {
            c.scale.x = c.scale.x > 0.06 ? 0.095 * thickness : 0.036 * thickness;
            c.scale.z = c.scale.x;
          }
        }
      },
    };
  }

  public spawnImpactRing(
    scene: THREE.Scene,
    x: number,
    z: number,
    maxRadius: number,
    color: number,
  ): ManagedVfx {
    const ring = new THREE.Mesh(this.impactRingGeo, this.getMat(color, 0.8, true));
    ring.position.set(x, 0.09, z);
    scene.add(ring);
    return {
      object: ring,
      age: 0,
      duration: 0.3,
      onUpdate: (t) => {
        const s = 0.35 + t * maxRadius * 1.1;
        ring.scale.set(s, 1, s);
      },
    };
  }

  public spawnArrowRain(scene: THREE.Scene, centerX: number, centerZ: number): ManagedVfx[] {
    const group = new THREE.Group();
    const mat = this.getMat(0xfbbf24, 0.95, true);
    for (let i = 0; i < 20; i++) {
      const arrow = new THREE.Mesh(this.rainArrowGeo, mat);
      arrow.position.set(
        centerX + (Math.random() - 0.5) * 5.2,
        8 + Math.random() * 6,
        centerZ + (Math.random() - 0.5) * 9,
      );
      group.add(arrow);
    }
    scene.add(group);
    return [
      {
        object: group,
        age: 0,
        duration: 0.55,
        onUpdate: (t) => {
          group.position.y = -t * 11;
        },
      },
      this.spawnImpactRing(scene, centerX, centerZ, 5.2, 0xfbbf24),
    ];
  }

  public spawnMeteor(scene: THREE.Scene, x: number, z: number): ManagedVfx {
    const meteor = new THREE.Mesh(this.meteorGeo, this.getMat(0xf97316));
    meteor.position.set(x, 16, z - 4);
    scene.add(meteor);
    let exploded = false;
    return {
      object: meteor,
      age: 0,
      duration: 0.45,
      onUpdate: (t) => {
        meteor.position.set(x, 16 * (1 - t) + 0.8, z - 4 * (1 - t));
        meteor.rotation.x += 0.15;
        meteor.rotation.y += 0.12;
        if (!exploded && t > 0.88) {
          exploded = true;
          meteor.scale.setScalar(2.4);
        }
      },
    };
  }

  public dispose(): void {
    this.arrowHeadGeo.dispose();
    this.arrowShaftGeo.dispose();
    this.arrowTrailGeo.dispose();
    this.fireCoreGeo.dispose();
    this.fireShellGeo.dispose();
    this.emberGeo.dispose();
    this.frostStarGeo.dispose();
    this.frostHexRingGeo.dispose();
    this.frostSpikeGeo.dispose();
    this.boltUnitGeo.dispose();
    this.sparkOrbGeo.dispose();
    this.impactRingGeo.dispose();
    this.shockDomeGeo.dispose();
    this.sparkShardGeo.dispose();
    this.meteorGeo.dispose();
    this.rainArrowGeo.dispose();

    for (const m of this.basicMats.values()) m.dispose();
    for (const m of this.additiveMats.values()) m.dispose();
    this.basicMats.clear();
    this.additiveMats.clear();
  }
}
