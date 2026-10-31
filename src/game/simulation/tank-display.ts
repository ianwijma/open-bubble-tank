import type { Tank, TankChild, TankDesign } from '../core/types';

/** TankData._-Tr registers each part immediately after adding it. */
export function initialTankChildren(design: TankDesign, side: Tank['side']): TankChild[] {
  const children: TankChild[] = [];
  for (const part of design.parts) {
    children.push(`part:${part.key}`);
    if (side === 'player' && part.type === 5005 && !children.includes('forcefield'))
      children.push('forcefield');
  }
  return children;
}

/** Flash addChild also moves an already attached object to the top. */
export function addTankChild(tank: Tank, key: TankChild) {
  removeTankChild(tank, key);
  tank.displayChildren.push(key);
}

export function removeTankChild(tank: Tank, key: TankChild) {
  const index = tank.displayChildren.indexOf(key);
  if (index !== -1) tank.displayChildren.splice(index, 1);
}
