import type { Field } from './types';

/** _-0D._-FR belongs to a live Bubblefield wrapper, never its cached enemy list. */
export class FieldVisit {
  completed = false;
  constructor(public starting = false) {}

  canComplete(field: Field) {
    return !this.starting && !this.completed && !field.destroyed && field.enemies.length === 0;
  }

  tryComplete(field: Field) {
    if (!this.canComplete(field)) return false;
    this.completed = true;
    return true;
  }
}
