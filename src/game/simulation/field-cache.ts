import type { Field, Tank } from '../core/types';

interface StoredEnemy {
  tank: Tank;
  x: number;
  y: number;
  rotation: number;
}
export interface StoredField {
  scale: number;
  destroyed: boolean;
  enemies: StoredEnemy[];
}

/** _-W- stores enemy references and pose scalars, never the Bubblefield wrapper. */
export class FieldCache {
  private cells = new Map<string, StoredField>();
  get(col: number, row: number) {
    return this.cells.get(`${col},${row}`);
  }
  store(field: Field, col = field.col, row = field.row) {
    this.cells.set(`${col},${row}`, {
      scale: field.scale,
      destroyed: field.destroyed === true,
      // Pending removals still belong to the raw source array at this point.
      enemies: field.enemies.map((tank) => ({
        tank,
        x: tank.x,
        y: tank.y,
        rotation: tank.rotation,
      })),
    });
  }
  restore(stored: StoredField) {
    return stored.enemies.map(({ tank, x, y, rotation }) => {
      tank.x = x;
      tank.y = y;
      tank.rotation = rotation;
      return tank;
    });
  }
}
