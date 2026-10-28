import type { GunState, ShieldClip, Tank } from '../core/types';
import { addTankChild, removeTankChild } from './tank-display';

/** AGunShield.KillShield addresses the mount's current film, even for an older callback. */
export function killMountedShield(tank: Tank, gun: GunState) {
  const film = gun.shieldFilm;
  if (film) {
    removeTankChild(tank, film.key);
    tank.shieldClips = tank.shieldClips.filter((clip) => clip !== film);
    gun.shieldFilm = undefined;
  }
  // Source immunity is shared: another mount's attached film does not keep it enabled.
  tank.shield = 0;
  tank.shieldManaged = false;
}

export function attachMountedShield(tank: Tank, gun: GunState, diameter: () => number) {
  if (gun.shieldFilm) killMountedShield(tank, gun);
  if (gun.shieldDiameter === undefined) {
    gun.shieldDiameter = diameter();
    const hit: ShieldClip = {
      key: `shield-hit:${gun.part.key}`,
      kind: 'hit',
      style: 'mounted',
      diameter: gun.shieldDiameter,
      age: 16,
      angle: 0,
    };
    tank.shieldClips.push(hit);
    tank.shieldHitClip = hit;
    tank.shieldHitAge = 16;
    tank.shieldHitAngle = 0;
    tank.shieldHitDiameter = hit.diameter;
    addTankChild(tank, hit.key);
  }
  const film: ShieldClip = {
    key: `shield-film:${gun.part.key}:${(gun.shieldGeneration = (gun.shieldGeneration ?? 0) + 1)}`,
    kind: 'film',
    style: 'mounted',
    diameter: gun.shieldDiameter,
    age: 0,
    angle: 0,
  };
  gun.shieldFilm = film;
  tank.shieldClips.push(film);
  tank.shieldDiameter = film.diameter;
  tank.shield = 25;
  tank.shieldAge = 0;
  addTankChild(tank, film.key);
}

/** _-DO creates a pair only when the tank's shared movShieldHit pointer is null. */
export function attachTurretShield(tank: Tank, gun: GunState) {
  const generation = (gun.shieldGeneration = (gun.shieldGeneration ?? 0) + 1);
  const hit: ShieldClip = {
    key: `shield-hit:turret:${gun.part.key}:${generation}`,
    kind: 'hit',
    style: 'turret',
    diameter: tank.radius * 2,
    age: 16,
    angle: 0,
  };
  const film: ShieldClip = {
    key: `shield-film:turret:${gun.part.key}:${generation}`,
    kind: 'film',
    style: 'turret',
    diameter: hit.diameter,
    age: 0,
    angle: 0,
  };
  tank.shieldClips.push(hit, film);
  tank.shieldHitClip = hit;
  tank.shieldHitDiameter = hit.diameter;
  tank.shieldHitAge = 16;
  tank.shieldHitAngle = 0;
  tank.shieldDiameter = film.diameter;
  tank.shieldAge = 0;
  gun.shieldFilm = film;
  addTankChild(tank, hit.key);
  addTankChild(tank, film.key);
}

export function removeTurretShield(tank: Tank, gun: GunState) {
  killMountedShield(tank, gun);
  // The old hit remains a display child, but no longer receives impacts.
  tank.shieldHitClip = undefined;
}
